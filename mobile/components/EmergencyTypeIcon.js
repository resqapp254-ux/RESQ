// components/EmergencyTypeIcon.js
//
// Mobile counterpart to admin-dashboard/components/EmergencyTypeIcon.js
// — same path data, same icon per type, kept in sync by hand (no
// shared package between the two apps). Emoji render inconsistently
// across devices/fonts and don't always read clearly in a stressful
// moment; these are simple, consistent line icons instead.

import React from 'react'
import Svg, { Path, Circle, Rect } from 'react-native-svg'

const ICONS = {
  medical: (props) => (
    <>
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" {...props} />
      <Path d="M12 8v8M8 12h8" {...props} />
    </>
  ),
  fire: (props) => (
    <Path d="M12 2c1 3-3 4-3 7a3 3 0 0 0 6 0c0-1-1-2-1-2 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 2-6 5-10Z" {...props} />
  ),
  accident: (props) => (
    <>
      <Rect x="3" y="12.5" width="18" height="5" rx="2" {...props} />
      <Rect x="7" y="7.5" width="10" height="5.5" rx="1.5" {...props} />
      <Circle cx="7.5" cy="18.5" r="1.6" {...props} />
      <Circle cx="16.5" cy="18.5" r="1.6" {...props} />
      <Path d="M12 2l1 2-2 1 2 1-1 2" {...props} />
    </>
  ),
  security: (props) => (
    <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" {...props} />
  ),
  gbv: (props) => (
    <Path d="M4 13c0 4 3.5 6.5 8 8 4.5-1.5 8-4 8-8V9l-3-2-3 2-2-2-2 2-3-2-3 2v4Z" {...props} />
  ),
  mental_health: (props) => (
    <>
      <Circle cx="12" cy="10" r="7" {...props} />
      <Path d="M12 13.2c-1-.9-2.6-1.7-2.6-3.1 0-.9.7-1.5 1.5-1.5.5 0 1 .2 1.1.7.1-.5.6-.7 1.1-.7.8 0 1.5.6 1.5 1.5 0 1.4-1.6 2.2-2.6 3.1Z" {...props} />
      <Path d="M9 20.5c1-1.2 5-1.2 6 0" {...props} />
    </>
  ),
  property_damage: (props) => (
    <>
      <Path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z" {...props} />
      <Path d="M10 5l2 3-1.5 1.5L12 12" {...props} />
    </>
  ),
  other: (props) => (
    <>
      <Path d="M12 3l10 18H2L12 3Z" {...props} />
      <Path d="M12 10v4M12 17.5v.01" {...props} />
    </>
  )
}

export default function EmergencyTypeIcon({ type, size = 26, color = '#f4f6fb', strokeWidth = 1.7 }) {
  const render = ICONS[type] || ICONS.other
  const shapeProps = { fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(shapeProps)}
    </Svg>
  )
}
