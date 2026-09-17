// app/super-admin/animation-lab/page.js
//
// A preview of every animated element used across the app, built from
// the exact same components and CSS classes as the live pages — not a
// separate reimplementation, so there is nothing here that can drift
// out of sync with what users actually see. Super admin only: this is
// a tuning tool, not something responders/users/institution admins
// need.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import GlobeBackground from '../../../components/GlobeBackground'
import GuardianShield from '../../../components/GuardianShield'
import HeartMonitorLine from '../../../components/HeartMonitorLine'
import LoadingScreen from '../../../components/LoadingScreen'

export default function AnimationLabPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [alert, setAlert] = useState(false)
  const [buildingCount, setBuildingCount] = useState(3)
  const [speed, setSpeed] = useState(1) // multiplies every animation-duration below

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace('/login')
      return
    }
    const { data, error } = await supabase.rpc('get_onboarding_status')
    if (error || data.role !== 'super_admin') {
      router.replace('/login')
      return
    }
    setAuthorized(true)
  }

  if (!authorized) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <div className="resq-content"><LoadingScreen label="Checking access…" /></div>
      </main>
    )
  }

  // Overrides just animation-duration on the real classes — the name,
  // timing-function, and iteration-count still come from
  // resq-design-system.css, so a speed of 1 looks pixel-identical to
  // production.
  const speedStyle = (baseSeconds) => ({ animationDuration: `${baseSeconds / speed}s` })

  return (
    <main className={'resq-shell' + (alert ? ' resq-alert-shell' : '')}>
      <GlobeBackground />
      <div className="resq-content" style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
        <div className="resq-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <h1 className="resq-h1" style={{ fontSize: 26 }}>Animation Lab</h1>
          <Link href="/super-admin" className="resq-btn-secondary" style={{ textDecoration: 'none' }}>← Back to Dashboard</Link>
        </div>

        <div className="glass-card resq-fade-in resq-fade-in-2" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={alert} onChange={(e) => setAlert(e.target.checked)} />
            Simulate active emergency (alert state)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Institutions:
            <input type="range" min="1" max="8" value={buildingCount} onChange={(e) => setBuildingCount(Number(e.target.value))} />
            {buildingCount}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Speed:
            <input type="range" min="0.25" max="3" step="0.25" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            {speed}×
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <section className="glass-card resq-fade-in resq-fade-in-2">
            <h3 style={{ marginTop: 0 }}>SOS Trigger Button</h3>
            <div className="resq-trigger-wrap">
              <button className="resq-trigger-btn" style={speedStyle(1.8)}>SOS</button>
            </div>
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-2">
            <h3 style={{ marginTop: 0 }}>Guardian Shield</h3>
            <GuardianShield buildingCount={buildingCount} alert={alert} size={200} label={alert ? 'Responding to an emergency' : 'All clear'} />
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-3">
            <h3 style={{ marginTop: 0 }}>Heart Monitor</h3>
            <HeartMonitorLine alert={alert} label={alert ? 'Active emergency' : 'All clear'} />
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-3">
            <h3 style={{ marginTop: 0 }}>Live Indicator</h3>
            <p><span className="resq-live-dot" />Live realtime feed</p>
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-4">
            <h3 style={{ marginTop: 0 }}>Siren Banner</h3>
            <div className="resq-siren-banner" style={speedStyle(1.2)} role="alert">
              <span><strong>1</strong> active emergency requires attention</span>
            </div>
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-4">
            <h3 style={{ marginTop: 0 }}>Loading Mark</h3>
            <div className="resq-loading-mark" style={{ ...speedStyle(1.4), fontSize: 40 }}>🛡️</div>
          </section>
        </div>
      </div>
    </main>
  )
}
