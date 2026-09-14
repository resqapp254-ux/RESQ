-- RESQ Day 10: trusted contacts, emergency photos, and notification idempotency.
-- Apply after schema.sql and the existing day migrations. Safe to re-run.

alter table emergencies add column if not exists photo_url text;
alter table emergencies add column if not exists notifications_sent_at timestamptz;

create table if not exists guardians (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  guardian_name text not null,
  guardian_phone text not null,
  created_at timestamptz default now()
);

alter table guardians enable row level security;

drop policy if exists "users manage their own guardians" on guardians;
create policy "users manage their own guardians"
  on guardians for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "super_admin can view all guardians" on guardians;
create policy "super_admin can view all guardians"
  on guardians for select
  using (auth_role() = 'super_admin');

create unique index if not exists idx_guardians_user_phone on guardians(user_id, guardian_phone);
create index if not exists idx_guardians_user_id on guardians(user_id);