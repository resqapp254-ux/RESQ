-- ============================================================
-- RESQ — Day 33: unit_admin RLS + onboarding, a contact email on
-- partner units, and a safe way to remove a responder's access.
-- NOT YET APPLIED. Review before running against the live project.
-- RUN AFTER day32 HAS COMMITTED (separate script execution).
-- ============================================================

alter table institution_services add column if not exists contact_email text;

-- ------------------------------------------------------------
-- "Remove responder" can't be a hard delete: emergencies.triggered_by
-- and emergencies.claimed_by both reference profiles(id) with no
-- ON DELETE clause (the default, effectively RESTRICT), so deleting
-- a profile that has ever triggered or claimed anything would fail
-- outright — and even if it didn't, it would be wrong to destroy a
-- case's audit trail just because the responder who handled it later
-- left. Instead: revoke login (banned via the Auth Admin API, done in
-- the API route, not here) and mark them inactive so they drop out of
-- notification/assignment lists while every past emergency they were
-- ever involved in still shows their name correctly.
-- ------------------------------------------------------------
alter table profiles add column if not exists is_active boolean not null default true;

-- ------------------------------------------------------------
-- auth_service_id() — same pattern as auth_role()/auth_institution_id(),
-- lets a unit_admin's RLS policies check which unit they administer
-- without a recursive lookup.
-- ------------------------------------------------------------
create or replace function auth_service_id() returns uuid as $$
  select service_id from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, auth, pg_temp;

-- A unit_admin manages their own unit's own row (location, contact
-- details, handled emergency types) — nothing else in the institution.
drop policy if exists "unit_admin manages own service" on institution_services;
create policy "unit_admin manages own service"
  on institution_services for all
  using (auth_role() = 'unit_admin' and id = auth_service_id());

-- A unit_admin manages (views, and via the API can deactivate)
-- responders linked to their own unit — not other units', and not
-- primary/institution-wide responders.
drop policy if exists "unit_admin manages own unit responders" on profiles;
create policy "unit_admin manages own unit responders"
  on profiles for all
  using (auth_role() = 'unit_admin' and role = 'responder' and service_id = auth_service_id());

-- The existing "institution_admin manages own institution's staff"
-- policy only ever covered role in ('responder','user'), so an
-- institution_admin couldn't see which of their units already have a
-- unit_admin login (needed by the Partner Units page to show
-- "has a dashboard login" vs. offering to create one).
drop policy if exists "institution_admin views own institution's unit admins" on profiles;
create policy "institution_admin views own institution's unit admins"
  on profiles for select
  using (auth_role() = 'institution_admin' and institution_id = auth_institution_id() and role = 'unit_admin');

-- ------------------------------------------------------------
-- get_onboarding_status — add the unit_admin branch. No
-- verification/contract gate at the unit level; the institution
-- itself already went through that.
-- ------------------------------------------------------------
create or replace function get_onboarding_status()
returns json as $$
declare
  prof profiles%rowtype;
  inst institutions%rowtype;
  has_contract boolean;
begin
  select * into prof from profiles where id = auth.uid();

  if prof.role = 'super_admin' then
    return json_build_object('role', 'super_admin', 'next_step', 'dashboard');
  end if;

  if prof.role = 'institution_admin' then
    select * into inst from institutions where id = prof.institution_id;
    if inst.status != 'active' then
      return json_build_object('role', 'institution_admin', 'next_step', 'enter_verification_code');
    end if;

    select exists(select 1 from institution_contracts where institution_id = inst.id) into has_contract;
    if not has_contract then
      return json_build_object('role', 'institution_admin', 'next_step', 'sign_contract');
    end if;

    return json_build_object('role', 'institution_admin', 'next_step', 'dashboard');
  end if;

  if prof.role = 'unit_admin' then
    return json_build_object('role', 'unit_admin', 'next_step', 'dashboard');
  end if;

  if prof.role = 'responder' then
    return json_build_object('role', 'responder', 'next_step', 'app');
  end if;

  if prof.role = 'user' then
    if prof.account_mode = 'public' then
      return json_build_object('role', 'user', 'next_step', 'app', 'account_mode', 'public');
    end if;
    if prof.institution_id is null then
      return json_build_object('role', 'user', 'next_step', 'enter_institution_code', 'account_mode', 'private');
    end if;
    return json_build_object('role', 'user', 'next_step', 'app', 'account_mode', 'private');
  end if;

  return json_build_object('role', null, 'next_step', 'unknown');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;
