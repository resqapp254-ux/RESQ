'use client'

// Aceternity-style dark backdrop: a solid near-black base with one or
// two soft, slowly-pulsing radial glows behind the content. Pure
// Tailwind + CSS (the pulse keyframe is declared in
// tailwind.config.js as `animate-ambient-glow`) — no canvas, no SVG,
// cheap to render behind a form.

export default function AmbientGlowBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-zinc-950" style={{ zIndex: 0 }}>
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
