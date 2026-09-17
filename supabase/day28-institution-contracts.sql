-- ============================================================
-- RESQ — Day 28: Institution admin contract / Terms acceptance.
-- NOT YET APPLIED. Review before running against the live project.
--
-- After verification (redeem_verification_code), an institution
-- admin must sign a one-time agreement — company details, who's
-- accepting on the institution's behalf, and explicit checkboxes for
-- each obligation — before reaching the dashboard. Kept forever for
-- the super_admin to review/download; institution admins can't edit
-- or delete their own signed contract (no update/delete policy for
-- them, only insert + select).
-- ============================================================

create table if not exists institution_contracts (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade not null,
  signed_by uuid references profiles(id),
  company_name text not null,
  signee_name text not null,
  signee_title text,
  signee_email text not null,
  signee_phone text,
  agreed_terms boolean not null default false,
  agreed_privacy boolean not null default false,
  agreed_responsibilities boolean not null default false,
  agreed_data_handling boolean not null default false,
  contract_version text not null default 'v1',
  signed_at timestamptz default now()
);

create index if not exists idx_institution_contracts_institution on institution_contracts(institution_id);

alter table institution_contracts enable row level security;

drop policy if exists "super_admin full access on institution_contracts" on institution_contracts;
create policy "super_admin full access on institution_contracts"
  on institution_contracts for all
  using (auth_role() = 'super_admin');

drop policy if exists "institution_admin views own institution contract" on institution_contracts;
create policy "institution_admin views own institution contract"
  on institution_contracts for select
  using (auth_role() = 'institution_admin' and institution_id = auth_institution_id());

drop policy if exists "institution_admin signs own institution contract" on institution_contracts;
create policy "institution_admin signs own institution contract"
  on institution_contracts for insert
  with check (
    auth_role() = 'institution_admin'
    and institution_id = auth_institution_id()
    and not exists (select 1 from institution_contracts where institution_id = auth_institution_id())
  );

-- ------------------------------------------------------------
-- get_onboarding_status — add the contract-signing gate between
-- verification and the dashboard.
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
