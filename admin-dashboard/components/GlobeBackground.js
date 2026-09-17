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
          <clipPath id="sphereClip">
            <circle r="185" />
          </clipPath>
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

          {/* A city living inside the globe — institutions being
              watched over, not an empty planet. Clipped to the sphere
              and co-rotating slowly with it. */}
          <g clipPath="url(#sphereClip)" opacity="0.85">
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="36s" repeatCount="indefinite" />
              <rect x="-150" y="60" width="300" height="140" fill="#050a18" />
              {[
                [-140, 30, 22], [-108, 45, 30], [-72, 20, 45], [-40, 55, 25], [-10, 10, 55],
                [22, 40, 32], [56, 25, 42], [90, 50, 26], [122, 15, 48]
              ].map(([bx, h, w], i) => (
                <g key={i}>
                  <rect x={bx} y={90 - h} width={w} height={h + 20} fill="#0d1a30" stroke="#35d0e8" strokeOpacity="0.25" strokeWidth="0.6" />
                  {Array.from({ length: Math.max(1, Math.floor(h / 10)) }).map((_, wi) => (
                    <rect key={wi} x={bx + 4} y={94 - h + wi * 10} width={w - 8} height={4} fill="#ffd76a" opacity={(i + wi) % 3 === 0 ? 0.9 : 0.35} />
                  ))}
                </g>
              ))}
            </g>
          </g>

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

        {/* Orbit guide + the RESQ guardian, tracing the ring itself
            (not a wide separate lap around it) at an unhurried pace —
            a slow, deliberate patrol, not a frantic circuit. */}
        <ellipse cx="400" cy="400" rx="345" ry="130" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeDasharray="6 8" />
        <g>
          <animateMotion dur="42s" repeatCount="indefinite" path="M 745,400 A 345,130 0 1,1 744.99,400 A 345,130 0 1,1 745,400" />
          <g filter="url(#shieldBloom)">
            <animateTransform attributeName="transform" type="scale" values="1.05; 0.9; 0.75; 0.9; 1.05" dur="42s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1; 0.85; 0.55; 0.85; 1" dur="42s" repeatCount="indefinite" />

            {/* Cape */}
            <path d="M-8,-22 C-32,-8 -37,24 -16,43 C-19,21 -14,-3 -8,-22 Z" fill="#8a0000" opacity="0.9" />
            <path d="M8,-22 C32,-8 37,24 16,43 C19,21 14,-3 8,-22 Z" fill="#8a0000" opacity="0.78" />
            {/* Legs, streamlined for flight */}
            <path d="M-6,27 C-13,37 -11,46 -5,51" stroke="#0d142d" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M6,27 C13,37 11,46 5,51" stroke="#0d142d" strokeWidth="9" strokeLinecap="round" fill="none" />
            {/* Body */}
            <path d="M-14,-24 C-14,-34 14,-34 14,-24 L13,16 C13,26 -13,26 -14,16 Z" fill="#1e2a56" stroke="#35d0e8" strokeOpacity="0.4" strokeWidth="1.2" />
            <path d="M0,-11 L6,-7 V2 C6,8 3,12 0,14 C-3,12 -6,8 -6,2 V-7 Z" fill="#cc0000" />
            {/* Arms, swept back */}
            <path d="M-11,-5 C-24,-2 -30,5 -27,13" stroke="#1e2a56" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M11,-5 C24,-2 30,5 27,13" stroke="#1e2a56" strokeWidth="8" strokeLinecap="round" fill="none" />
            {/* Head — rounded (not the pointed shield-chin that read as
                devilish), friendly and always smiling. The scan is a
                soft cyan sweep pointed down at the planet, like a
                scanner visor — not red beams shooting up like horns. */}
            <g transform="translate(0 -34)">
              <path d="M0,-17 C10,-17 15,-11 15,-2 C15,12 9,23 0,29 C-9,23 -15,12 -15,-2 C-15,-11 -10,-17 0,-17 Z" fill="#cc0000" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="1.2" />
              <line x1="-6" y1="2" x2="-13" y2="16" stroke="#35d0e8" strokeWidth="1.6" strokeLinecap="round">
                <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.7s" repeatCount="indefinite" />
              </line>
              <line x1="6" y1="2" x2="13" y2="16" stroke="#35d0e8" strokeWidth="1.6" strokeLinecap="round">
                <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.7s" repeatCount="indefinite" />
              </line>
              <circle cx="-6" cy="2" r="2" fill="#ffffff" />
              <circle cx="6" cy="2" r="2" fill="#ffffff" />
              <path d="M-6,11 Q0,16 6,11" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
