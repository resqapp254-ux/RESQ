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
          'radial-gradient(circle at 18% 22%, rgba(204, 0, 0, 0.12), transparent 36%), radial-gradient(circle at 82% 28%, rgba(53, 208, 232, 0.1), transparent 32%), linear-gradient(180deg, #04060c 0%, #070d1a 100%)'
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block', opacity: 0.65 }}
      >
        <defs>
          <linearGradient id="hudStroke" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#35d0e8" stopOpacity="0.1" />
            <stop offset="35%" stopColor="#35d0e8" stopOpacity="0.3" />
            <stop offset="48%" stopColor="#ff2b2b" stopOpacity="0.95" />
            <stop offset="52%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="56%" stopColor="#ff2b2b" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#35d0e8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#35d0e8" stopOpacity="0.1" />
          </linearGradient>

          <filter id="hudBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Precision HUD Grid */}
        <g opacity="0.22">
          <path d="M0,440 H1600" stroke="#35d0e8" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M0,220 H1600 M0,660 H1600" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <path d="M260,0 V900 M800,0 V900 M1340,0 V900" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </g>

        {/* Real-time telemetry waveform */}
        <g filter="url(#hudBloom)">
          <path
            d="M-100,440 L80,440 L120,440 L140,360 L160,520 L180,440 L220,440 L260,440 L300,440 L340,440 L380,440 L420,440 L450,440 L470,300 L500,580 L530,440 L570,440 L610,440 L650,440 L690,440 L730,440 L770,440 L810,440 L840,440 L860,380 L890,500 L920,440 L960,440 L1000,440 L1040,440 L1080,440 L1120,440 L1160,440 L1200,440 L1230,440 L1250,320 L1280,560 L1310,440 L1350,440 L1390,440 L1430,440 L1470,440 L1510,440 L1550,440 L1590,440 L1630,440 L1670,440"
            stroke="url(#hudStroke)"
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Tactical Defense Node Indicator */}
        <g transform="translate(1360 200)">
          <circle r="92" cx="0" cy="0" fill="none" stroke="rgba(53,208,232,0.22)" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle r="80" cx="0" cy="0" fill="none" stroke="#ff2b2b" strokeWidth="1.5" opacity="0.6">
            <animate attributeName="r" values="70;96;70" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.1;0.7" dur="3s" repeatCount="indefinite" />
          </circle>
          <path d="M0,-58 L34,-30 V8 C34,54 18,78 0,92 C-18,78 -34,54 -34,8 V-30 Z" fill="rgba(204,0,0,0.92)" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />
          <path d="M-10,10 L-4,10 L0,-8 L8,26 L14,10 L18,10" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
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
