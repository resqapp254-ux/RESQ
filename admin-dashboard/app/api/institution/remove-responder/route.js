// app/api/institution/remove-responder/route.js
//
// "Remove" tries a real Supabase Auth account deletion first — clean,
// and exactly what most people expect "remove" to mean. It only
// works when nothing references that profile: emergencies.
// triggered_by and .claimed_by both reference profiles(id) with no
// ON DELETE clause, so a responder who has ever claimed a case can't
// be hard-deleted (Postgres refuses it, since it would leave that
// case's audit trail pointing at nothing). When that happens, this
// falls back automatically to banning their login (Auth Admin API)
// and marking profiles.is_active = false instead — every past
// emergency they were ever involved in still shows their name, they
// just can't sign in or be assigned new ones. The response's
// `outcome` field tells the caller which one happened.
//
// Reactivating (active: true) only makes sense for the fallback path
// (a deleted account has nothing left to reactivate).
//
// Callable by the institution_admin for any responder OR unit_admin
// login in their institution (e.g. to revoke a unit's dashboard login
// that was created by mistake), or a unit_admin for a responder
// linked to their own unit only (never another unit_admin).

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'

// ~100 years — effectively permanent, reversible by clearing the ban.
const BAN_DURATION = '876000h'

export async function POST(request) {
  try {
    const { profile: caller, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['institution_admin', 'unit_admin'].includes(caller.role)) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    if (!rateLimit('remove-responder:' + caller.id, 30, 60 * 60 * 1000).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { responderId, active } = await request.json()
    if (!responderId || typeof active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Missing or invalid responderId/active' }, { status: 400 })
    }

    const { data: target, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, institution_id, service_id')
      .eq('id', responderId)
      .single()

    if (fetchError || !target || !['responder', 'unit_admin'].includes(target.role)) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 })
    }
    // A unit_admin can only ever manage responders, never another
    // unit_admin login (including their own).
    if (caller.role === 'unit_admin' && target.role !== 'responder') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const authorized =
      (caller.role === 'institution_admin' && target.institution_id === caller.institution_id) ||
      (caller.role === 'unit_admin' && caller.service_id && target.service_id === caller.service_id)

    if (!authorized) {
      return NextResponse.json({ success: false, error: 'That responder is not in your institution/unit' }, { status: 403 })
    }

    if (active) {
      // Reactivating only ever applies to the ban+deactivate fallback
      // path — if this account was actually deleted, there's nothing
      // left to reactivate and this will fail with "user not found".
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(responderId, { ban_duration: 'none' })
      if (unbanError) {
        return NextResponse.json({ success: false, error: unbanError.message }, { status: 500 })
      }
      const { error: updateError } = await supabaseAdmin.from('profiles').update({ is_active: true }).eq('id', responderId)
      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, outcome: 'reactivated' })
    }

    // Try a real delete first — clean, and what "remove" should mean
    // whenever it's actually possible.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(responderId)
    if (!deleteError) {
      return NextResponse.json({ success: true, outcome: 'deleted' })
    }

    // Couldn't delete (almost always because they've claimed or
    // triggered at least one emergency) — fall back to revoking
    // access instead of losing that case history.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(responderId, { ban_duration: BAN_DURATION })
    if (banError) {
      return NextResponse.json({ success: false, error: banError.message }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false, push_token: null })
      .eq('id', responderId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      outcome: 'deactivated',
      note: 'This account has case history on record, so it was deactivated rather than deleted. Their past cases still show their name correctly.'
    })
  } catch (err) {
    console.error('REMOVE RESPONDER ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
