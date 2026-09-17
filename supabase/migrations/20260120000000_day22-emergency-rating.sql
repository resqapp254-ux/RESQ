-- ============================================================
-- RESQ — Day 22: Responder star rating per resolved emergency.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Captured from the responder right after they mark a case resolved,
-- surfaced in the per-case and weekly downloadable reports and in the
-- super_admin JSON backup (emergencies is already dumped in full by
-- /api/admin/backup, so these columns need no extra wiring there).
-- ============================================================

alter table emergencies add column if not exists rating smallint check (rating between 1 and 5);
alter table emergencies add column if not exists rating_comment text;
