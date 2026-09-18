// lib/serviceDispatch.js
// Mirrors admin-dashboard/lib/serviceDispatch.js exactly, so a
// secondary responder sees the same filtered queue on mobile as they
// would on web — plain data in, plain data out, no supabase client
// required. See that file for the full rule explanation.

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

export function pickMatchingServices(services, { emergencyType, lat, lng }) {
  const active = (services || []).filter((s) => s.is_active !== false)
  if (active.length === 0) return []

  const typeMatches = active.filter((s) => serviceHandlesType(s, emergencyType))
  if (typeMatches.length === 0) return []

  const individuals = typeMatches.filter((s) => s.service_type === 'individual')
  const locatable = typeMatches.filter((s) => s.service_type !== 'individual')

  if (locatable.length === 0) return individuals
  if (lat == null || lng == null) return typeMatches

  const withDistance = locatable.map((s) => ({ service: s, distance: distanceKm(lat, lng, s.lat, s.lng) }))
  const nearby = withDistance.filter((s) => s.distance !== null && s.distance <= NEARBY_RADIUS_KM)

  if (nearby.length > 0) return [...individuals, ...nearby.map((s) => s.service)]

  const sorted = withDistance
    .filter((s) => s.distance !== null)
    .sort((a, b) => a.distance - b.distance)
  return [...individuals, ...(sorted.length > 0 ? [sorted[0].service] : [])]
}
