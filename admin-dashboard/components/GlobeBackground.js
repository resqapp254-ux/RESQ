'use client'

// The RESQ shield as a guardian satellite orbiting a ringed planet.
// Three independent rotations run at once so it never reads as a
// static illustration: the sphere's own grid spins on its axis, the
// ring's tilt slowly breathes open and closed, and the whole
// planet+ring assembly gently rocks — on top of the shield's orbit
// around the entire system.

export default function GlobeBackground() {
  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: 'var(--resq-bg-deep, #05070d)' }}
    >
      <svg viewBox="0 0 800 800" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
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
            <stop offset="0%" stopColor="#ff2b2b" stopOpacity="0.2" />
            <stop offset="65%" stopColor="#cc0000" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#cc0000" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ringBand" x1="0%" x2="100%">
            <stop offset="0%" stopColor="#35d0e8" stopOpacity="0.08" />
            <stop offset="20%" stopColor="#cdf5fb" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#35d0e8" stopOpacity="0.8" />
            <stop offset="80%" stopColor="#cdf5fb" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#35d0e8" stopOpacity="0.08" />
          </linearGradient>
          <filter id="shieldBloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="400" cy="400" r="370" fill="url(#beaconGlow)" />

        {/* The whole planet+ring assembly rocks a few degrees each way —
            a second, independent rotation layered on top of the
            sphere's own spin and the ring's tilt-breathing below. */}
        <g transform="translate(400 400)">
          <animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur="14s" repeatCount="indefinite" additive="sum" />

          {/* Ring — back half, behind the sphere */}
          <g>
            <ellipse rx="330" ry="76" fill="none" stroke="url(#ringBand)" strokeWidth="15">
              <animate attributeName="ry" values="76;46;76" dur="10s" repeatCount="indefinite" />
            </ellipse>
            <ellipse rx="360" ry="84" fill="none" stroke="#cdf5fb" strokeOpacity="0.3" strokeWidth="1.5">
              <animate attributeName="ry" values="84;51;84" dur="10s" repeatCount="indefinite" />
            </ellipse>
          </g>

          {/* Sphere + atmosphere, grid spinning on its own axis */}
          <circle r="185" fill="url(#globeFill)" stroke="#35d0e8" strokeOpacity="0.3" strokeWidth="1.2" />
          <circle r="192" fill="url(#globeAtmosphere)" />
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="36s" repeatCount="indefinite" />
            <ellipse rx="185" ry="46" fill="none" stroke="#35d0e8" strokeOpacity="0.2" />
            <ellipse rx="185" ry="93" fill="none" stroke="#35d0e8" strokeOpacity="0.16" />
            <ellipse rx="185" ry="138" fill="none" stroke="#35d0e8" strokeOpacity="0.12" />
            <ellipse rx="54" ry="185" fill="none" stroke="#35d0e8" strokeOpacity="0.18" />
            <ellipse rx="122" ry="185" fill="none" stroke="#35d0e8" strokeOpacity="0.14" />
          </g>

          {/* Ring — front half, in front of the sphere (the classic
              Saturn crossing look), tilt-breathing in lockstep with
              the back half above. */}
          <path fill="none" stroke="url(#ringBand)" strokeWidth="15">
            <animate
              attributeName="d"
              values="M -330,0 A 330,76 0 0,0 330,0;M -330,0 A 330,46 0 0,0 330,0;M -330,0 A 330,76 0 0,0 330,0"
              dur="10s"
              repeatCount="indefinite"
            />
          </path>

          {/* Dust motes drifting around the ring for extra close-in motion */}
          <circle r="2.6" fill="#eafeff">
            <animateMotion dur="10s" repeatCount="indefinite" path="M -330,0 A 330,76 0 1,1 -329.9,0 A 330,76 0 1,1 -330,0" />
          </circle>
          <circle r="2" fill="#9fe8f2">
            <animateMotion dur="10s" repeatCount="indefinite" begin="-4s" path="M -330,0 A 330,76 0 1,1 -329.9,0 A 330,76 0 1,1 -330,0" />
          </circle>

          {/* Telemetry echo pulse */}
          <circle r="185" fill="none" stroke="#ff2b2b" strokeWidth="1.5">
            <animate attributeName="r" values="185;320" dur="4.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.55;0" dur="4.5s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Orbit guide + the shield itself, sized to clear the rings entirely */}
        <ellipse cx="400" cy="400" rx="420" ry="185" fill="none" stroke="#ffffff" strokeOpacity="0.07" strokeDasharray="6 8" />
        <g>
          <animateMotion dur="20s" repeatCount="indefinite" path="M 820,400 A 420,185 0 1,1 819.99,400 A 420,185 0 1,1 820,400" />
          <g filter="url(#shieldBloom)">
            <animateTransform attributeName="transform" type="scale" values="1.25; 1; 0.75; 1; 1.25" dur="20s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1; 0.85; 0.4; 0.85; 1" dur="20s" repeatCount="indefinite" />
            <path
              d="M0,-34 L31,-17 V10 C31,42 16,58 0,69 C-16,58 -31,42 -31,10 V-17 Z"
              fill="#cc0000"
              stroke="#ffffff"
              strokeOpacity="0.6"
              strokeWidth="2"
            />
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
