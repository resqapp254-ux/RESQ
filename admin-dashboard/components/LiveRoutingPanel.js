'use client'

// A dark glass overlay panel that staggers in each active emergency's
// route (where it was triggered → which institution it was routed
// to) as it loads. Entry animation follows the spring-like overshoot
// curve documented in CLAUDE.md — transform/opacity only, each row
// delayed slightly behind the last for a staggered reveal.

export default function LiveRoutingPanel({ routes, loading }) {
  return (
    <div
      style={{
        background: 'rgba(5,7,13,0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--resq-glass-border)',
        borderRadius: 14,
        padding: 16,
        minHeight: 80
      }}
    >
      {loading && <p className="resq-subtle" style={{ margin: 0 }}>Loading active routes…</p>}
      {!loading && routes.length === 0 && <p className="resq-subtle" style={{ margin: 0 }}>No active emergencies right now.</p>}
      {routes.map((r, i) => (
        <div
          key={r.id}
          className="resq-route-row"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: i === routes.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
            animationDelay: `${i * 60}ms`
          }}
        >
          <div>
            <strong style={{ textTransform: 'capitalize' }}>{(r.emergency_type || 'other').replace('_', ' ')}</strong>
            <p className="resq-subtle" style={{ margin: '2px 0 0', fontSize: 12 }}>
              Triggered {new Date(r.created_at).toLocaleTimeString()}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--resq-cyan)', fontSize: 13 }}>→</span>
            <span className={r.claimed_by ? 'resq-badge resq-badge-claimed' : 'resq-badge resq-badge-open'} style={{ fontSize: 11 }}>
              {r.institutionName || 'Unknown institution'}
            </span>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes resq-route-row-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .resq-route-row {
          animation: resq-route-row-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  )
}
