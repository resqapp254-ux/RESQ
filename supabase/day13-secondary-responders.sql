-- ============================================================
-- RESQ — Day 13: Secondary responders (hospital / police / etc.)
-- NOT YET APPLIED. Review before running against the live project.
-- Run in the Supabase SQL Editor, or via `supabase db push`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SERVICE TYPE + INSTITUTION SERVICES
-- An institution (added only by super_admin) can register extra
-- responder units of its own — a partner hospital, police post,
-- fire unit, or any custom service. These are "secondary
-- responders": they use the exact same `profiles` (role =
-- 'responder') accounts and login as primary responders, just
-- linked to a service record instead of only the institution.
-- ------------------------------------------------------------
create type service_type as enum ('hospital', 'police', 'fire', 'ambulance', 'other');

create table institution_services (
  id uuid primary key default uuid_generate_v4(),
  institution_id uuid references institutions(id) on delete cascade not null,
  service_type service_type not null default 'other',
  name text not null,
  lat double precision not null,
  lng double precision not null,
  contact_phone text,
  -- Which emergency_type values this service responds to.
  -- Empty array = "all types" (used for custom/'other' services
  -- unless the institution admin narrows it down).
  handles_emergency_types text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_institution_services_institution on institution_services(institution_id);

-- ------------------------------------------------------------
-- 2. LINK RESPONDERS TO A SERVICE
-- Null service_id = primary responder (today's behavior,
-- unchanged: they see and are notified of every emergency for
-- their institution). Non-null = a secondary responder for that
-- specific service.
-- ------------------------------------------------------------
alter table profiles add column service_id uuid references institution_services(id) on delete set null;
create index idx_profiles_service on profiles(service_id);

-- ------------------------------------------------------------
-- 3. DISTANCE HELPER (haversine, km) — no PostGIS dependency,
-- consistent with the rest of the schema's plain lat/lng columns.
-- ------------------------------------------------------------
create or replace function resq_distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision as $$
  select 6371 * acos(
    least(1, greatest(-1,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1))
      + sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$ language sql immutable;

-- ------------------------------------------------------------
-- 4. RLS
-- Institution admins manage their own institution's services.
-- Everyone in the institution (responders/admin) can see them —
-- needed so the app can show "which service is this responder
-- part of" in the UI.
-- ------------------------------------------------------------
alter table institution_services enable row level security;

create policy "super_admin full access on institution_services"
  on institution_services for all
  using (auth_role() = 'super_admin');

create policy "institution_admin manages own institution's services"
  on institution_services for all
  using (auth_role() = 'institution_admin' and institution_id = auth_institution_id());

create policy "institution members can view own institution's services"
  on institution_services for select
  using (institution_id = auth_institution_id());

-- ============================================================
-- Dispatch rule (implemented in application code, in
-- lib/notifyResponders.js — NOT in this migration, so it ships
-- separately once this schema is reviewed and applied):
--
--   1. Primary responders (profiles.service_id is null) always
--      receive every emergency for their institution — unchanged.
--   2. If the institution has 2 or fewer active services, every
--      secondary responder receives every emergency too (small
--      enough that filtering isn't worth the complexity).
--   3. If the institution has more than 2 active services,
--      a secondary responder is only notified when their
--      service's handles_emergency_types contains the
--      emergency's emergency_type (or the array is empty, i.e.
--      "handles everything"), preferring services within ~25km
--      of the emergency and falling back to the nearest matching
--      service if none are within that radius, using
--      resq_distance_km() above.
-- ============================================================
