// lib/notifyResponders.js
// Shared logic for pushing a notification to responders in an
// institution, and alerting the institution admin via SMS.
// Prefers responders currently on an active shift; if none are
// on shift right now, falls back to notifying everyone so no
// emergency goes unseen just because shifts weren't scheduled.

import { supabaseAdmin } from './supabaseAdmin'
import { sendTriggerSmsToAdmin } from './notifyInstitutionAdmin'
import { notifyGuardians } from './notifyGuardians'
import { pickMatchingServices } from './serviceDispatch'

export async function notifyResponders(emergencyId) {
  const { data: emergency, error: fetchError } = await supabaseAdmin
    .from('emergencies')
    .select('id, institution_id, triggered_by, emergency_type, lat, lng, notifications_sent_at, institutions(name)')
    .eq('id', emergencyId)
    .single()

  if (fetchError || !emergency) {
    return { success: false, error: 'Emergency not found' }
  }

  const institutionName = emergency.institutions?.name || 'your institution'

  const { data: notificationClaim, error: claimError } = await supabaseAdmin
    .from('emergencies')
    .update({ notifications_sent_at: new Date().toISOString() })
    .eq('id', emergencyId)
    .is('notifications_sent_at', null)
    .select('id')
    .maybeSingle()

  if (claimError) return { success: false, error: claimError.message }
  if (!notificationClaim) return { success: true, alreadyNotified: true, notified: 0 }

  // Alert the institution admin by SMS regardless of who's on shift
  sendTriggerSmsToAdmin(emergencyId, emergency.institution_id, institutionName).catch((err) =>
    console.error('Admin SMS alert failed:', err.message)
  )

  if (emergency.triggered_by) {
    notifyGuardians(emergency.triggered_by, institutionName).catch((err) => console.error('Guardian SMS alert failed:', err.message))
  }

  const nowIso = new Date().toISOString()

  const { data: onShiftIds } = await supabaseAdmin
    .from('responder_shifts')
    .select('responder_id')
    .eq('institution_id', emergency.institution_id)
    .lte('shift_start', nowIso)
    .gte('shift_end', nowIso)

  const onShiftResponderIds = (onShiftIds || []).map((s) => s.responder_id)

  // Primary responders — notified for every emergency in their
  // institution, unless an admin narrowed which types they handle
  // (responder_emergency_types null/empty = all types, unchanged
  // default behavior).
  let responderQuery = supabaseAdmin
    .from('profiles')
    .select('id, push_token, responder_emergency_types')
    .eq('institution_id', emergency.institution_id)
    .eq('role', 'responder')
    .is('service_id', null)
    .not('push_token', 'is', null)

  // Secondary responders — belong to an institution_service (hospital,
  // police, etc). Only the services this emergency should route to.
  const { data: services } = await supabaseAdmin
    .from('institution_services')
    .select('id, service_type, lat, lng, handles_emergency_types, is_active')
    .eq('institution_id', emergency.institution_id)
    .eq('is_active', true)

  const matchingServices = pickMatchingServices(services, {
    emergencyType: emergency.emergency_type,
    lat: emergency.lat,
    lng: emergency.lng
  })
  const matchingServiceIds = matchingServices.map((s) => s.id)

  let secondaryResponders = []
  if (matchingServiceIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, push_token')
      .eq('role', 'responder')
      .in('service_id', matchingServiceIds)
      .not('push_token', 'is', null)
    secondaryResponders = data || []
  }

  // If anyone is actually on shift right now, only notify them.
  // Otherwise fall back to notifying every eligible responder.
  if (onShiftResponderIds.length > 0) {
    responderQuery = responderQuery.in('id', onShiftResponderIds)
    secondaryResponders = secondaryResponders.filter((r) => onShiftResponderIds.includes(r.id))
  }

  const { data: primaryResponders, error: responderError } = await responderQuery

  if (responderError) {
    return { success: false, error: responderError.message }
  }

  const filteredPrimary = (primaryResponders || []).filter((r) => {
    const types = r.responder_emergency_types
    return !types || types.length === 0 || types.includes(emergency.emergency_type)
  })

  const seen = new Set()
  const responders = [...filteredPrimary, ...secondaryResponders].filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  if (responders.length === 0) {
    return { success: true, notified: 0, note: 'No responders with a registered device found.' }
  }

  const messages = responders.map((r) => ({
    to: r.push_token,
    title: '🚨 New Emergency',
    body: 'Tap to view and claim this emergency now.',
    priority: 'high',
    channelId: 'resq-emergency-alerts',
    // Android's actual sound comes from the channel (see
    // mobile/lib/notifications.js); this field is what iOS uses,
    // which doesn't have channels — same bundled siren either way.
    sound: 'siren.wav',
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
