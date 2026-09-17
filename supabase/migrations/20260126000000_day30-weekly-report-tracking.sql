-- ============================================================
-- RESQ — Day 30: Track when each institution's automated weekly
-- report was last emailed, so the cron job knows which 7-day window
-- to cover and never double-sends the same period.
-- NOT YET APPLIED. Review before running against the live project.
-- ============================================================

alter table institutions add column if not exists last_weekly_report_sent_at timestamptz;
