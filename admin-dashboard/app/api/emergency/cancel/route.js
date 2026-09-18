// app/api/emergency/cancel/route.js
//
// Lets the person who triggered an emergency cancel it themselves —
// e.g. a false alarm, or the situation resolved itself before a
// responder arrived. Only the triggering user, and only while it's
// still open (not already resolved/cancelled), matching the same
// "only the person it belongs to" pattern as rate/route.js.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'

export async function POST(request) {
  try {
    const { profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!(await rateLimit('cancel-emergency:' + profile.id, 10, 60 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { emergencyId } = await request.json()
    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const { data: emergency, error: fetchError } = await supabaseAdmin
      .from('emergencies')
      .select('id, triggered_by, status')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }

    if (emergency.triggered_by !== profile.id) {
      return NextResponse.json({ success: false, error: 'Only the person who triggered this emergency can cancel it' }, { status: 403 })
    }

    if (['resolved', 'cancelled'].includes(emergency.status)) {
      return NextResponse.json({ success: false, error: 'This emergency is already closed' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('emergencies')
      .update({ status: 'cancelled' })
      .eq('id', emergencyId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('CANCEL EMERGENCY ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
