'use client'

const HEART_PATH = 'M0,10 C0,-6 -18,-16 -18,-2 C-18,10 -6,18 0,28 C6,18 18,10 18,-2 C18,-16 0,-6 0,10 Z'

function Building({ x, scale = 1 }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`}>
      <rect x="-22" y="-10" width="44" height="70" rx="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
      <rect x="-14" y="0" width="10" height="12" rx="1.5" fill="rgba(53,208,232,0.35)" />
      <rect x="4" y="0" width="10" height="12" rx="1.5" fill="rgba(53,208,232,0.35)" />
      <rect x="-14" y="20" width="10" height="12" rx="1.5" fill="rgba(53,208,232,0.35)" />
      <rect x="4" y="20" width="10" height="12" rx="1.5" fill="rgba(53,208,232,0.35)" />
      <rect x="-6" y="42" width="12" height="18" rx="1" fill="rgba(255,255,255,0.15)" />
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
        <g transform="translate(200 165)">
          {Array.from({ length: shown }).map((_, i) => (
            <Building key={i} x={startX + i * spacing} />
          ))}
          {extra > 0 && (
            <text x={startX + shown * spacing - 10} y="10" fill="rgba(255,255,255,0.6)" fontSize="16" fontWeight="700">
              +{extra}
            </text>
          )}
        </g>
        <g transform="translate(200 110)">
          {/* Dual radar shockwave rings */}
          <circle className="resq-guardian-ring" r="76" fill="none" stroke={alert ? '#ff2b2b' : '#35d0e8'} strokeWidth="2.5" />
          <circle className="resq-guardian-ring" r="76" fill="none" stroke={alert ? '#ff2b2b' : '#35d0e8'} strokeWidth="1.5" style={{ animationDelay: '0.6s' }} />

          {/* Primary Aegis Shield */}
          <path
            d="M0,-88 L52,-46 V12 C52,82 27,118 0,140 C-27,118 -52,82 -52,12 V-46 Z"
            fill={alert ? 'rgba(204,0,0,0.94)' : 'rgba(16,26,48,0.94)'}
            stroke={alert ? '#ff8080' : '#35d0e8'}
            strokeWidth="2.5"
            filter="drop-shadow(0 4px 16px rgba(0,0,0,0.6))"
          />

          {/* Beating Heart Core */}
          <g className="resq-guardian-heart" transform="translate(0 20) scale(1.6)">
            <path d={HEART_PATH} fill={alert ? '#ffffff' : '#ff2b2b'} filter={alert ? 'drop-shadow(0 0 6px #ffffff)' : 'drop-shadow(0 0 4px rgba(255,43,43,0.8))'} />
          </g>
        </g>
      </svg>
      {label && <p className="resq-subtle" style={{ marginTop: 8, fontWeight: 600 }}>{label}</p>}
    </div>
  )
}
