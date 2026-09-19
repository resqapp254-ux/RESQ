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
// the single best institution to route it to, or null if none of them
// actually registered for this emergency type. Distance is only a
// tiebreaker among type-matching institutions — never a reason to
// route to one that never opted into handling this type at all.
//
// Previously fell back to "any active public institution" whenever
// none matched the type, on the theory that a public emergency should
// never be silently dropped. In practice this meant an institution
// that deliberately never enabled e.g. "gbv" would still receive one
// anyway, as long as it was the only (or nearest) public institution
// around — exactly the "institution gets emergencies it never
// registered for" bug. Returning null here is safe: the caller
// (api/emergency/trigger) already rejects with a clear "no public
// responder available for this type" message instead of creating the
// emergency, rather than silently misrouting it.
export function pickPublicInstitution(institutions, { emergencyType, lat, lng }) {
  const active = (institutions || []).filter((i) => i.status === 'active' && i.visibility === 'public')
  if (active.length === 0) return null

  const pool = active.filter((i) => {
    const types = i.enabled_emergency_types || []
    return types.length === 0 || types.includes(emergencyType)
  })
  if (pool.length === 0) return null

  if (lat == null || lng == null) return pool[0]

  const withDistance = pool
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({ institution: i, distance: distanceKm(lat, lng, i.lat, i.lng) }))

  if (withDistance.length === 0) return pool[0]

  withDistance.sort((a, b) => a.distance - b.distance)
  return withDistance[0].institution
}
