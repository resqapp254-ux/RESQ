// lib/emergencyTypeColors.js
// Single source of truth for per-emergency-type color, shared between
// app/user/page.js's type picker and any chart/visualization that
// needs the same palette (e.g. components/IncidentChart.js) — these
// used to be two separately hardcoded copies that could silently
// drift apart.
//
// Raw hex only, deliberately not var(--resq-*) tokens: app/user/page.js
// does string concatenation on these (`${type.color}26` for an alpha
// suffix), which only works on a literal hex value — `var(--x)26` is
// invalid CSS. --resq-cyan/--resq-amber happen to equal these two
// values already; keep them in sync by hand if either token changes.

export const EMERGENCY_TYPE_COLORS = {
  medical: '#ff5252',
  fire: '#ff8a3d',
  accident: '#ffca3d',
  security: '#35d0e8',
  gbv: '#c084fc',
  mental_health: '#7f9cf5',
  property_damage: '#8d99ae',
  other: '#e0b34d'
}
