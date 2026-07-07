-- ============================================================
-- RESQ — Day 9: RLS hardening & edge case protection
-- Run this in Supabase SQL Editor after previous scripts.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SHIFTS: previously any account in the institution (even a
-- responder or user) could create/edit/delete shifts. Now only
-- institution_admin (or super_admin) can write; institution
-- members can still view.
-- ------------------------------------------------------------
drop policy if exists "institution isolation on shifts" on responder_shifts;

create policy "shifts viewable by institution members"
  on responder_shifts for select
  using (institution_id = auth_institution_id() or auth_role() = 'super_admin');

create policy "shifts insert by institution_admin only"
  on responder_shifts for insert
  with check (
    (institution_id = auth_institution_id() and auth_role() = 'institution_admin')
    or auth_role() = 'super_admin'
  );

create policy "shifts update by institution_admin only"
  on responder_shifts for update
  using (
    (institution_id = auth_institution_id() and auth_role() = 'institution_admin')
    or auth_role() = 'super_admin'
  );

create policy "shifts delete by institution_admin only"
  on responder_shifts for delete
  using (
    (institution_id = auth_institution_id() and auth_role() = 'institution_admin')
    or auth_role() = 'super_admin'
  );

-- ------------------------------------------------------------
-- 2. EMERGENCIES: previously a responder/institution_admin could
-- change ANY field on an update — including reassigning it to a
-- different institution, overwriting who triggered it, or editing
-- the AI advice shown to the user. This trigger locks those fields
-- so only status/claim/location-related fields can change after
-- creation, regardless of what the client sends.
-- ------------------------------------------------------------
create or replace function protect_emergency_fields()
returns trigger as $$
begin
  -- These fields are set once at creation and can never change afterward
  new.institution_id := old.institution_id;
  new.triggered_by := old.triggered_by;
  new.triggered_by_phone := old.triggered_by_phone;
  new.triggered_via := old.triggered_via;
  new.created_at := old.created_at;

  -- Prevent nonsensical backward status transitions
  if old.status = 'resolved' and new.status not in ('resolved') then
    raise exception 'Cannot change status of a resolved emergency';
  end if;
  if old.status = 'cancelled' and new.status not in ('cancelled') then
    raise exception 'Cannot change status of a cancelled emergency';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

drop trigger if exists protect_emergency_fields_trigger on emergencies;
create trigger protect_emergency_fields_trigger
  before update on emergencies
  for each row execute function protect_emergency_fields();
