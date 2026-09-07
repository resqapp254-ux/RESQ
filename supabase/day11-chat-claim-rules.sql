-- RESQ Day 11: require responders to claim an emergency before chatting.
-- Apply after day10-guardians-notification-idempotency.sql. Safe to re-run.

drop policy if exists "chat insert by participants" on emergency_messages;
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
          or (auth_role() = 'super_admin' and sender_role = 'super_admin')
        )
    )
  );