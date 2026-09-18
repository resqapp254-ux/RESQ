'use client'

// A classic heart silhouette (not a rounded emoji-style blob) with a
// soft highlight for depth.
const HEART_PATH =
  'M0,26 C-22,10 -34,-4 -34,-20 C-34,-32 -25,-40 -14,-40 C-6,-40 -1,-35 0,-30 ' +
  'C1,-35 6,-40 14,-40 C25,-40 34,-32 34,-20 C34,-4 22,10 0,26 Z'

// Isometric block — front, side, and roof faces — so it reads as a 3D
// building instead of a flat rectangle with dots on it.
function Building({ x, scale = 1 }) {
  const W = 15 // half-width of the front face
  const H = 56 // height of the front face
  const DX = 11 // depth offset (side/roof)
  const DY = 7

  return (
    <g transform={`translate(${x} 0) scale(${scale})`}>
      {/* Roof */}
      <path
        d={`M${-W},${-H} L${W},${-H} L${W + DX},${-H - DY} L${-W + DX},${-H - DY} Z`}
        fill="rgba(120,170,220,0.32)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.75"
      />
      {/* Side face — darker, gives the depth cue */}
      <path
        d={`M${W},${-H} L${W},0 L${W + DX},${-DY} L${W + DX},${-H - DY} Z`}
        fill="rgba(20,32,58,0.9)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.75"
      />
      {/* Front face */}
      <rect x={-W} y={-H} width={W * 2} height={H} fill="rgba(40,58,96,0.9)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      {/* Windows, lit */}
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <rect x={-W + 4} y={-H + 8 + row * 12} width={8} height={8} rx="1" fill="rgba(120,220,240,0.85)" />
          <rect x={2} y={-H + 8 + row * 12} width={8} height={8} rx="1" fill="rgba(120,220,240,0.55)" />
        </g>
      ))}
    </g>
  )
}

export default function GuardianShield({ buildingCount = 1, alert = false, size = 220, label }) {
  const shown = Math.min(buildingCount, 5)
  const extra = buildingCount - shown
  const spacing = 58
  const startX = -((shown - 1) * spacing) / 2

  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        viewBox="0 0 400 260"
        width={size}
        height={(size * 260) / 400}
        role="img"
        aria-label={alert ? 'Shield protecting institutions, actively responding to an emergency' : 'Shield protecting institutions, all clear'}
        className={'resq-guardian' + (alert ? ' resq-guardian-alert' : '')}
      >
        <defs>
          <radialGradient id="guardianHeartGlow" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor={alert ? '#ffffff' : '#ff5252'} />
            <stop offset="100%" stopColor={alert ? '#ffe5e5' : '#cc0000'} />
          </radialGradient>
        </defs>

        <g transform="translate(200 175)">
          {Array.from({ length: shown }).map((_, i) => (
            <Building key={i} x={startX + i * spacing} />
          ))}
          {extra > 0 && (
            <text x={startX + shown * spacing - 10} y="-20" fill="rgba(255,255,255,0.7)" fontSize="16" fontWeight="700">
              +{extra}
            </text>
          )}
        </g>
        <g transform="translate(200 110)">
          {/* Dual radar shockwave rings — the heart/face never leaves
              this same group, so it's always visually "within the
              rings" regardless of which state is showing. */}
          <circle className="resq-guardian-ring" r="76" fill="none" stroke={alert ? '#ff2b2b' : '#35d0e8'} strokeWidth="2.5" />
          <circle className="resq-guardian-ring" r="76" fill="none" stroke={alert ? '#ff2b2b' : '#35d0e8'} strokeWidth="1.5" style={{ animationDelay: '0.6s' }} />

          {/* Slowly spins only while idle; holds still the instant an
              emergency starts, so the heartbeat reads clearly. transform-box:
              fill-box anchors both the spin and the heartbeat scale to this
              shield's own center — the earlier bug (heart appearing to fly
              off toward a corner) was the browser instead using the whole
              SVG viewBox's center as the transform origin. */}
          <g className={'resq-guardian-core' + (alert ? '' : ' resq-guardian-idle-spin')} style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}>
            {/* Primary Aegis Shield */}
            <path
              d="M0,-88 L52,-46 V12 C52,82 27,118 0,140 C-27,118 -52,82 -52,12 V-46 Z"
              fill={alert ? 'rgba(204,0,0,0.94)' : 'rgba(16,26,48,0.94)'}
              stroke={alert ? '#ff8080' : '#35d0e8'}
              strokeWidth="2.5"
              filter="drop-shadow(0 4px 16px rgba(0,0,0,0.6))"
            />

            {/* Idle: a plain smiling face, no heartbeat. */}
            {!alert && (
              <g className="resq-guardian-face">
                <circle cx="-18" cy="0" r="6" fill="#ffffff" />
                <circle cx="18" cy="0" r="6" fill="#ffffff" />
                <path d="M-20,26 Q0,50 20,26" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />
              </g>
            )}

            {/* Alert: the smile is replaced by the shield's own beating heart. */}
            {alert && (
              <g
                className="resq-guardian-heart"
                transform="translate(0 20) scale(1.15)"
                style={{ transformBox: 'fill-box', transformOrigin: '50% 50%' }}
              >
                <path
                  d={HEART_PATH}
                  fill="url(#guardianHeartGlow)"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  filter="drop-shadow(0 0 10px #ffffff)"
                />
              </g>
            )}
          </g>
        </g>
      </svg>
      {label && <p className="resq-subtle" style={{ marginTop: 8, fontWeight: 600 }}>{label}</p>}
    </div>
  )
}
