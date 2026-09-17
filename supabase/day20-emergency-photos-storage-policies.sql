-- ============================================================
-- RESQ — Day 20: Codify emergency-photos storage policies in SQL.
--
-- This bucket has existed and worked since early in the project, but
-- its RLS policies were only ever configured through the Supabase
-- dashboard — a gap flagged in a previous audit: if this project were
-- ever rebuilt from the migration files alone, uploads would silently
-- fail until someone recreated these by hand. Matches the pattern
-- already used for institution-logos (day19).
--
-- These policies are additive alongside whatever the dashboard already
-- has configured — Postgres combines multiple permissive policies for
-- the same command with OR, so this can only ever be as-permissive-or-
-- more, never more restrictive, and re-running it is always safe.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('emergency-photos', 'emergency-photos', true)
on conflict (id) do nothing;

drop policy if exists "public can view emergency photos" on storage.objects;
drop policy if exists "authenticated can upload emergency photos" on storage.objects;
drop policy if exists "authenticated can update emergency photos" on storage.objects;

create policy "public can view emergency photos"
  on storage.objects for select
  using (bucket_id = 'emergency-photos');

create policy "authenticated can upload emergency photos"
  on storage.objects for insert
  with check (bucket_id = 'emergency-photos' and auth.role() = 'authenticated');

create policy "authenticated can update emergency photos"
  on storage.objects for update
  using (bucket_id = 'emergency-photos' and auth.role() = 'authenticated');
