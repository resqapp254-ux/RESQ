-- ============================================================
-- RESQ — Day 31: Close a privilege-escalation gap found while
-- reviewing the day26 multi-institution work.
-- NOT YET APPLIED. Review before running against the live project.
--
-- "users can update their own profile" (on profiles for update using
-- (id = auth.uid())) has no WITH CHECK and no column restriction —
-- row-level security only ever gates WHICH ROW, never WHICH COLUMN.
-- That means any authenticated user could, via a raw REST PATCH to
-- their own profile row (bypassing every RPC/app-level check in this
-- codebase entirely), set their own `role` to institution_admin or
-- super_admin, their own `institution_id` to any institution, their
-- own `responder_permission` to 'full', or their own `account_mode`
-- freely. This is not new from today's work, but the new
-- user_institutions/switch_active_institution feature made it worth
-- fixing now rather than layering more RLS on top of it.
--
-- Fix: column-level privileges. RLS still gates which ROW; this
-- restricts WHICH COLUMNS of that row `authenticated` can write via a
-- direct table update at all, regardless of RLS. Every legitimate
-- privileged change (role, institution_id, service_id,
-- responder_permission, account_mode, admission_number set by an
-- institution requirement, etc.) already goes through a
-- SECURITY DEFINER RPC or a service-role API route in this codebase,
-- none of which are affected by revoking a grant from `authenticated`
-- (they run as the function owner / service_role, not as the calling
-- user). Confirmed by searching the whole app for every direct
-- `.from('profiles').update(...)` a plain client makes on its own
-- row: only full_name, phone, push_token, admission_number, and
-- avatar_url are ever touched that way.
-- ============================================================

revoke update on profiles from authenticated;

grant update (full_name, phone, push_token, admission_number, avatar_url) on profiles to authenticated;
