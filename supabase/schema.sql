-- ============================================================
-- RESQ Emergency Response App — Core Database Schema
-- Platform: Supabase (Postgres)
-- Tenant model: SINGLE DATABASE, row-level isolation via RLS
-- ============================================================

-- ------------------------------------------------------------
-- CLEANUP (safe to re-run this whole script from any state)
-- ------------------------------------------------------------
drop table if exists notification_log cascade;
drop table if exists emergency_messages cascade;
drop table if exists emergencies cascade;
drop table if exists responder_shifts cascade;
drop table if exists profiles cascade;
drop table if exists institutions cascade;

drop type if exists user_role cascade;
drop type if exists institution_status cascade;
drop type if exists emergency_status cascade;
drop type if exists subscription_tier cascade;

-- ------------------------------------------------------------
-- EXTENSIONS
-- ------------------------------------------------------------
create extension if not exists "uuid-ossp";
-- Note: we use plain double precision lat/lng columns below,
-- so PostGIS is not required. Removed to avoid extension
-- availability issues on some Supabase plans.

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------
create type user_role as enum ('super_admin', 'institution_admin', 'responder', 'user');
create type institution_status as enum ('pending_verification', 'active', 'suspended');
create type emergency_status as enum ('triggered', 'claimed', 'in_progress', 'resolved', 'cancelled');
create type subscription_tier as enum ('trial', 'basic', 'pro', 'enterprise');

-- ------------------------------------------------------------
-- INSTITUTIONS
-- Created only by super_admin. Each has a unique join CODE
-- (used by users at signup) and a separate VERIFICATION CODE
-- (sent by super_admin, entered once by institution_admin to
-- unlock full institution functionality).
-- ------------------------------------------------------------
create table institutions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  institution_code text unique not null,       -- e.g. "RESQ-NBI-042" — users enter this to route emergencies here
  verification_code text not null,             -- one-time code super_admin issues, consumed on first admin login
  verification_code_used boolean default false,
  status institution_status default 'pending_verification',
  subscription_tier subscription_tier default 'trial',
  subscription_expires_at timestamptz,
  contact_email text not null,
  contact_phone text,
  created_at timestamptz default now(),
  created_by uuid, -- super_admin's auth.uid()
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- PROFILES
-- Extends Supabase auth.users with role + institution binding.
-- institution_id is NULL only for super_admin.
-- ------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  institution_id uuid references institutions(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  entered_institution_code text, -- the code this user typed on first login (users/responders/admins)
  is_on_duty boolean default false, -- responders only
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- RESPONDER SHIFTS
-- Set by institution_admin for their responders.
-- ------------------------------------------------------------
create table responder_shifts (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade not null,
  responder_id uuid references profiles(id) on delete cascade not null,
  shift_start timestamptz not null,
  shift_end timestamptz not null,
  created_by uuid references profiles(id), -- institution_admin
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- EMERGENCIES
-- Core event table. Routed to an institution via the code the
-- triggering user entered at their first login.
-- ------------------------------------------------------------
create table emergencies (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) not null,
  triggered_by uuid references profiles(id) not null,
  status emergency_status default 'triggered',
  lat double precision not null,
  lng double precision not null,
  location_updated_at timestamptz default now(),
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  resolved_at timestamptz,
  ai_advice_to_user text,      -- first AI response sent to the user
  ai_flag_to_responder text,   -- AI's warning if responder instruction looks wrong/unsafe
  triggered_via text default 'app', -- 'app' | 'ussd' | 'sms'
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- EMERGENCY CHAT MESSAGES
-- ------------------------------------------------------------
create table emergency_messages (
  id uuid primary key default uuid_generate_v4(),
  emergency_id uuid references emergencies(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  sender_role user_role not null,
  message text not null,
  is_ai_generated boolean default false,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- INSTITUTION ADMIN NOTIFICATION LOG (email/SMS on resolution)
-- ------------------------------------------------------------
create table notification_log (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) not null,
  emergency_id uuid references emergencies(id),
  channel text not null, -- 'email' | 'sms' | 'push'
  recipient text not null,
  status text default 'sent',
  sent_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table institutions enable row level security;
alter table profiles enable row level security;
alter table responder_shifts enable row level security;
alter table emergencies enable row level security;
alter table emergency_messages enable row level security;
alter table notification_log enable row level security;

-- Helper: get current user's role + institution without recursive RLS lookups
create or replace function auth_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, auth, pg_temp;

create or replace function auth_institution_id() returns uuid as $$
  select institution_id from profiles where id = auth.uid();
$$ language sql stable security definer set search_path = public, auth, pg_temp;

-- ---------------- INSTITUTIONS ----------------
create policy "super_admin full access on institutions"
  on institutions for all
  using (auth_role() = 'super_admin');

create policy "institution members can view their own institution"
  on institutions for select
  using (id = auth_institution_id());

-- ---------------- PROFILES ----------------
create policy "super_admin full access on profiles"
  on profiles for all
  using (auth_role() = 'super_admin');

create policy "users can view/update their own profile"
  on profiles for select using (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update using (id = auth.uid());

create policy "institution_admin manages own institution's staff"
  on profiles for all
  using (
    auth_role() = 'institution_admin'
    and institution_id = auth_institution_id()
    and role in ('responder','user')
  );

-- ---------------- RESPONDER SHIFTS ----------------
create policy "institution isolation on shifts"
  on responder_shifts for all
  using (institution_id = auth_institution_id() or auth_role() = 'super_admin');

-- ---------------- EMERGENCIES ----------------
create policy "institution isolation on emergencies"
  on emergencies for select
  using (institution_id = auth_institution_id() or auth_role() = 'super_admin');

create policy "users can insert their own emergency"
  on emergencies for insert
  with check (triggered_by = auth.uid());

create policy "responders can claim/update within their institution"
  on emergencies for update
  using (institution_id = auth_institution_id() and auth_role() in ('responder','institution_admin'));

-- ---------------- EMERGENCY MESSAGES ----------------
create policy "chat visible to institution + the triggering user"
  on emergency_messages for select
  using (
    exists (
      select 1 from emergencies e
      where e.id = emergency_id
      and (e.institution_id = auth_institution_id() or e.triggered_by = auth.uid())
    )
  );

create policy "chat insert by participants"
  on emergency_messages for insert
  with check (sender_id = auth.uid());

-- ---------------- NOTIFICATION LOG ----------------
create policy "institution isolation on notification_log"
  on notification_log for select
  using (institution_id = auth_institution_id() or auth_role() = 'super_admin');

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_profiles_institution on profiles(institution_id);
create index idx_emergencies_institution on emergencies(institution_id);
create index idx_emergencies_status on emergencies(status);
create index idx_shifts_responder on responder_shifts(responder_id);
create index idx_messages_emergency on emergency_messages(emergency_id);
