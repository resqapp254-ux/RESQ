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
        <g className="resq-globe-orbit"><path d="M0 -13 L12 -7 V4 C12 15 6 21 0 25 C-6 21 -12 15 -12 4 V-7 Z" fill="#ff2b2b" stroke="#fff" strokeOpacity="0.3"><animateMotion dur="22s" repeatCount="indefinite" path="M 720,400 A 320,150 0 1,1 719.99,400 A 320,150 0 1,1 720,400" /></path></g>
      </svg>
    </div>
  )
}