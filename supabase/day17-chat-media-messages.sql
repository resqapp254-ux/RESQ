-- ============================================================
-- RESQ — Day 17: Photos and voice notes as chat messages.
--
-- Bug: voice_note_url (and photo_url/video_url) are single columns
-- on the emergencies row. Every new recording/upload overwrites the
-- previous one, so a second voice note silently destroys the first,
-- and there is no history — just "whatever was uploaded last".
--
-- Fix: a message can now carry a media attachment (photo or voice
-- note) instead of, or alongside, text. Each attachment is its own
-- row in emergency_messages, so nothing is ever overwritten, both
-- sides see the same persistent history, and each one gets its own
-- independent playback state instead of sharing one player.
--
-- photo_url/video_url/voice_note_url on emergencies are untouched —
-- they remain the "evidence submitted at SOS trigger time" fields
-- and are not affected by this change.
-- ============================================================

alter table emergency_messages add column if not exists media_url text;
alter table emergency_messages add column if not exists media_type text;
alter table emergency_messages add constraint emergency_messages_media_type_check
  check (media_type is null or media_type in ('photo', 'voice'));
