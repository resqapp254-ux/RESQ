-- ============================================================
-- RESQ — Day 14: super-admin institution summary + responder reports
-- Run in the Supabase SQL Editor after day13.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SUPER ADMIN: totals only, not raw emergency lists.
-- Super admin should see how many active/resolved emergencies each
-- institution has, not the emergencies themselves — that's the
-- institution admin's view. This RPC returns counts only and
-- checks the caller is super_admin itself (it's security definer
-- so it can aggregate across institutions, which normal RLS would
-- otherwise scope per-institution).
-- ------------------------------------------------------------
create or replace function get_institution_emergency_summary()
returns table(institution_id uuid, active_count bigint, resolved_count bigint) as $$
begin
  if auth_role() <> 'super_admin' then
    raise exception 'Not authorized';
  end if;

  return query
    select e.institution_id,
           count(*) filter (where e.status <> 'resolved') as active_count,
           count(*) filter (where e.status = 'resolved') as resolved_count
    from emergencies e
    group by e.institution_id;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 2. REPORT A RESPONDER
-- A user (or another responder) can report a responder's conduct
-- on a specific emergency. Visible ONLY to the institution_admin of
-- that institution, as requested — not other responders, not even
-- super_admin (no policy is created for them below; add one later
-- if platform-wide oversight turns out to be wanted).
-- ------------------------------------------------------------
create table responder_reports (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade not null,
  emergency_id uuid references emergencies(id) on delete set null,
  reported_by uuid references profiles(id) not null,
  reported_responder_id uuid references profiles(id),
  category text not null default 'other', -- 'no_response' | 'unprofessional' | 'wrong_advice' | 'other'
  message text not null,
  status text not null default 'open', -- 'open' | 'reviewed' | 'dismissed'
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

create index idx_responder_reports_institution on responder_reports(institution_id);

alter table responder_reports enable row level security;

create policy "reporter can submit a report for their own institution"
  on responder_reports for insert
  with check (reported_by = auth.uid() and institution_id = auth_institution_id());

create policy "reporter can view their own submitted reports"
  on responder_reports for select
  using (reported_by = auth.uid());

create policy "institution_admin views own institution's reports"
  on responder_reports for select
  using (auth_role() = 'institution_admin' and institution_id = auth_institution_id());

create policy "institution_admin updates own institution's reports"
  on responder_reports for update
  using (auth_role() = 'institution_admin' and institution_id = auth_institution_id());
