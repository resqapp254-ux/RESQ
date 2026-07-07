// lib/notifyResponders.js
// Shared logic for pushing a notification to every responder in
// an institution. Used directly by server code (USSD/SMS handlers)
// and wrapped by the /api/emergency/notify-responders route for
// the mobile app to call over HTTP.

import { supabaseAdmin } from './supabaseAdmin'

export async function notifyResponders(emergencyId) {
  const { data: emergency, error: fetchError } = await supabaseAdmin
    .from('emergencies')
    .select('id, institution_id')
    .eq('id', emergencyId)
    .single()

  if (fetchError || !emergency) {
    return { success: false, error: 'Emergency not found' }
  }

  const { data: responders, error: responderError } = await supabaseAdmin
    .from('profiles')
    .select('id, push_token')
    .eq('institution_id', emergency.institution_id)
    .eq('role', 'responder')
    .not('push_token', 'is', null)

  if (responderError) {
    return { success: false, error: responderError.message }
  }

  if (!responders || responders.length === 0) {
    return { success: true, notified: 0, note: 'No responders with a registered device found.' }
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

  return { success: true, notified: responders.length, pushResult }
}
