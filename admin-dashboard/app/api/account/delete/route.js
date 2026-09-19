// app/api/account/delete/route.js
//
// Self-service account deletion — the person deletes their OWN
// account, not an admin removing someone else's (see
// /api/institution/remove-responder for that). Required for Play
// Store review: any app that lets someone register must offer a
// direct, visible way to delete their account and data.
//
// Same "try a real delete first, fall back to ban+deactivate" logic
// as remove-responder — a user/responder who has ever triggered or
// claimed an emergency can't be hard-deleted (Postgres refuses it,
// since emergencies.triggered_by/claimed_by would then point at
// nothing), so in that case their login is permanently revoked and
// profiles.is_active is set to false instead. Either way, they can no
// longer sign in and no longer count as an active account.
//
// Scoped to 'user' and 'responder' — the two roles a person actually
// registers into themselves. institution_admin/unit_admin/super_admin
// accounts are provisioned by someone else and stay managed through
// the existing institution/super-admin flows.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'
import { logActivity } from '../../../../lib/logActivity'

const BAN_DURATION = '876000h' // ~100 years, effectively permanent

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['user', 'responder'].includes(profile.role)) {
      return NextResponse.json({ success: false, error: 'This account type is managed by your institution or by RESQ directly. Contact them to close it.' }, { status: 403 })
    }

    if (!(await rateLimit('delete-account:' + user.id, 5, 60 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    if (!deleteError) {
      // No userId here on purpose: activity_log.user_id has a foreign
      // key to profiles(id), and profiles cascade-deletes the instant
      // auth.users does — by this point that row is already gone, so
      // passing user.id would violate the FK and logActivity's own
      // fire-and-forget catch would swallow the failure silently.
      // That made this the one outcome (account now fully gone) that
      // never actually left a trace. Identifying info goes in detail
      // instead, which has no such constraint.
      logActivity({ eventType: 'account_self_deleted', detail: `role=${profile.role} · was=${user.id} · email=${user.email || 'unknown'}`, institutionId: profile.institution_id })
      return NextResponse.json({ success: true, outcome: 'deleted' })
    }

    // Couldn't delete (almost always existing case history) — revoke
    // access instead of losing that history's attribution.
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { ban_duration: BAN_DURATION })
    if (banError) {
      return NextResponse.json({ success: false, error: banError.message }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: false, push_token: null })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    logActivity({ eventType: 'account_self_deactivated', detail: `role=${profile.role}`, userId: user.id, institutionId: profile.institution_id })

    return NextResponse.json({
      success: true,
      outcome: 'deactivated',
      note: 'Your account has case history on record, so it was deactivated rather than fully deleted — you can no longer sign in, and your past cases keep their record intact. Contact us if you need it fully erased.'
    })
  } catch (err) {
    console.error('SELF DELETE ACCOUNT ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
