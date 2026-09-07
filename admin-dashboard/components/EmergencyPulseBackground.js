'use client'

export default function EmergencyPulseBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 20% 20%, rgba(204, 0, 0, 0.08), transparent 30%), radial-gradient(circle at 80% 30%, rgba(53, 208, 232, 0.08), transparent 28%), linear-gradient(180deg, #05070d 0%, #08101f 100%)'
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', opacity: 0.5 }}>
        <defs>
          <linearGradient id="pulseStroke" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#35d0e8" stopOpacity="0.08" />
            <stop offset="40%" stopColor="#35d0e8" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#cc0000" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ff2b2b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#35d0e8" stopOpacity="0.08" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g opacity="0.18">
          <path d="M0,430 H1600" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
          <path d="M0,220 H1600" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
          <path d="M0,640 H1600" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
          <path d="M250,0 V900" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
          <path d="M800,0 V900" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
          <path d="M1350,0 V900" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
        </g>

        <g filter="url(#glow)">
          <path
            d="M-100,440 L80,440 L120,440 L140,360 L160,520 L180,440 L220,440 L260,440 L300,440 L340,440 L380,440 L420,440 L450,440 L470,300 L500,580 L530,440 L570,440 L610,440 L650,440 L690,440 L730,440 L770,440 L810,440 L840,440 L860,380 L890,500 L920,440 L960,440 L1000,440 L1040,440 L1080,440 L1120,440 L1160,440 L1200,440 L1230,440 L1250,320 L1280,560 L1310,440 L1350,440 L1390,440 L1430,440 L1470,440 L1510,440 L1550,440 L1590,440 L1630,440 L1670,440"
            stroke="url(#pulseStroke)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g transform="translate(1380 190)">
          <circle r="90" cx="0" cy="0" fill="none" stroke="rgba(53,208,232,0.18)" strokeWidth="2" />
          <path
            d="M0,-58 L34,-30 V8 C34,54 18,78 0,92 C-18,78 -34,54 -34,8 V-30 Z"
            fill="rgba(204,0,0,0.9)"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
          />
          <path
            d="M-10,10 L-4,10 L0,-8 L8,26 L14,10 L18,10"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle r="120" cx="0" cy="0" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </g>

        <g transform="translate(260 160)">
          <rect x="-70" y="-30" rx="16" ry="16" width="140" height="60" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
          <rect x="-55" y="-15" width="45" height="12" rx="6" fill="rgba(255,255,255,0.18)" />
          <rect x="-55" y="3" width="70" height="12" rx="6" fill="rgba(255,255,255,0.1)" />
          <circle cx="55" cy="0" r="10" fill="rgba(204,0,0,0.9)" />
        </g>

        <g transform="translate(1120 650)">
          <rect x="-100" y="-25" rx="14" ry="14" width="200" height="50" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
          <circle cx="-45" cy="0" r="12" fill="rgba(53,208,232,0.25)" />
          <circle cx="45" cy="0" r="12" fill="rgba(204,0,0,0.7)" />
          <path d="M-30,0 H30" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
        </g>
      </svg>
    </div>
  )
}
