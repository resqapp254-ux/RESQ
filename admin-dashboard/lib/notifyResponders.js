// lib/notifyResponders.js
// Shared logic for pushing a notification to responders in an
// institution, and alerting the institution admin via SMS.
// Prefers responders currently on an active shift; if none are
// on shift right now, falls back to notifying everyone so no
// emergency goes unseen just because shifts weren't scheduled.

import { supabaseAdmin } from './supabaseAdmin'
import { sendTriggerSmsToAdmin } from './notifyInstitutionAdmin'

export async function notifyResponders(emergencyId) {
  const { data: emergency, error: fetchError } = await supabaseAdmin
    .from('emergencies')
    .select('id, institution_id, institutions(name)')
    .eq('id', emergencyId)
    .single()

  if (fetchError || !emergency) {
    return { success: false, error: 'Emergency not found' }
  }

  const institutionName = emergency.institutions?.name || 'your institution'

  // Alert the institution admin by SMS regardless of who's on shift
  sendTriggerSmsToAdmin(emergencyId, emergency.institution_id, institutionName).catch((err) =>
    console.error('Admin SMS alert failed:', err.message)
  )

  const nowIso = new Date().toISOString()

  const { data: onShiftIds } = await supabaseAdmin
    .from('responder_shifts')
    .select('responder_id')
    .eq('institution_id', emergency.institution_id)
    .lte('shift_start', nowIso)
    .gte('shift_end', nowIso)

  const onShiftResponderIds = (onShiftIds || []).map((s) => s.responder_id)

  let responderQuery = supabaseAdmin
    .from('profiles')
    .select('id, push_token')
    .eq('institution_id', emergency.institution_id)
    .eq('role', 'responder')
    .not('push_token', 'is', null)

  // If anyone is actually on shift right now, only notify them.
  // Otherwise fall back to notifying every responder in the institution.
  if (onShiftResponderIds.length > 0) {
    responderQuery = responderQuery.in('id', onShiftResponderIds)
  }

  const { data: responders, error: responderError } = await responderQuery

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

  return { success: true, notified: responders.length, onShiftOnly: onShiftResponderIds.length > 0, pushResult }
}
