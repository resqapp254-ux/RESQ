// app/api/emergency/notify-responders/route.js
//
// SERVER-SIDE ROUTE. Called by the mobile app right after a user
// triggers an emergency. Thin wrapper around the shared
// notifyResponders() function so it can also be called directly
// from internal server code (e.g. the USSD/SMS handlers).

import { NextResponse } from 'next/server'
import { notifyResponders } from '../../../../lib/notifyResponders'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })
    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const { data: emergency } = await supabaseAdmin.from('emergencies').select('triggered_by').eq('id', emergencyId).single()
    if (!emergency || emergency.triggered_by !== user.id) return NextResponse.json({ success: false, error: 'Not authorized for this emergency' }, { status: 403 })

    const result = await notifyResponders(emergencyId)
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (err) {
    console.error('NOTIFY RESPONDERS ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
