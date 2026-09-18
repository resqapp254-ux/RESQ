-- ============================================================
-- RESQ — Day 41: enable PostGIS and pg_cron.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Easier alternative to running this file: Supabase Dashboard →
-- Database → Extensions → search "postgis" / "pg_cron" → toggle on.
-- Same effect, no SQL Editor needed, and Supabase manages the
-- schema/version for you. Both extensions are free on every Supabase
-- tier including Free.
--
-- Enabling either does nothing by itself — no existing query or
-- schema changes as a result. They're additive capabilities the app
-- doesn't use yet:
--   - PostGIS: would let distance-based routing (pickMatchingServices
--     in lib/serviceDispatch.js) run as a database query instead of
--     fetching every unit and computing Haversine distance in JS.
--     Only matters for performance once an institution has many
--     partner units; today's JS distance math is already correct.
--   - pg_cron: would let the weekly-report/escalation schedule live
--     in the database itself instead of relying on an external
--     pinger (see docs/deployment-readiness.md) hitting
--     /api/cron/weekly-report and /api/cron/escalate. Optional — the
--     external-pinger approach already works, this is an alternative
--     some teams prefer for reliability.
-- ============================================================

create extension if not exists postgis;
create extension if not exists pg_cron;
