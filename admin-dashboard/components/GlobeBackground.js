'use client'

export default function GlobeBackground() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: 'var(--resq-bg-deep)' }}>
      <svg viewBox="0 0 800 800" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', opacity: 0.55 }}>
        <defs>
          <radialGradient id="globeFill" cx="35%" cy="30%" r="75%"><stop offset="0%" stopColor="#182142" /><stop offset="60%" stopColor="#0b1024" /><stop offset="100%" stopColor="#05070d" /></radialGradient>
          <radialGradient id="globeGlow"><stop offset="60%" stopColor="#cc0000" stopOpacity="0" /><stop offset="85%" stopColor="#cc0000" stopOpacity="0.12" /><stop offset="100%" stopColor="#cc0000" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="400" cy="400" r="320" fill="url(#globeGlow)" />
        <circle cx="400" cy="400" r="220" fill="url(#globeFill)" stroke="#35d0e8" strokeOpacity="0.25" />
        <ellipse cx="400" cy="400" rx="220" ry="60" fill="none" stroke="#35d0e8" strokeOpacity="0.18" />
        <ellipse cx="400" cy="400" rx="220" ry="110" fill="none" stroke="#35d0e8" strokeOpacity="0.14" />
        <ellipse cx="400" cy="400" rx="220" ry="160" fill="none" stroke="#35d0e8" strokeOpacity="0.1" />
        <ellipse cx="400" cy="400" rx="60" ry="220" fill="none" stroke="#35d0e8" strokeOpacity="0.16" />
        <ellipse cx="400" cy="400" rx="140" ry="220" fill="none" stroke="#35d0e8" strokeOpacity="0.12" />
        <circle cx="400" cy="400" r="220" fill="none" stroke="#35d0e8" strokeOpacity="0.22" strokeWidth="1.2" />
        <circle className="resq-globe-pulse" cx="400" cy="400" r="220" fill="none" stroke="#ff2b2b" strokeWidth="1.5"><animate attributeName="r" values="220;340;220" dur="6s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.35;0;0.35" dur="6s" repeatCount="indefinite" /></circle>
        <ellipse cx="400" cy="400" rx="320" ry="150" fill="none" stroke="#fff" strokeOpacity="0.06" />
        <g className="resq-globe-orbit">
          <g>
            <animateMotion dur="22s" repeatCount="indefinite" path="M 720,400 A 320,150 0 1,1 719.99,400 A 320,150 0 1,1 720,400" />
            <path
              d="M0,-34 L31,-17 V10 C31,42 16,58 0,69 C-16,58 -31,42 -31,10 V-17 Z"
              fill="#cc0000"
              stroke="#fff"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <g transform="translate(0 8) scale(0.5) translate(-70 -63.5)">
              <path
                d="M47 82V45h18c12 0 19 6 19 16 0 7-4 12-11 14l12 14H74L63 77h-5v5H47Zm11-14h7c5 0 8-2 8-7s-3-7-8-7h-7v14Z"
                fill="#fff"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}