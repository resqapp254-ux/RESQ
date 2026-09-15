// lib/serviceDispatch.js
// Shared, framework-agnostic logic for routing an emergency to an
// institution's secondary responder services (hospital, police,
// fire, ambulance, or a custom service an institution registers).
// Used both server-side (lib/notifyResponders.js, for push
// notifications) and client-side (app/user/page.js, to filter a
// secondary responder's own queue) — plain data in, plain data out,
// no supabase client required.
//
// Rule:
//   1. Primary responders (profiles.service_id is null) always see
//      / are notified of every emergency for their institution.
//      This file has nothing to do with them.
//   2. An institution with 2 or fewer active services: every
//      secondary responder sees/receives every emergency too.
//   3. An institution with more than 2 active services: a secondary
//      responder only sees/receives an emergency when their
//      service's handles_emergency_types matches the emergency's
//      type (an empty array means "handles everything"), preferring
//      services within NEARBY_RADIUS_KM of the emergency and
//      falling back to the single nearest matching service if none
//      are within that radius.

export const NEARBY_RADIUS_KM = 25

const EARTH_RADIUS_KM = 6371

export function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined)) return null
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function serviceHandlesType(service, emergencyType) {
  const types = service.handles_emergency_types || []
  return types.length === 0 || types.includes(emergencyType)
}

// Given all active services for an institution and one emergency,
// return the subset of services that should see/be notified of it.
export function pickMatchingServices(services, { emergencyType, lat, lng }) {
  const active = (services || []).filter((s) => s.is_active !== false)
  if (active.length === 0) return []
  if (active.length <= 2) return active

  const typeMatches = active.filter((s) => serviceHandlesType(s, emergencyType))
  if (typeMatches.length === 0) return []

  if (lat == null || lng == null) return typeMatches

  const withDistance = typeMatches.map((s) => ({ service: s, distance: distanceKm(lat, lng, s.lat, s.lng) }))
  const nearby = withDistance.filter((s) => s.distance !== null && s.distance <= NEARBY_RADIUS_KM)

  if (nearby.length > 0) return nearby.map((s) => s.service)

  // Nothing within radius — fall back to the single nearest match so
  // the emergency is never silently dropped.
  const sorted = withDistance
    .filter((s) => s.distance !== null)
    .sort((a, b) => a.distance - b.distance)
  return sorted.length > 0 ? [sorted[0].service] : typeMatches
}

export const DEFAULT_HANDLES_BY_SERVICE_TYPE = {
  hospital: ['medical', 'accident', 'gbv', 'mental_health'],
  police: ['security', 'gbv', 'property_damage'],
  fire: ['fire', 'accident', 'property_damage'],
  ambulance: ['medical', 'accident'],
  other: []
}
