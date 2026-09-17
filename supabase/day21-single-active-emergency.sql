-- ============================================================
-- RESQ — Day 21: One open emergency per triggering account/phone,
-- and one in-progress case per responder, enforced at the database
-- level so it holds no matter which client writes the row.
--
-- NOT YET APPLIED. Review before running against the live project.
--
-- Every entry point that can INSERT an emergency (web's
-- /api/emergency/trigger, mobile's UserHomeScreen direct insert, the
-- SMS webhook, the USSD webhook) now also checks this in application
-- code for a friendly error message — but application-code checks
-- only cover the paths someone remembered to add them to. A trigger
-- on the table itself is the one place that can't be missed by a
-- future client, matching the reasoning behind the day16
-- view_only-permission RLS fix (a UI-only check on the web claim
-- route missed mobile's direct table update entirely).
-- ============================================================

create or replace function resq_enforce_single_active_emergency()
returns trigger as $$
begin
  if new.triggered_by is not null then
    if exists (
      select 1 from emergencies
      where triggered_by = new.triggered_by
        and status in ('triggered', 'claimed', 'in_progress')
        and id <> new.id
    ) then
      raise exception 'You already have an active emergency. It must be resolved before you can send a new one.';
    end if;
  elsif new.triggered_by_phone is not null then
    if exists (
      select 1 from emergencies
      where triggered_by_phone = new.triggered_by_phone
        and status in ('triggered', 'claimed', 'in_progress')
        and id <> new.id
    ) then
      raise exception 'This phone number already has an active emergency. It must be resolved before a new one can be sent.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists resq_single_active_emergency on emergencies;
create trigger resq_single_active_emergency
  before insert on emergencies
  for each row execute function resq_enforce_single_active_emergency();

-- A responder can see every open case for their institution, but can
-- only be actively claimed/in_progress on one at a time. Only fires
-- when claimed_by is actually changing, so editing any other column
-- of an already-claimed case (status -> resolved, chat, etc.) is
-- untouched.
create or replace function resq_enforce_single_active_claim()
returns trigger as $$
begin
  if new.claimed_by is not null and new.claimed_by is distinct from old.claimed_by then
    if exists (
      select 1 from emergencies
      where claimed_by = new.claimed_by
        and status in ('claimed', 'in_progress')
        and id <> new.id
    ) then
      raise exception 'You already have an active case claimed. Resolve it before claiming another.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists resq_single_active_claim on emergencies;
create trigger resq_single_active_claim
  before update on emergencies
  for each row execute function resq_enforce_single_active_claim();
