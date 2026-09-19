'use client'

// Accessible SVG bar chart for incident counts by type, with each bar
// staggering in on mount (transform/opacity only — see CLAUDE.md).
// Deliberately plain SVG + CSS, no charting library, to match the
// rest of the app's dependency-light styling approach.

import { EMERGENCY_TYPE_COLORS } from '../lib/emergencyTypeColors'

export default function IncidentChart({ data, title }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const chartHeight = 140
  const barWidth = 36
  const gap = 18
  const width = data.length * (barWidth + gap) + gap

  return (
    <div>
      {title && <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>}
      {data.length === 0 ? (
        <p className="resq-subtle">No incidents recorded yet.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${chartHeight + 40}`}
          width="100%"
          height={chartHeight + 40}
          role="img"
          aria-label={`Bar chart of incidents by type: ${data.map((d) => `${d.label} ${d.count}`).join(', ')}`}
        >
          {data.map((d, i) => {
            const barHeight = (d.count / max) * chartHeight
            const x = gap + i * (barWidth + gap)
            const color = EMERGENCY_TYPE_COLORS[d.key] || 'var(--resq-cyan)'
            return (
              <g key={d.key} className="resq-incident-bar" style={{ animationDelay: `${i * 70}ms` }}>
                <rect
                  x={x}
                  y={chartHeight - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={color}
                  opacity={0.85}
                />
                <text x={x + barWidth / 2} y={chartHeight - barHeight - 6} textAnchor="middle" fontSize="12" fill="var(--resq-text-primary)">
                  {d.count}
                </text>
                <text x={x + barWidth / 2} y={chartHeight + 18} textAnchor="middle" fontSize="10" fill="var(--resq-text-secondary)" style={{ textTransform: 'capitalize' }}>
                  {d.label.length > 8 ? d.label.slice(0, 7) + '…' : d.label}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      <style>{`
        @keyframes resq-incident-bar-in {
          0% { opacity: 0; transform: scaleY(0.3) translateY(20px); }
          100% { opacity: 1; transform: scaleY(1) translateY(0); }
        }
        .resq-incident-bar {
          transform-box: fill-box;
          transform-origin: bottom;
          animation: resq-incident-bar-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </div>
  )
}
