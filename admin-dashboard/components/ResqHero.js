'use client'

// The RESQ guardian: a shield-headed figure in a cape, built from the
// same flat-vector language as the rest of the app (no photorealistic
// rendering — clean geometric shapes, gradients, and glow, matching
// the shield/globe/guardian components already in use).
//
// `pose` changes the limb geometry:
//   'fly'   — arms back, streamlined (orbiting/scanning the globe)
//   'wave'  — one arm raised (sign-out goodbye)
// `scanning` swaps the face for glowing scan-beam eyes.

const POSES = {
  fly: {
    armLeft: 'M-14,-6 C-30,-2 -38,6 -34,16',
    armRight: 'M14,-6 C30,-2 38,6 34,16',
    legLeft: 'M-8,34 C-16,46 -14,58 -6,64',
    legRight: 'M8,34 C16,46 14,58 6,64'
  },
  wave: {
    armLeft: 'M-14,-6 C-26,-16 -30,-30 -22,-40',
    armRight: 'M14,-6 C24,2 30,10 28,18',
    legLeft: 'M-8,34 C-12,46 -10,56 -4,60',
    legRight: 'M8,34 C12,46 10,56 4,60'
  }
}

export default function ResqHero({ pose = 'fly', scanning = false, size = 90 }) {
  const p = POSES[pose] || POSES.fly

  return (
    <svg viewBox="-60 -70 120 150" width={size} height={size * 1.25} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="heroSuit" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e2a56" />
          <stop offset="100%" stopColor="#0d142d" />
        </linearGradient>
        <linearGradient id="heroCape" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2b2b" />
          <stop offset="100%" stopColor="#8a0000" />
        </linearGradient>
      </defs>

      {/* Cape */}
      <path d="M-10,-28 C-40,-10 -46,30 -20,54 C-24,26 -18,-4 -10,-28 Z" fill="url(#heroCape)" opacity="0.92" />
      <path d="M10,-28 C40,-10 46,30 20,54 C24,26 18,-4 10,-28 Z" fill="url(#heroCape)" opacity="0.8" />

      {/* Legs */}
      <path d={p.legLeft} stroke="#0d142d" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d={p.legRight} stroke="#0d142d" strokeWidth="11" strokeLinecap="round" fill="none" />

      {/* Body */}
      <path d="M-18,-30 C-18,-42 18,-42 18,-30 L16,20 C16,32 -16,32 -18,20 Z" fill="url(#heroSuit)" stroke="#35d0e8" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Chest emblem — small shield */}
      <path d="M0,-14 L8,-9 V2 C8,10 4,15 0,18 C-4,15 -8,10 -8,2 V-9 Z" fill="#cc0000" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.75" />

      {/* Arms */}
      <path d={p.armLeft} stroke="url(#heroSuit)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d={p.armRight} stroke="url(#heroSuit)" strokeWidth="10" strokeLinecap="round" fill="none" />

      {/* Head — the shield, smiling, with optional scanning eye-beams */}
      {/* Rounded, friendly head — a pointed shield-chin plus glowing red
          eyes read as devilish, so this is softer, the scan is a cyan
          downward sweep (like a visor looking at what's below it, not
          horns), and the smile stays visible even while scanning. */}
      <g transform="translate(0 -42)">
        <path d="M0,-22 C13,-22 20,-14 20,-3 C20,16 12,30 0,38 C-12,30 -20,16 -20,-3 C-20,-14 -13,-22 0,-22 Z" fill="#cc0000" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
        {scanning && (
          <>
            <line x1="-7" y1="3" x2="-16" y2="20" stroke="#35d0e8" strokeWidth="2" strokeLinecap="round" opacity="0.85">
              <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.7s" repeatCount="indefinite" />
            </line>
            <line x1="7" y1="3" x2="16" y2="20" stroke="#35d0e8" strokeWidth="2" strokeLinecap="round" opacity="0.85">
              <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.7s" repeatCount="indefinite" />
            </line>
          </>
        )}
        <circle cx="-7" cy="3" r="2.4" fill="#ffffff" />
        <circle cx="7" cy="3" r="2.4" fill="#ffffff" />
        <path d="M-7,14 Q0,20 7,14" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  )
}
