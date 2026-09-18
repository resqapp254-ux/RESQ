// app/api/institution/remove-responder/route.js
//
// "Remove" a responder without deleting them: emergencies.triggered_by
// and .claimed_by both reference profiles(id) with no ON DELETE
// clause, so a hard delete would fail outright for any responder who
// has ever claimed a case, and would be wrong anyway since it would
// destroy that case's audit trail. Instead this bans their login
// (Auth Admin API) and marks profiles.is_active = false, clears their
// push token so they stop receiving alerts immediately, while every
// past emergency they were ever involved in still shows their name.
// Reactivating (active: true) reverses all of it.
//
// Callable by the institution_admin for any responder in their
// institution, or a unit_admin for a responder linked to their own
// unit only.

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

    if (fetchError || !target || target.role !== 'responder') {
      return NextResponse.json({ success: false, error: 'Responder not found' }, { status: 404 })
    }

    const authorized =
      (caller.role === 'institution_admin' && target.institution_id === caller.institution_id) ||
      (caller.role === 'unit_admin' && caller.service_id && target.service_id === caller.service_id)

    if (!authorized) {
      return NextResponse.json({ success: false, error: 'That responder is not in your institution/unit' }, { status: 403 })
    }

    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(responderId, {
      ban_duration: active ? 'none' : BAN_DURATION
    })
    if (banError) {
      return NextResponse.json({ success: false, error: banError.message }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: active, ...(active ? {} : { push_token: null }) })
      .eq('id', responderId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('REMOVE RESPONDER ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
