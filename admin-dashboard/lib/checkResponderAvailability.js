// lib/checkResponderAvailability.js
// Before an emergency is actually created, confirm someone would
// actually receive it — an internal (institution-wide) responder, or
// at least one active responder on a partner unit that
// pickMatchingServices would route this emergency to. Used by
// /api/emergency/trigger so a report is never filed into a void: no
// institution admin, no responders, nobody notified, ever.

import { pickMatchingServices } from './serviceDispatch'

export async function hasAvailableResponder(supabaseAdmin, institutionId, { emergencyType, lat, lng }) {
  const { count: internalCount } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institutionId)
    .eq('role', 'responder')
    .eq('is_active', true)
    .is('service_id', null)

  if ((internalCount || 0) > 0) return true

  const { data: services } = await supabaseAdmin
    .from('institution_services')
    .select('id, service_type, lat, lng, handles_emergency_types, is_active')
    .eq('institution_id', institutionId)
    .eq('is_active', true)

  const matchingServiceIds = pickMatchingServices(services, { emergencyType, lat, lng }).map((s) => s.id)
  if (matchingServiceIds.length === 0) return false

  const { count: unitResponderCount } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'responder')
    .eq('is_active', true)
    .in('service_id', matchingServiceIds)

  return (unitResponderCount || 0) > 0
}
