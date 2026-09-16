-- ============================================================
-- RESQ — Day 18: Omnichannel escalation state.
--
-- Today an unclaimed emergency gets exactly one push notification and
-- then relies on a responder happening to see it. This adds the state
-- needed to escalate automatically: 0 = only pushed, 1 = also SMS'd,
-- 2 = also called. A cron-triggered route (lib/escalateEmergency.js)
-- advances this as time passes with no claim.
-- ============================================================

alter table emergencies add column if not exists escalation_level int not null default 0;
alter table emergencies add column if not exists last_escalated_at timestamptz;
