// app/api/emergency/notify-responders/route.js
//
// SERVER-SIDE ROUTE. Called by the mobile app right after a user
// triggers an emergency. Sends a high-priority push notification
// to every responder in that institution who has a registered
// push token, using Expo's free push notification service.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const { data: emergency, error: fetchError } = await supabaseAdmin
      .from('emergencies')
      .select('id, institution_id')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }

    const { data: responders, error: responderError } = await supabaseAdmin
      .from('profiles')
      .select('id, push_token')
      .eq('institution_id', emergency.institution_id)
      .eq('role', 'responder')
      .not('push_token', 'is', null)

    if (responderError) {
      return NextResponse.json({ success: false, error: responderError.message }, { status: 500 })
    }

    if (!responders || responders.length === 0) {
      return NextResponse.json({ success: true, notified: 0, note: 'No responders with a registered device found.' })
    }

    const messages = responders.map((r) => ({
      to: r.push_token,
      title: '🚨 New Emergency',
      body: 'Tap to view and claim this emergency now.',
      priority: 'high',
      channelId: 'resq-emergency-alerts',
      sound: 'default',
      data: { emergencyId }
    }))

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(messages)
    })

    const pushResult = await pushResponse.json()

    return NextResponse.json({ success: true, notified: responders.length, pushResult })
  } catch (err) {
    console.error('NOTIFY RESPONDERS ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
