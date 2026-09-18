-- ============================================================
-- RESQ — Day 39: activity_log table, backing the super-admin
-- "Terminal" view (signups, rate-limit rejections, unauthorized
-- attempts, no-responder-available blocks, institution/responder/unit
-- creation).
-- NOT YET APPLIED. Review before running against the live project.
--
-- All writes go through supabaseAdmin (service role), which bypasses
-- RLS entirely, so only a SELECT policy is needed here — nothing
-- else should ever be able to see or write these rows except the
-- server itself and super_admin reading them back.
--
-- Note on scope: Supabase Auth's own security logs (failed password
-- attempts, token refresh failures, etc.) live in Supabase's own
-- infrastructure and are only visible in the Supabase Dashboard's Logs
-- Explorer — they are not exposed through the project's REST/service-
-- role API, so this table cannot and does not duplicate them. This
-- table only ever records events our own application code explicitly
-- logs.
-- ============================================================

create table if not exists activity_log (
  id uuid primary key default uuid_generate_v4(),
  event_type text not null,
  detail text,
  user_id uuid references profiles(id) on delete set null,
  institution_id uuid references institutions(id) on delete set null,
  ip text,
  created_at timestamptz default now()
);

create index if not exists idx_activity_log_created_at on activity_log(created_at desc);
create index if not exists idx_activity_log_event_type on activity_log(event_type);

alter table activity_log enable row level security;

drop policy if exists "super_admin can read activity_log" on activity_log;
create policy "super_admin can read activity_log"
  on activity_log for select
  using (auth_role() = 'super_admin');
