'use client'

// A branded loading state so no page ever shows a bare "Loading..."
// string on an otherwise blank background.

export default function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18
      }}
    >
      <div className="resq-loading-mark" aria-hidden="true">
        <svg viewBox="0 0 100 130" width="64" height="84">
          <path
            d="M50,4 L92,22 V58 C92,92 74,112 50,126 C26,112 8,92 8,58 V22 Z"
            fill="rgba(204,0,0,0.16)"
            stroke="var(--resq-red-bright)"
            strokeWidth="3"
          />
          <path
            d="M28,64 L42,64 L48,44 L58,84 L66,64 L80,64"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="resq-subtle" style={{ fontSize: 14 }}>{label}</p>
    </div>
  )
}
