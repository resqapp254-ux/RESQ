-- RESQ Day 12: web auth support and schema/RLS hardening.
-- Apply after day11-chat-claim-rules.sql. Safe to re-run.

alter table emergencies add column if not exists emergency_type text not null default 'other';

create or replace function protect_profile_security_fields()
returns trigger as $$
begin
  if auth_role() <> 'super_admin' then
    new.role := old.role;
    new.institution_id := old.institution_id;
    new.email := old.email;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

drop trigger if exists protect_profile_security_fields_trigger on profiles;
create trigger protect_profile_security_fields_trigger
  before update on profiles
  for each row execute function protect_profile_security_fields();