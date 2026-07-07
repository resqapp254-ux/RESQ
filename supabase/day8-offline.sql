-- ============================================================
-- RESQ — Day 8: Support USSD/SMS-triggered emergencies
-- These don't have a logged-in app account or GPS coordinates,
-- so we need to relax a few constraints and add a phone field.
-- Run this in Supabase SQL Editor after previous scripts.
-- ============================================================

alter table emergencies alter column triggered_by drop not null;
alter table emergencies alter column lat drop not null;
alter table emergencies alter column lng drop not null;
alter table emergencies add column if not exists triggered_by_phone text;
