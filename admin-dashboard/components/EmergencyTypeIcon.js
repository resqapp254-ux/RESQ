// components/EmergencyTypeIcon.js
//
// Replaces emoji for the emergency-type picker. Solid, bold silhouette
// pictograms — closer to ISO/road-sign iconography than thin line
// icons — so the shape itself carries the meaning at a glance,
// independent of being able to read the label next to it.
//
// `cut` paths are drawn in the page's own near-black background color
// to punch simple details (an exclamation mark, a crack, wheel wells)
// out of an otherwise solid silhouette, rather than relying on stroke
// outlines that read as thin/abstract at small sizes.

const CUT = '#05070d'

const ICONS = {
  // Red-cross-style plus in a circle — the single most universally
  // recognized "medical help" pictogram there is.
  medical: (color) => (
    <>
      <circle cx="12" cy="12" r="10" fill={color} />
      <path d="M10.3 5.5h3.4v4.8h4.8v3.4h-4.8v4.8h-3.4v-4.8H5.5v-3.4h4.8V5.5Z" fill={CUT} />
    </>
  ),
  // Solid flame.
  fire: (color) => (
    <path
      d="M12 1.5c1.3 3.3-2.7 4.6-3 8a3 3 0 0 0 6 0c0-.8-.4-1.4-.4-1.4 2.2 1.4 3.9 3.8 3.9 6.4a6.5 6.5 0 0 1-13 0c0-4.9 2.5-7.6 6.5-13Z"
      fill={color}
    />
  ),
  // Solid car body with cut-out wheel wells and a small impact burst.
  accident: (color) => (
    <>
      <path
        d="M3 14.2a1 1 0 0 1 1-1h1.1l1.2-3.7A2 2 0 0 1 8.2 8h7.6a2 2 0 0 1 1.9 1.5l1.2 3.7H20a1 1 0 0 1 1 1V17a1 1 0 0 1-1 1h-1.1a2.1 2.1 0 0 1-4.1.3H9.2A2.1 2.1 0 0 1 5.1 18H4a1 1 0 0 1-1-1v-2.8Z"
        fill={color}
      />
      <circle cx="7.3" cy="18" r="1.9" fill={CUT} />
      <circle cx="16.7" cy="18" r="1.9" fill={CUT} />
      <path d="M12 1.8l1.4 2.4-2.4 1.3 2.4 1.3-1.4 2.4" stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Solid shield — visually distinct from the medical cross, unlike
  // the two previously sharing the same shield outline.
  security: (color) => (
    <path d="M12 2.2l7.5 2.8v6c0 5.2-3.3 9-7.5 11-4.2-2-7.5-5.8-7.5-11v-6L12 2.2Z" fill={color} />
  ),
  // Solid heart — deliberately gentle and non-graphic for a sensitive
  // category, and a genuinely universal "care/support" symbol.
  gbv: (color) => (
    <path
      d="M12 20.2s-7.7-4.6-7.7-10.1C4.3 6.9 6.5 4.8 9.2 4.8c1.2 0 2.3.5 3 1.4a3.9 3.9 0 0 1 3-1.4c2.7 0 4.8 2.1 4.8 5.3 0 5.5-7.7 10.1-7.7 10.1Z"
      fill={color}
    />
  ),
  // A simple person silhouette — head + shoulders — kept distinct
  // from gbv's heart shape.
  mental_health: (color) => (
    <>
      <circle cx="12" cy="7.5" r="4" fill={color} />
      <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" fill={color} />
    </>
  ),
  // Solid house with a lightning-crack cut through the roof.
  property_damage: (color) => (
    <>
      <path d="M3 11.8 12 4l9 7.8V20a1 1 0 0 1-1 1h-4.5v-6h-7v6H4a1 1 0 0 1-1-1v-8.2Z" fill={color} />
      <path d="M9.8 5.8 11.8 8.6 10 10.4 12.2 13" stroke={CUT} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Solid warning triangle with a cut-out exclamation mark — the
  // standard ISO "general hazard" pictogram.
  other: (color) => (
    <>
      <path d="M12 2.5 22.5 21H1.5L12 2.5Z" fill={color} />
      <rect x="10.9" y="9" width="2.2" height="6.2" rx="1.1" fill={CUT} />
      <circle cx="12" cy="17.6" r="1.3" fill={CUT} />
    </>
  )
}

export default function EmergencyTypeIcon({ type, size = 26, color = '#f4f6fb' }) {
  const render = ICONS[type] || ICONS.other
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {render(color)}
    </svg>
  )
}
