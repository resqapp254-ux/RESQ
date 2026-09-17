// lib/publicInstitutionRouting.js
// Mirrors admin-dashboard/lib/publicInstitutionRouting.js exactly.
// Not currently called from mobile (public-mode triggers go through
// the shared /api/emergency/trigger route, see UserHomeScreen.js),
// kept here for parity in case a future mobile-only flow needs it.

import { distanceKm } from './serviceDispatch'

export const PUBLIC_INSTITUTION_RADIUS_KM = 50

export function pickPublicInstitution(institutions, { emergencyType, lat, lng }) {
  const active = (institutions || []).filter((i) => i.status === 'active' && i.visibility === 'public')
  if (active.length === 0) return null

  const typeMatches = active.filter((i) => {
    const types = i.enabled_emergency_types || []
    return types.length === 0 || types.includes(emergencyType)
  })
  const pool = typeMatches.length > 0 ? typeMatches : active

  if (lat == null || lng == null) return pool[0]

  const withDistance = pool
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({ institution: i, distance: distanceKm(lat, lng, i.lat, i.lng) }))

  if (withDistance.length === 0) return pool[0]

  withDistance.sort((a, b) => a.distance - b.distance)
  return withDistance[0].institution
}
