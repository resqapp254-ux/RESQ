'use client'

// A pure shield, nothing else — no arms, no legs, no humanoid body at
// all, specifically so it can never read as a devil/horned figure the
// way the limbed ResqHero mascot could in its "wave" pose. Just a
// smiling shield that gently rocks side to side, like a nod goodbye.

export default function GoodbyeShield({ size = 110, rocking = false }) {
  return (
    <svg viewBox="-45 -55 90 115" width={size} height={size * 1.25} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="goodbyeShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff2b2b" />
          <stop offset="100%" stopColor="#a80000" />
        </linearGradient>
      </defs>
      <g style={rocking ? { transformOrigin: '0px 50px', animation: 'resq-goodbye-rock 1.1s ease-in-out infinite' } : undefined}>
        <path
          d="M0,-45 C18,-45 30,-36 30,-20 L30,-2 C30,20 20,42 0,58 C-20,42 -30,20 -30,-2 L-30,-20 C-30,-36 -18,-45 0,-45 Z"
          fill="url(#goodbyeShield)"
          stroke="#fff"
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        <circle cx="-11" cy="-10" r="2.6" fill="#ffffff" />
        <circle cx="11" cy="-10" r="2.6" fill="#ffffff" />
        <path d="M-11,6 Q0,14 11,6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>
      <style>{`
        @keyframes resq-goodbye-rock {
          0%, 100% { transform: rotate(-7deg); }
          50% { transform: rotate(7deg); }
        }
      `}</style>
    </svg>
  )
}
