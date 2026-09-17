-- ============================================================
-- RESQ — Day 23: Let a responder flag a message in the institution
-- team chat as an urgent alert, distinct from ordinary chat.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Built for the secondary/view-only responder's role: they watch the
-- full emergency feed but cannot claim, so when they see something a
-- primary responder should act on (an unclaimed case sitting too
-- long, for example) they need a way to grab attention beyond a
-- normal chat message that might go unread. Any responder or admin
-- can send one, not only secondary responders, since a primary
-- responder needing backup has the same need.
-- ============================================================

alter table institution_chat_messages add column if not exists is_alert boolean not null default false;
