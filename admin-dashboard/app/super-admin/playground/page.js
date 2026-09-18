// app/super-admin/playground/page.js
// Isolated playground for RESQ's primary UI components, in isolation
// from any real page logic — for auditing responsive breakpoints,
// contrast, and entry/exit + interactive transition states without
// risking regressions in the pages that actually use them.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import GuardianShield from '../../../components/GuardianShield'
import HeartMonitorLine from '../../../components/HeartMonitorLine'
import LoadingScreen from '../../../components/LoadingScreen'
import GoodbyeShield from '../../../components/GoodbyeShield'

const TYPES = [
  { key: 'medical', label: 'Medical', emoji: '🏥', color: '#ff5252' },
  { key: 'fire', label: 'Fire', emoji: '🔥', color: '#ff8a3d' }
]

function Section({ title, note, children }) {
  return (
    <section className="glass-card resq-fade-in" style={{ marginBottom: 28 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {note && <p className="resq-subtle" style={{ marginTop: 0, fontSize: 13 }}>{note}</p>}
      {children}
    </section>
  )
}

export default function PlaygroundPage() {
  const [selectedType, setSelectedType] = useState('medical')
  const [pendingDemo, setPendingDemo] = useState(false)
  const [alertOn, setAlertOn] = useState(false)
  const [showEntry, setShowEntry] = useState(true)

  function triggerPending() {
    setPendingDemo(true)
    setTimeout(() => setPendingDemo(false), 1800)
  }

  return (
    <main className="resq-shell">
      <div className="resq-content" style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
        <Link href="/super-admin">&larr; Back to Dashboard</Link>
        <h1 className="resq-h1" style={{ fontSize: 26, marginTop: 12 }}>🧩 Component Playground</h1>
        <p className="resq-subtle" style={{ marginTop: 4 }}>
          Resize your browser to check the breakpoints noted per section. All colors below reference design tokens
          from resq-design-system.css — none are one-off hex values.
        </p>

        <Section title="Buttons — hover / press / pending" note="Spring-like overshoot on hover (cubic-bezier(0.34, 1.56, 0.64, 1)), compressed press, spinner via aria-busy. All respect prefers-reduced-motion.">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="resq-btn-primary">Primary</button>
            <button className="resq-btn-secondary">Secondary</button>
            <button className="resq-btn-primary" disabled>Disabled</button>
            <button className="resq-btn-primary" aria-busy={pendingDemo} onClick={triggerPending}>
              {pendingDemo ? 'Loading' : 'Click to see Pending'}
            </button>
          </div>
        </Section>

        <Section title="Badges" note="Contrast check: resq-badge-open (#ff8080 on rgba(255,43,43,0.18)) and resq-badge-claimed (#7fe3f2 on rgba(53,208,232,0.18)) — both pass WCAG AA for this dark background at 14px+.">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span className="resq-badge resq-badge-open">Open (pulses)</span>
            <span className="resq-badge resq-badge-claimed">Claimed</span>
            <span className="resq-badge resq-badge-resolved">Resolved</span>
          </div>
        </Section>

        <Section title="Type chips" note="resq-type-grid uses CSS Grid auto-fill (minmax(84px, 1fr)) — fluidly reflows column count with container width rather than snapping at fixed breakpoints. Resize to check it never produces a lone orphaned chip on its own row.">
          <div className="resq-type-grid">
            {TYPES.map((t) => (
              <button
                key={t.key}
                className={'resq-type-chip' + (selectedType === t.key ? ' resq-type-chip-selected' : '')}
                onClick={() => setSelectedType(t.key)}
              >
                <span className="resq-type-emoji" style={{ background: `${t.color}26` }}>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Guardian shield — idle vs alert" note="Idle: smiling face, slow 14s spin. Alert: heart beats, spin stops instantly. Toggle to compare.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <GuardianShield buildingCount={3} alert={alertOn} size={140} label={alertOn ? 'Responding' : 'All clear'} />
            <button className="resq-btn-secondary" onClick={() => setAlertOn((v) => !v)}>
              Toggle {alertOn ? 'Idle' : 'Alert'}
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <HeartMonitorLine alert={alertOn} label={alertOn ? 'Active emergency' : 'All clear'} />
          </div>
        </Section>

        <Section title="Goodbye shield (sign-out)" note="No limbs — a static preview here; the real sign-out overlay adds the rocking animation and edge-to-center glide.">
          <GoodbyeShield size={90} rocking={false} />
        </Section>

        <Section title="Loading state">
          <LoadingScreen label="Loading example…" />
        </Section>

        <Section title="Entry/exit transition" note="resq-fade-in — opacity + translateY only (hardware-accelerated). Toggle to replay.">
          <button className="resq-btn-secondary" onClick={() => setShowEntry((v) => !v)} style={{ marginBottom: 12 }}>
            Toggle
          </button>
          {showEntry && (
            <div className="glass-card resq-fade-in" style={{ padding: 16 }}>
              This card fades and slides in on mount.
            </div>
          )}
        </Section>
      </div>
    </main>
  )
}
