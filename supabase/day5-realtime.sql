-- ============================================================
-- RESQ — Day 5: Enable Realtime for live emergency updates
-- Run this in Supabase SQL Editor after schema.sql + auth-functions.sql
-- Safe to re-run — skips tables already added.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'emergencies'
  ) then
    alter publication supabase_realtime add table emergencies;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'emergency_messages'
  ) then
    alter publication supabase_realtime add table emergency_messages;
  end if;
end $$;
