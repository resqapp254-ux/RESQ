'use client'

// A genuinely live-scrolling telemetry line — the previous version drew
// one fixed jagged path with no motion at all, which read as a static
// image no matter how sharp the styling was. This tiles the same
// waveform twice back to back and scrolls the whole thing continuously
// (the same technique HeartMonitorLine uses), plus a bright trace-head
// dot riding the line like an oscilloscope beam.

const WAVE = 'M0,440 L80,440 L120,440 L140,360 L160,520 L180,440 L220,440 L260,440 L300,440 L340,440 ' +
  'L380,440 L420,440 L450,440 L470,300 L500,580 L530,440 L570,440 L610,440 L650,440 L690,440 ' +
  'L730,440 L770,440 L800,440'

export default function EmergencyPulseBackground({ alert = false }) {
  const traceColor = alert ? '#ff2b2b' : '#35d0e8'

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 18% 22%, rgba(204, 0, 0, 0.12), transparent 36%), radial-gradient(circle at 82% 28%, rgba(53, 208, 232, 0.1), transparent 32%), linear-gradient(180deg, #04060c 0%, #070d1a 100%)'
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block', opacity: 0.65 }}
      >
        <defs>
          <linearGradient id="hudStroke" x1="0%" x2="100%">
            <stop offset="0%" stopColor={traceColor} stopOpacity="0.05" />
            <stop offset="80%" stopColor={traceColor} stopOpacity="0.05" />
            <stop offset="92%" stopColor={traceColor} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
          </linearGradient>
          <filter id="hudBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Precision HUD Grid */}
        <g opacity="0.22">
          <path d="M0,440 H1600" stroke={traceColor} strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M0,220 H1600 M0,660 H1600" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <path d="M260,0 V900 M800,0 V900 M1340,0 V900" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </g>

        {/* Live-scrolling telemetry trace — one wave tiled twice (0-800,
            800-1600), scrolled left by exactly one tile width so the
            loop is seamless. */}
        <g filter="url(#hudBloom)">
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -800 0"
              dur={alert ? '2.2s' : '5s'}
              repeatCount="indefinite"
            />
            <path d={WAVE} stroke="url(#hudStroke)" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={WAVE} transform="translate(800 0)" stroke="url(#hudStroke)" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={WAVE} transform="translate(1600 0)" stroke="url(#hudStroke)" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {/* Tactical Defense Node Indicator */}
        <g transform="translate(1360 200)">
          <circle r="92" cx="0" cy="0" fill="none" stroke="rgba(53,208,232,0.22)" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle r="80" cx="0" cy="0" fill="none" stroke="#ff2b2b" strokeWidth="1.5" opacity="0.6">
            <animate attributeName="r" values="70;96;70" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0.1;0.7" dur="3s" repeatCount="indefinite" />
          </circle>
          <path d="M0,-58 L34,-30 V8 C34,54 18,78 0,92 C-18,78 -34,54 -34,8 V-30 Z" fill="rgba(204,0,0,0.92)" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />
          <path d="M-10,10 L-4,10 L0,-8 L8,26 L14,10 L18,10" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  )
}
