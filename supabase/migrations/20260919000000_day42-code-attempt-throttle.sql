-- Day 42 — brute-force throttle on code-entry RPCs.
--
-- join_institution_by_code() and redeem_verification_code() are both
-- called directly from the browser/mobile client via
-- supabase.rpc(...) — they never pass through a Next.js API route,
-- so the app's Upstash rate limiter (lib/rateLimit.js) never sees
-- these calls. With the app now shared with many testers, an
-- authenticated account (trivial to self-register) could otherwise
-- script unlimited guesses at another institution's 6-character code.
-- The 33-char alphabet (~1.29 billion combinations) makes a single
-- guess unlikely to land, but "unlikely per guess" isn't a real
-- defense with zero throttling behind it — this closes that gap at
-- the database layer, so it holds regardless of which client (web,
-- mobile, or a raw REST call) makes the request.

-- ------------------------------------------------------------
-- 1. Attempt-tracking table. No public policies — every read/write
-- goes through the SECURITY DEFINER helpers below, scoped to
-- auth.uid() only.
-- ------------------------------------------------------------
create table if not exists public.code_attempt_throttle (
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  attempt_count int not null default 0,
  window_start timestamptz not null default now(),
  primary key (user_id, purpose)
);

alter table public.code_attempt_throttle enable row level security;

-- ------------------------------------------------------------
-- 2. Helpers — check-then-record, both scoped to the caller's own
-- auth.uid() (never takes a user_id argument, so one account can
-- never inspect or reset another's throttle state).
-- ------------------------------------------------------------
create or replace function public.is_code_attempt_blocked(p_purpose text, p_max_attempts int, p_window_seconds int)
returns boolean as $$
declare
  row_rec code_attempt_throttle%rowtype;
begin
  select * into row_rec from code_attempt_throttle where user_id = auth.uid() and purpose = p_purpose;

  if row_rec.user_id is null then
    return false;
  end if;

  if now() - row_rec.window_start > (p_window_seconds || ' seconds')::interval then
    return false; -- window has expired, previous attempts no longer count
  end if;

  return row_rec.attempt_count >= p_max_attempts;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

create or replace function public.record_failed_code_attempt(p_purpose text, p_window_seconds int)
returns void as $$
declare
  row_rec code_attempt_throttle%rowtype;
begin
  select * into row_rec from code_attempt_throttle where user_id = auth.uid() and purpose = p_purpose for update;

  if row_rec.user_id is null then
    insert into code_attempt_throttle (user_id, purpose, attempt_count, window_start)
      values (auth.uid(), p_purpose, 1, now());
    return;
  end if;

  if now() - row_rec.window_start > (p_window_seconds || ' seconds')::interval then
    update code_attempt_throttle set attempt_count = 1, window_start = now()
      where user_id = auth.uid() and purpose = p_purpose;
  else
    update code_attempt_throttle set attempt_count = attempt_count + 1
      where user_id = auth.uid() and purpose = p_purpose;
  end if;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

create or replace function public.clear_code_attempts(p_purpose text)
returns void as $$
begin
  delete from code_attempt_throttle where user_id = auth.uid() and purpose = p_purpose;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 3. join_institution_by_code — 8 failed guesses per rolling
-- 5-minute window per account. Only failed lookups count against
-- the limit; a correct code on the first try never trips it.
-- ------------------------------------------------------------
create or replace function join_institution_by_code(code text)
returns json as $$
declare
  inst institutions%rowtype;
  prof profiles%rowtype;
begin
  if is_code_attempt_blocked('join_institution', 8, 300) then
    return json_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
  end if;

  select * into prof from profiles where id = auth.uid();

  if prof.role != 'user' then
    return json_build_object('success', false, 'error', 'Only users join via institution code');
  end if;

  select * into inst from institutions where institution_code = code;

  if inst.id is null then
    perform record_failed_code_attempt('join_institution', 300);
    return json_build_object('success', false, 'error', 'Invalid institution code');
  end if;

  if inst.status != 'active' then
    return json_build_object('success', false, 'error', 'This institution is not yet active');
  end if;

  perform clear_code_attempts('join_institution');

  insert into user_institutions (user_id, institution_id)
    values (auth.uid(), inst.id)
    on conflict (user_id, institution_id) do nothing;

  update profiles
    set institution_id = inst.id, entered_institution_code = code, account_mode = 'private'
    where id = auth.uid();

  return json_build_object('success', true, 'institution_name', inst.name);
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

-- ------------------------------------------------------------
-- 4. redeem_verification_code — same throttle, defense in depth.
-- Already scoped to the caller's own institution (an attacker needs
-- stolen institution_admin credentials before this is reachable at
-- all), but a compromised account shouldn't get unlimited guesses
-- at the activation code either.
-- ------------------------------------------------------------
create or replace function redeem_verification_code(code text)
returns json as $$
declare
  prof profiles%rowtype;
  inst institutions%rowtype;
begin
  if is_code_attempt_blocked('redeem_verification', 8, 300) then
    return json_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
  end if;

  select * into prof from profiles where id = auth.uid();

  if prof.role is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;

  if prof.role != 'institution_admin' then
    return json_build_object('success', false, 'error', 'Only institution admins can redeem a verification code');
  end if;

  select * into inst from institutions where id = prof.institution_id;

  if inst.id is null then
    return json_build_object('success', false, 'error', 'No institution linked to this account');
  end if;

  if inst.verification_code_used then
    return json_build_object('success', false, 'error', 'This institution is already verified');
  end if;

  if inst.verification_code != code then
    perform record_failed_code_attempt('redeem_verification', 300);
    return json_build_object('success', false, 'error', 'Incorrect verification code');
  end if;

  perform clear_code_attempts('redeem_verification');

  update institutions
    set status = 'active', verification_code_used = true, updated_at = now()
    where id = inst.id;

  return json_build_object('success', true, 'institution_name', inst.name);
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;
