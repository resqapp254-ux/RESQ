'use client'

// A sweeping radar layer meant to sit alongside GlobeBackground —
// together they read as "emergency command hub" rather than a plain
// dark page. Pure CSS (conic-gradient sweep + repeating rings), no
// SVG needed, cheap enough to run behind an auth form.

const BLIPS = [
  { top: '28%', left: '64%', delay: '0s' },
  { top: '58%', left: '34%', delay: '0.8s' },
  { top: '70%', left: '68%', delay: '1.6s' },
  { top: '38%', left: '22%', delay: '2.4s' }
]

export default function RadarSweepBackground() {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div className="resq-radar-rings" />
      <div className="resq-radar-sweep" />
      {BLIPS.map((b, i) => (
        <div key={i} className="resq-radar-blip" style={{ top: b.top, left: b.left, animationDelay: b.delay }} />
      ))}
    </div>
  )
}
