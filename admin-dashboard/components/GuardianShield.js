'use client'

// A shield with a beating heart, standing guard in front of one or
// more institution buildings. Used on the institution-admin dashboard
// (one building) and the super-admin dashboard (many buildings, one
// big shield watching over all of them).

const HEART_PATH = 'M0,10 C0,-6 -18,-16 -18,-2 C-18,10 -6,18 0,28 C6,18 18,10 18,-2 C18,-16 0,-6 0,10 Z'

function Building({ x, scale = 1 }) {
  return (
    <g transform={`translate(${x} 0) scale(${scale})`}>
      <rect x="-22" y="-10" width="44" height="70" rx="2" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.14)" />
      <rect x="-14" y="0" width="10" height="12" fill="rgba(53,208,232,0.28)" />
      <rect x="4" y="0" width="10" height="12" fill="rgba(53,208,232,0.28)" />
      <rect x="-14" y="20" width="10" height="12" fill="rgba(53,208,232,0.28)" />
      <rect x="4" y="20" width="10" height="12" fill="rgba(53,208,232,0.28)" />
      <rect x="-6" y="42" width="12" height="18" fill="rgba(255,255,255,0.1)" />
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
            <text x={startX + shown * spacing - 10} y="10" fill="rgba(255,255,255,0.5)" fontSize="16" fontWeight="700">+{extra}</text>
          )}
        </g>

        <g transform="translate(200 110)">
          <circle className="resq-guardian-ring" r="78" fill="none" stroke={alert ? '#ff2b2b' : '#35d0e8'} strokeWidth="2" />
          <path
            d="M0,-88 L52,-46 V12 C52,82 27,118 0,140 C-27,118 -52,82 -52,12 V-46 Z"
            fill={alert ? 'rgba(204,0,0,0.92)' : 'rgba(20,32,58,0.92)'}
            stroke={alert ? '#ff8080' : '#35d0e8'}
            strokeWidth="2.5"
          />
          <g className="resq-guardian-heart" transform="translate(0 20) scale(1.6)">
            <path d={HEART_PATH} fill={alert ? '#fff' : '#ff2b2b'} />
          </g>
        </g>
      </svg>
      {label && <p className="resq-subtle" style={{ marginTop: 8 }}>{label}</p>}
    </div>
  )
}
