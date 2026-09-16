'use client'

export default function GlobeBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'var(--resq-bg-deep, #05070d)'
      }}
    >
      <svg
        viewBox="0 0 800 800"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id="globeFill" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1e2a56" />
            <stop offset="55%" stopColor="#0d142d" />
            <stop offset="100%" stopColor="#05070d" />
          </radialGradient>
          <radialGradient id="globeAtmosphere" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#35d0e8" stopOpacity="0" />
            <stop offset="92%" stopColor="#35d0e8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#35d0e8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="beaconGlow">
            <stop offset="0%" stopColor="#ff2b2b" stopOpacity="0.25" />
            <stop offset="65%" stopColor="#cc0000" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#cc0000" stopOpacity="0" />
          </radialGradient>
          <filter id="shieldBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer ambient radar beacon */}
        <circle cx="400" cy="400" r="340" fill="url(#beaconGlow)" />

        {/* Planet sphere and atmosphere */}
        <circle cx="400" cy="400" r="220" fill="url(#globeFill)" stroke="#35d0e8" strokeOpacity="0.3" strokeWidth="1.2" />
        <circle cx="400" cy="400" r="228" fill="url(#globeAtmosphere)" />

        {/* Latitudes & Longitudes */}
        <ellipse cx="400" cy="400" rx="220" ry="55" fill="none" stroke="#35d0e8" strokeOpacity="0.2" strokeWidth="1" />
        <ellipse cx="400" cy="400" rx="220" ry="110" fill="none" stroke="#35d0e8" strokeOpacity="0.16" strokeWidth="1" />
        <ellipse cx="400" cy="400" rx="220" ry="165" fill="none" stroke="#35d0e8" strokeOpacity="0.12" strokeWidth="1" />
        <ellipse cx="400" cy="400" rx="65" ry="220" fill="none" stroke="#35d0e8" strokeOpacity="0.18" strokeWidth="1" />
        <ellipse cx="400" cy="400" rx="145" ry="220" fill="none" stroke="#35d0e8" strokeOpacity="0.14" strokeWidth="1" />

        {/* Pulsing telemetry echo wave */}
        <circle cx="400" cy="400" r="220" fill="none" stroke="#ff2b2b" strokeWidth="1.5">
          <animate attributeName="r" values="220;350" dur="4.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0" dur="4.5s" repeatCount="indefinite" />
        </circle>

        {/* Orbital Track Guide */}
        <ellipse cx="400" cy="400" rx="320" ry="145" fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="6 8" />

        {/* Orbiting Guard Shield with 3D Depth Scaling & Attenuation */}
        <g>
          <animateMotion
            dur="18s"
            repeatCount="indefinite"
            path="M 720,400 A 320,145 0 1,1 719.99,400 A 320,145 0 1,1 720,400"
          />
          {/* Depth effect: scale and opacity keyframes along orbit path */}
          <g filter="url(#shieldBloom)">
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1.25; 1; 0.75; 1; 1.25"
              dur="18s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1; 0.85; 0.4; 0.85; 1"
              dur="18s"
              repeatCount="indefinite"
            />
            <path
              d="M0,-34 L31,-17 V10 C31,42 16,58 0,69 C-16,58 -31,42 -31,10 V-17 Z"
              fill="#cc0000"
              stroke="#ffffff"
              strokeOpacity="0.6"
              strokeWidth="2"
            />
            {/* Inner Emblem Mark */}
            <g transform="translate(0 8) scale(0.5) translate(-70 -63.5)">
              <path
                d="M47 82V45h18c12 0 19 6 19 16 0 7-4 12-11 14l12 14H74L63 77h-5v5H47Zm11-14h7c5 0 8-2 8-7s-3-7-8-7h-7v14Z"
                fill="#ffffff"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
