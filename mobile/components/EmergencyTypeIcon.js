// components/EmergencyTypeIcon.js
//
// Mobile counterpart to admin-dashboard/components/EmergencyTypeIcon.js
// — same solid-silhouette pictograms, same path data, kept in sync by
// hand (no shared package between the two apps). Solid shapes read
// clearly at small sizes independent of being able to read the label
// next to them — closer to ISO/road-sign iconography than thin line
// icons.

import React from 'react'
import Svg, { Path, Circle, Rect } from 'react-native-svg'

const CUT = '#05070d'

const ICONS = {
  medical: (color) => (
    <>
      <Circle cx="12" cy="12" r="10" fill={color} />
      <Path d="M10.3 5.5h3.4v4.8h4.8v3.4h-4.8v4.8h-3.4v-4.8H5.5v-3.4h4.8V5.5Z" fill={CUT} />
    </>
  ),
  fire: (color) => (
    <Path
      d="M12 1.5c1.3 3.3-2.7 4.6-3 8a3 3 0 0 0 6 0c0-.8-.4-1.4-.4-1.4 2.2 1.4 3.9 3.8 3.9 6.4a6.5 6.5 0 0 1-13 0c0-4.9 2.5-7.6 6.5-13Z"
      fill={color}
    />
  ),
  accident: (color) => (
    <>
      <Path
        d="M3 14.2a1 1 0 0 1 1-1h1.1l1.2-3.7A2 2 0 0 1 8.2 8h7.6a2 2 0 0 1 1.9 1.5l1.2 3.7H20a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1h-1.1a2.1 2.1 0 0 1-4.1.3H9.2A2.1 2.1 0 0 1 5.1 18H4a1 1 0 0 1-1-1v-2.8Z"
        fill={color}
      />
      <Circle cx="7.3" cy="18" r="1.9" fill={CUT} />
      <Circle cx="16.7" cy="18" r="1.9" fill={CUT} />
      <Path d="M12 1.8l1.4 2.4-2.4 1.3 2.4 1.3-1.4 2.4" stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  security: (color) => (
    <Path d="M12 2.2l7.5 2.8v6c0 5.2-3.3 9-7.5 11-4.2-2-7.5-5.8-7.5-11v-6L12 2.2Z" fill={color} />
  ),
  gbv: (color) => (
    <Path
      d="M12 20.2s-7.7-4.6-7.7-10.1C4.3 6.9 6.5 4.8 9.2 4.8c1.2 0 2.3.5 3 1.4a3.9 3.9 0 0 1 3-1.4c2.7 0 4.8 2.1 4.8 5.3 0 5.5-7.7 10.1-7.7 10.1Z"
      fill={color}
    />
  ),
  mental_health: (color) => (
    <>
      <Circle cx="12" cy="7.5" r="4" fill={color} />
      <Path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" fill={color} />
    </>
  ),
  property_damage: (color) => (
    <>
      <Path d="M3 11.8 12 4l9 7.8V20a1 1 0 0 1-1 1h-4.5v-6h-7v6H4a1 1 0 0 1-1-1v-8.2Z" fill={color} />
      <Path d="M9.8 5.8 11.8 8.6 10 10.4 12.2 13" stroke={CUT} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  other: (color) => (
    <>
      <Path d="M12 2.5 22.5 21H1.5L12 2.5Z" fill={color} />
      <Rect x="10.9" y="9" width="2.2" height="6.2" rx="1.1" fill={CUT} />
      <Circle cx="12" cy="17.6" r="1.3" fill={CUT} />
    </>
  )
}

export default function EmergencyTypeIcon({ type, size = 26, color = '#f4f6fb' }) {
  const render = ICONS[type] || ICONS.other
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(color)}
    </Svg>
  )
}
