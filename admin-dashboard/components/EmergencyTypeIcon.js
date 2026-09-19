// components/EmergencyTypeIcon.js
//
// Replaces emoji for the emergency-type picker — emoji render
// differently (or not at all) across devices/fonts and don't always
// read clearly at a glance in a stressful moment. These are simple,
// consistent line icons, one per type, same stroke weight throughout.

const ICON_PATHS = {
  // Medical cross in a rounded shield-like outline.
  medical: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  // A flame.
  fire: (
    <path d="M12 2c1 3-3 4-3 7a3 3 0 0 0 6 0c0-1-1-2-1-2 2 1 3 3 3 5a5 5 0 0 1-10 0c0-4 2-6 5-10Z" />
  ),
  // A car, side-on (box body + cabin + wheels), with a small impact
  // burst above it.
  accident: (
    <>
      <rect x="3" y="12.5" width="18" height="5" rx="2" />
      <rect x="7" y="7.5" width="10" height="5.5" rx="1.5" />
      <circle cx="7.5" cy="18.5" r="1.6" />
      <circle cx="16.5" cy="18.5" r="1.6" />
      <path d="M12 2l1 2-2 1 2 1-1 2" />
    </>
  ),
  // A shield — matches the security/protection motif used elsewhere.
  security: (
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
  ),
  // A supportive hand cupping a heart — deliberately gentle, not clinical.
  gbv: (
    <>
      <path d="M4 13c0 4 3.5 6.5 8 8 4.5-1.5 8-4 8-8V9l-3-2-3 2-2-2-2 2-3-2-3 2v4Z" />
      <path d="M12 21c4.5-1.5 8-4 8-8" opacity="0" />
    </>
  ),
  // A head with a small heart inside — calm, non-diagnostic.
  mental_health: (
    <>
      <circle cx="12" cy="10" r="7" />
      <path d="M12 13.2c-1-.9-2.6-1.7-2.6-3.1 0-.9.7-1.5 1.5-1.5.5 0 1 .2 1.1.7.1-.5.6-.7 1.1-.7.8 0 1.5.6 1.5 1.5 0 1.4-1.6 2.2-2.6 3.1Z" />
      <path d="M9 20.5c1-1.2 5-1.2 6 0" />
    </>
  ),
  // A house with a crack through the roof.
  property_damage: (
    <>
      <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8Z" />
      <path d="M10 5l2 3-1.5 1.5L12 12" />
    </>
  ),
  // Generic alert triangle for anything else.
  other: (
    <>
      <path d="M12 3l10 18H2L12 3Z" />
      <path d="M12 10v4M12 17.5v.01" />
    </>
  )
}

export default function EmergencyTypeIcon({ type, size = 26, color = 'currentColor', strokeWidth = 1.7 }) {
  const paths = ICON_PATHS[type] || ICON_PATHS.other
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  )
}
