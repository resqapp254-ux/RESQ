-- ============================================================
-- RESQ — Day 26: Public vs. private institutions, and letting a
-- user belong to more than one institution and switch between them.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Two account modes for a `user`:
--   - 'private' (unchanged default): routes to whichever institution
--     is currently active in profiles.institution_id, joined by
--     entering that institution's code.
--   - 'public': no institution code needed. An emergency they
--     trigger is routed at trigger-time to the nearest active
--     institution marked visibility='public' that handles that
--     emergency type (see lib/publicInstitutionRouting.js), the same
--     nearest-match idea already used for institution_services.
--
-- A user can be linked to several private institutions (added by
-- entering each one's code) and switch which one is active without
-- re-entering a code, tracked in user_institutions below.
-- ============================================================

alter table institutions add column if not exists visibility text not null default 'private' check (visibility in ('private', 'public'));
alter table institutions add column if not exists lat double precision;
alter table institutions add column if not exists lng double precision;

alter table profiles add column if not exists account_mode text not null default 'private' check (account_mode in ('private', 'public'));

create table if not exists user_institutions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  institution_id uuid references institutions(id) on delete cascade not null,
  added_at timestamptz default now(),
  unique (user_id, institution_id)
);

create index if not exists idx_user_institutions_user on user_institutions(user_id);

alter table user_institutions enable row level security;

drop policy if exists "users manage their own institution links" on user_institutions;
create policy "users manage their own institution links"
  on user_institutions for all
  using (user_id = auth.uid());

drop policy if exists "super_admin full access on user_institutions" on user_institutions;
create policy "super_admin full access on user_institutions"
  on user_institutions for all
  using (auth_role() = 'super_admin');

-- Institution admins can see the public/private status and location
-- of their own institution — already covered by existing "own
-- institution" policies on `institutions` since these are just new
-- columns on that same row, no policy change needed there.

-- Public institutions need to be findable by an unauthenticated
-- routing lookup done server-side (service role), so no public SELECT
-- policy is needed on `institutions` for this — the matching happens
-- in application code via supabaseAdmin, same pattern as
-- institution_services routing.

-- A user's institutions SELECT policy only ever covered their single
-- *currently active* institution (id = auth_institution_id()). Once a
-- user can belong to several and switch between them, the switcher UI
-- needs to read the others too, to show their names.
drop policy if exists "users can view institutions they are linked to" on institutions;
create policy "users can view institutions they are linked to"
  on institutions for select
  using (id in (select institution_id from user_institutions where user_id = auth.uid()));

