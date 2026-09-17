'use client'

// The RESQ guardian: the shield itself is the whole body, smiling —
// no separate humanoid head/torso/cape. Earlier versions put a
// pointed shield-chin "head" with glowing eye-beams on top of a
// human body, which read as a red, horned, devil-like figure; there's
// no head or cape left to cause that now, just the RESQ shield with a
// face on it and simple arms/legs.
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
        <linearGradient id="heroShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2b2b" />
          <stop offset="100%" stopColor="#a80000" />
        </linearGradient>
      </defs>

      {/* Legs */}
      <path d={p.legLeft} stroke="#0d142d" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d={p.legRight} stroke="#0d142d" strokeWidth="11" strokeLinecap="round" fill="none" />

      {/* Arms */}
      <path d={p.armLeft} stroke="url(#heroShield)" strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d={p.armRight} stroke="url(#heroShield)" strokeWidth="10" strokeLinecap="round" fill="none" />

      {/* The shield — the whole body, smiling. Scan is a cyan downward
          sweep (like a visor looking at what's below it), and the
          smile stays visible even while scanning. */}
      <path d="M0,-45 C18,-45 30,-36 30,-20 L30,-2 C30,20 20,42 0,58 C-20,42 -30,20 -30,-2 L-30,-20 C-30,-36 -18,-45 0,-45 Z" fill="url(#heroShield)" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.5" />
      {scanning && (
        <>
          <line x1="-11" y1="-10" x2="-22" y2="10" stroke="#35d0e8" strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.7s" repeatCount="indefinite" />
          </line>
          <line x1="11" y1="-10" x2="22" y2="10" stroke="#35d0e8" strokeWidth="2" strokeLinecap="round" opacity="0.85">
            <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.7s" repeatCount="indefinite" />
          </line>
        </>
      )}
      <circle cx="-11" cy="-10" r="2.6" fill="#ffffff" />
      <circle cx="11" cy="-10" r="2.6" fill="#ffffff" />
      <path d="M-11,6 Q0,14 11,6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  )
}
