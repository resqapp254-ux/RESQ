// lib/checkResponderAvailability.js
// Before an emergency is actually created, confirm someone would
// actually receive it AND be able to act on it — an internal
// (institution-wide) responder who handles this specific emergency
// type, or at least one active, full-permission responder on a
// partner unit that pickMatchingServices would route this emergency
// to. Used by /api/emergency/trigger so a report is never filed into
// a void: no institution admin, no responders, nobody who could ever
// claim it, ever.
//
// Mirrors the same filtering notifyResponders() applies when it
// actually sends push notifications — this function only exists to
// answer "would that same notify call reach someone who can respond"
// before the emergency record is even created.

import { pickMatchingServices } from './serviceDispatch'

// view_only responders can watch and chase up a primary, but can
// never claim/resolve (see /api/emergency/claim) — so a unit or
// institution staffed only by view_only responders can never actually
// close the case out, and shouldn't count as "available" here.
function canRespond(responder, emergencyType) {
  if (responder.responder_permission === 'view_only') return false
  const types = responder.responder_emergency_types
  return !types || types.length === 0 || types.includes(emergencyType)
}

export async function hasAvailableResponder(supabaseAdmin, institutionId, { emergencyType, lat, lng }) {
  // The institution's own deliberate choice of which types it accepts
  // at all (set in institution-admin/settings) — separate from, and
  // checked before, any per-responder narrowing below. Without this,
  // an institution that never opted into e.g. "gbv" could still
  // silently accept one, as long as it had any unrestricted internal
  // responder (responder_emergency_types null = "handles everything
  // assigned to me", which said nothing about what the institution
  // itself had actually signed up to handle).
  const { data: inst } = await supabaseAdmin
    .from('institutions')
    .select('enabled_emergency_types')
    .eq('id', institutionId)
    .maybeSingle()

  const enabledTypes = inst?.enabled_emergency_types
  if (enabledTypes && enabledTypes.length > 0 && !enabledTypes.includes(emergencyType)) {
    return false
  }

  const { data: internalResponders } = await supabaseAdmin
    .from('profiles')
    .select('id, responder_emergency_types, responder_permission')
    .eq('institution_id', institutionId)
    .eq('role', 'responder')
    .eq('is_active', true)
    .is('service_id', null)

  if ((internalResponders || []).some((r) => canRespond(r, emergencyType))) return true

  const { data: services } = await supabaseAdmin
    .from('institution_services')
    .select('id, service_type, lat, lng, handles_emergency_types, is_active')
    .eq('institution_id', institutionId)
    .eq('is_active', true)

  const matchingServiceIds = pickMatchingServices(services, { emergencyType, lat, lng }).map((s) => s.id)
  if (matchingServiceIds.length === 0) return false

  // A matching unit's own handles_emergency_types already gates the
  // type (that's how it got into matchingServiceIds) — only
  // permission needs checking here, not responder_emergency_types.
  const { data: unitResponders } = await supabaseAdmin
    .from('profiles')
    .select('id, responder_permission')
    .eq('role', 'responder')
    .eq('is_active', true)
    .in('service_id', matchingServiceIds)

  return (unitResponders || []).some((r) => r.responder_permission !== 'view_only')
}
