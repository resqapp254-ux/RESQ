-- ============================================================
-- RESQ — Day 37: unit_admin can chat/send media on emergencies; video
-- is now an allowed chat media type, not just photo/voice.
-- NOT YET APPLIED. Review before running against the live project.
--
-- Bug 1 (real, live): day11's emergency_messages INSERT policy
-- ("chat insert by assigned participants") only has branches for
-- user/responder/institution_admin/super_admin — unit_admin was
-- added later (day32/33) and was never added here, so a unit_admin
-- sending a chat message or photo about an emergency gets
-- "new row violates row-level security policy for table
-- emergency_messages" every single time, unconditionally.
--
-- Bug 2 (found while adding chat video support): day17's
-- emergency_messages_media_type_check only allows media_type in
-- ('photo', 'voice') — 'video' was never added, so any chat video
-- message would fail a check-constraint violation the moment it's
-- inserted, on every platform.
-- ============================================================

drop policy if exists "chat insert by assigned participants" on emergency_messages;

create policy "chat insert by assigned participants"
  on emergency_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from emergencies e
      where e.id = emergency_id
        and (
          (auth_role() = 'user' and sender_role = 'user' and e.triggered_by = auth.uid())
          or (auth_role() = 'responder' and sender_role = 'responder' and e.claimed_by = auth.uid())
          or (auth_role() = 'institution_admin' and sender_role = 'institution_admin' and e.institution_id = auth_institution_id())
          or (auth_role() = 'unit_admin' and sender_role = 'unit_admin' and e.institution_id = auth_institution_id())
          or (auth_role() = 'super_admin' and sender_role = 'super_admin')
        )
    )
  );

alter table emergency_messages drop constraint if exists emergency_messages_media_type_check;
alter table emergency_messages add constraint emergency_messages_media_type_check
  check (media_type is null or media_type in ('photo', 'voice', 'video'));
