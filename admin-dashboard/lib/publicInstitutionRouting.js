// lib/publicInstitutionRouting.js
// Routes a "public" account's emergency (no institution code entered)
// to the nearest active institution marked visibility='public' that
// handles that emergency type, e.g. a public police service or
// public hospital network. Mirrors the nearest-match idea already
// used for institution_services (see lib/serviceDispatch.js), one
// level up: institution, not unit-within-an-institution.

import { distanceKm } from './serviceDispatch'

export const PUBLIC_INSTITUTION_RADIUS_KM = 50

// Given every active, public institution and one emergency, return
// the single best institution to route it to, or null if there are
// none at all. Never returns null just because nothing is "close" or
// "matching type", so a public emergency is never silently dropped.
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
