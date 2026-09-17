'use client'

// The RESQ shield emblem orbiting a ringed planet, on rails along the
// ring's own outer edge. Three independent rotations run at once so
// it never reads as a static illustration: the sphere's own grid
// spins on its axis, the ring's tilt slowly breathes open and closed,
// and the whole planet+ring assembly gently rocks — on top of the
// shield's strict orbit around the entire system.

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
          <linearGradient id="resqShieldRed" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff2b2b" />
            <stop offset="1" stopColor="#a80000" />
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
          {/* Hidden guide path the shield's animateMotion follows via
              <mpath> below — its `d` is keyframed with the exact same
              values/timing as the outer ring ellipse (rx 360, ry
              84<->51 every 10s), so the shield is mathematically glued
              to the ring's own edge at every instant, including while
              it breathes open and closed, instead of drifting off a
              static path that only matched the ring some of the time. */}
          <path id="shieldOrbitGuide" fill="none">
            <animate
              attributeName="d"
              values="M 360,0 A 360,84 0 1,1 359.99,0 A 360,84 0 1,1 360,0;M 360,0 A 360,51 0 1,1 359.99,0 A 360,51 0 1,1 360,0;M 360,0 A 360,84 0 1,1 359.99,0 A 360,84 0 1,1 360,0"
              dur="10s"
              repeatCount="indefinite"
            />
          </path>
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

          {/* A London-style skyline living inside the globe —
              institutions being watched over, not an empty planet.
              The buildings themselves never animate; they are fixed
              to the sphere's surface, so the only thing that moves
              them is the globe's own rotation (like fixed continents
              riding a spinning Earth). Isometric front/side/roof
              faces give them real depth instead of flat silhouettes,
              and the tallest tower flies a waving RESQ flag. */}
          <g clipPath="url(#sphereClip)" opacity="0.9">
            <g>
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="36s" repeatCount="indefinite" />
              <rect x="-150" y="60" width="300" height="140" fill="#050a18" />
              {[
                { x: -140, h: 34, w: 20 },
                { x: -112, h: 52, w: 26 },
                { x: -78, h: 30, w: 34 },
                { x: -38, h: 70, w: 20 },
                { x: -10, h: 24, w: 46 },
                { x: 42, h: 46, w: 28 },
                { x: 76, h: 62, w: 24 },
                { x: 106, h: 32, w: 40 }
              ].map((b, i) => {
                const baseY = 90
                const topY = baseY - b.h
                const depth = 9
                const windowRows = Math.max(1, Math.floor(b.h / 11))
                const windowCols = Math.max(1, Math.floor((b.w - depth) / 9))
                const flagX = b.x + b.w / 2
                return (
                  <g key={i}>
                    {/* side face — the iso depth that makes it read as a real block, not a flat card */}
                    <polygon
                      points={`${b.x + b.w},${topY} ${b.x + b.w + depth},${topY - depth} ${b.x + b.w + depth},${baseY - depth} ${b.x + b.w},${baseY}`}
                      fill="#060d1c" stroke="#35d0e8" strokeOpacity="0.2" strokeWidth="0.5"
                    />
                    {/* roof face */}
                    <polygon
                      points={`${b.x},${topY} ${b.x + depth},${topY - depth} ${b.x + b.w + depth},${topY - depth} ${b.x + b.w},${topY}`}
                      fill="#0f1c38" stroke="#35d0e8" strokeOpacity="0.25" strokeWidth="0.5"
                    />
                    {/* front face + lit windows */}
                    <rect x={b.x} y={topY} width={b.w} height={b.h} fill="#0d1a30" stroke="#35d0e8" strokeOpacity="0.3" strokeWidth="0.6" />
                    {Array.from({ length: windowRows }).map((_, ri) => (
                      Array.from({ length: windowCols }).map((_, ci) => (
                        <rect
                          key={ri + '-' + ci}
                          x={b.x + 3 + ci * 9}
                          y={topY + 4 + ri * 11}
                          width={4}
                          height={5}
                          fill="#ffd76a"
                          opacity={(i + ri + ci) % 3 === 0 ? 0.9 : 0.3}
                        />
                      ))
                    ))}
                    {/* RESQ flag, on its own post bolted to the tallest tower's roof — the flag cloth is the
                        only thing that moves on the whole skyline, fluttering independently of the globe's spin */}
                    {b.h >= 70 && (
                      <g>
                        <rect x={flagX - 1} y={topY - 24} width="2" height="24" fill="#cdf5fb" />
                        <path fill="url(#resqShieldRed)" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="0.6">
                          <animate
                            attributeName="d"
                            values={`M ${flagX + 1},${topY - 24} L ${flagX + 15},${topY - 22} L ${flagX + 11},${topY - 17} L ${flagX + 15},${topY - 12} L ${flagX + 1},${topY - 10} Z;M ${flagX + 1},${topY - 24} L ${flagX + 16},${topY - 23} L ${flagX + 10},${topY - 17} L ${flagX + 16},${topY - 11} L ${flagX + 1},${topY - 10} Z;M ${flagX + 1},${topY - 24} L ${flagX + 15},${topY - 22} L ${flagX + 11},${topY - 17} L ${flagX + 15},${topY - 12} L ${flagX + 1},${topY - 10} Z`}
                            dur="1.4s"
                            repeatCount="indefinite"
                          />
                        </path>
                      </g>
                    )}
                  </g>
                )
              })}
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

          {/* The RESQ shield — the real emblem itself, not a character —
              riding the ring's own outer edge via <mpath>, so it is
              glued to the ring at every instant of its breathing cycle.
              It lives inside this same rocking/translated group as the
              ring and globe, so it rocks in lockstep with them too,
              instead of a top-level path that stayed still while the
              ring tilted underneath it. */}
          <g>
            <animateMotion dur="42s" repeatCount="indefinite">
              <mpath href="#shieldOrbitGuide" />
            </animateMotion>
            <g filter="url(#shieldBloom)">
              <animateTransform attributeName="transform" type="scale" values="1.05; 0.9; 0.75; 0.9; 1.05" dur="42s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1; 0.85; 0.6; 0.85; 1" dur="42s" repeatCount="indefinite" />

              <circle r="24" fill="none" stroke="#35d0e8" strokeWidth="1.2">
                <animate attributeName="r" values="18;28;18" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.55;0;0.55" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <g transform="scale(0.75) translate(-64,-64)">
                <path d="M64 17 101 31v29c0 25-15 40-37 51C42 100 27 85 27 60V31l37-14Z" fill="url(#resqShieldRed)" stroke="#ffffff" strokeOpacity="0.85" strokeWidth="4" />
                <path d="M47 82V45h18c12 0 19 6 19 16 0 7-4 12-11 14l12 14H74L63 77h-5v5H47Zm11-14h7c5 0 8-2 8-7s-3-7-8-7h-7v14Z" fill="#ffffff" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
