// lib/emergencyTypeColors.js
// Mobile counterpart to admin-dashboard/lib/emergencyTypeColors.js —
// same values, kept in sync by hand (no shared package between the
// two apps). Single source of truth so the type picker, the type
// badge, and the history list never drift apart on color.

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
