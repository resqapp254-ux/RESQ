// app/api/emergency/notify-responders/route.js
//
// SERVER-SIDE ROUTE. Called by the mobile app right after a user
// triggers an emergency. Thin wrapper around the shared
// notifyResponders() function so it can also be called directly
// from internal server code (e.g. the USSD/SMS handlers).

import { NextResponse } from 'next/server'
import { notifyResponders } from '../../../../lib/notifyResponders'

export async function POST(request) {
  try {
    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const result = await notifyResponders(emergencyId)
    return NextResponse.json(result, { status: result.success ? 200 : 500 })
  } catch (err) {
    console.error('NOTIFY RESPONDERS ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
