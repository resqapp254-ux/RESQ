-- ============================================================
-- RESQ — Day 36: institution_admin can actually update their own
-- institution row.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Real gap found while wiring the public "single entity" flow from
-- the requested architecture (an institution sets its own
-- coordinates from its own dashboard): there has never been an RLS
-- policy letting `institution_admin` UPDATE the `institutions` table
-- at all — only `super_admin full access on institutions` (all) and
-- `institution members can view their own institution` (select).
-- That means /institution-admin/settings's "Emergency Types" and
-- "Identity Requirements" saves have been silently doing nothing
-- this whole time: RLS blocks the UPDATE from matching any row,
-- Postgres/PostgREST returns success with zero rows affected (not an
-- error), so the page just says "Saved." and nothing changes.
--
-- Fixed with an UPDATE policy scoped to the admin's own row, plus a
-- BEFORE UPDATE trigger (same pattern as day12's
-- protect_profile_security_fields) that snaps every column back to
-- its old value unless the acting role is super_admin — status,
-- subscription_tier, institution_code, verification_code, logo_url,
-- visibility, name, institution_code etc. stay super_admin-only. A
-- trigger is used instead of column-level GRANT/REVOKE because every
-- app role shares the single Postgres `authenticated` role here —
-- super_admin's own existing direct .update() calls on this table
-- (status/tier/name/logo_url/visibility in super-admin/page.js)
-- would otherwise break the moment column grants got restricted.
-- ============================================================

drop policy if exists "institution_admin updates own institution" on institutions;
create policy "institution_admin updates own institution"
  on institutions for update
  using (auth_role() = 'institution_admin' and id = auth_institution_id())
  with check (auth_role() = 'institution_admin' and id = auth_institution_id());

create or replace function protect_institution_admin_fields()
returns trigger as $$
begin
  if auth_role() <> 'super_admin' then
    new.name := old.name;
    new.institution_code := old.institution_code;
    new.verification_code := old.verification_code;
    new.verification_code_used := old.verification_code_used;
    new.status := old.status;
    new.subscription_tier := old.subscription_tier;
    new.subscription_expires_at := old.subscription_expires_at;
    new.contact_email := old.contact_email;
    new.logo_url := old.logo_url;
    new.visibility := old.visibility;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

drop trigger if exists protect_institution_admin_fields_trigger on institutions;
create trigger protect_institution_admin_fields_trigger
  before update on institutions
  for each row execute function protect_institution_admin_fields();
