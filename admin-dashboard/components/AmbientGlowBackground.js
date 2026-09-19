'use client'

// Soft, slowly-pulsing radial glows — a transparent accent layer meant
// to sit ON TOP of GlobeBackground + RadarSweepBackground, not replace
// them. No solid background of its own (that was the original mistake:
// an opaque bg-zinc-950 here blotted out the globe/rings underneath),
// so it only adds two drifting color pulses over whatever's already
// rendered behind it. Pure Tailwind + CSS (the pulse keyframe is
// declared in tailwind.config.js as `animate-ambient-glow`).

export default function AmbientGlowBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden" style={{ zIndex: 0, pointerEvents: 'none' }}>
      <div
        className="animate-ambient-glow absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(204,0,0,0.55) 0%, rgba(204,0,0,0) 70%)' }}
      />
      <div
        className="animate-ambient-glow absolute right-1/4 bottom-1/4 h-[420px] w-[420px] translate-x-1/3 translate-y-1/3 rounded-full opacity-30 blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(53,208,232,0.45) 0%, rgba(53,208,232,0) 70%)', animationDelay: '2.5s' }}
      />
    </div>
  )
}
