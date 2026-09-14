-- ============================================================
-- RESQ — Day 7: Push notification support
-- Run this in Supabase SQL Editor after previous scripts.
-- ============================================================

alter table profiles add column if not exists push_token text;
alter table institutions add column if not exists app_download_url text;
