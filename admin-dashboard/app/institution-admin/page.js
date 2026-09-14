// app/institution-admin/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'
import GuardianShield from '../../components/GuardianShield'
import HeartMonitorLine from '../../components/HeartMonitorLine'

export default function InstitutionAdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [institution, setInstitution] = useState(null)
  const [responders, setResponders] = useState([])
  const [shiftsByResponder, setShiftsByResponder] = useState({})
  const [activeEmergencies, setActiveEmergencies] = useState([])
  const [recentResolved, setRecentResolved] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // inline shift form state
  const [shiftForm, setShiftForm] = useState({ responderId: '', start: '', end: '' })
  const [savingShift, setSavingShift] = useState(false)

  const router = useRouter()

  useEffect(() => {
    checkAccessAndLoad()
  }, [])

  async function checkAccessAndLoad() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace('/login')
      return
    }

    const { data: statusData, error: statusError } = await supabase.rpc('get_onboarding_status')
    if (statusError || statusData.role !== 'institution_admin') {
      router.replace('/login')
      return
    }
    if (statusData.next_step === 'enter_verification_code') {
      router.replace('/institution-admin/verify')
      return
    }

    setAuthorized(true)
    await loadAll()
  }

  async function loadAll() {
    setLoading(true)

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single()

    const { data: inst, error: instError } = await supabase
      .from('institutions')
      .select('*')
      .eq('id', profile.institution_id)
      .single()

    if (instError) {
      setError(instError.message)
      setLoading(false)
      return
    }
    setInstitution(inst)

    const { data: resp, error: respError } = await supabase
      .from('profiles')
      .select('*')
      .eq('institution_id', profile.institution_id)
      .eq('role', 'responder')
      .order('created_at', { ascending: false })

    if (respError) {
      setError(respError.message)
    } else {
      setResponders(resp)
      await loadShifts(resp.map((r) => r.id))
    }

    await loadEmergencies()
    setLoading(false)
  }

  async function loadShifts(responderIds) {
    if (!responderIds.length) return
    const { data: shifts, error: shiftError } = await supabase
      .from('responder_shifts')
      .select('*')
      .in('responder_id', responderIds)
      .order('shift_start', { ascending: true })

    if (shiftError) return

    const grouped = {}
    shifts.forEach((s) => {
      if (!grouped[s.responder_id]) grouped[s.responder_id] = []
      grouped[s.responder_id].push(s)
    })
    setShiftsByResponder(grouped)
  }

  async function loadEmergencies() {
    if (!institution) return

    const { data: openEmergencies, error: openError } = await supabase
      .from('emergencies')
      .select('id, emergency_type, status, claimed_by, created_at')
      .eq('institution_id', institution.id)
      .in('status', ['open', 'claimed'])
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: resolvedEmergencies, error: resolvedError } = await supabase
      .from('emergencies')
      .select('id, emergency_type, status, claimed_by, created_at, resolved_at')
      .eq('institution_id', institution.id)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(10)

    if (openError || resolvedError) {
      setError(openError?.message || resolvedError?.message || 'Failed to load emergencies')
      return
    }

    setActiveEmergencies(openEmergencies || [])
    setRecentResolved(resolvedEmergencies || [])
  }

  async function handleAddShift(e) {
    e.preventDefault()
    if (!shiftForm.responderId || !shiftForm.start || !shiftForm.end) {
      alert('Please fill in responder, start, and end time.')
      return
    }
    setSavingShift(true)

    const { error: insertError } = await supabase.from('responder_shifts').insert({
      institution_id: institution.id,
      responder_id: shiftForm.responderId,
      shift_start: new Date(shiftForm.start).toISOString(),
      shift_end: new Date(shiftForm.end).toISOString()
    })

    setSavingShift(false)

    if (insertError) {
      alert('Failed to save shift: ' + insertError.message)
      return
    }

    setShiftForm({ responderId: '', start: '', end: '' })
    await loadShifts(responders.map((r) => r.id))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (!authorized || loading) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading...</div>
  }

  const hasActiveAlert = activeEmergencies.some((e) => e.status !== 'resolved')

  return (
    <div className={'resq-shell' + (hasActiveAlert ? ' resq-alert-shell' : '')}>
      <EmergencyPulseBackground />
      <div className="resq-content" style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
      <div className="resq-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="resq-h1">{institution?.name}</h1>
        <button className="resq-btn-secondary" onClick={handleLogout}>Log Out</button>
      </div>
      <p className="resq-fade-in resq-subtle">
        Institution Code: <strong style={{ fontFamily: 'monospace', color: 'var(--resq-text-primary)' }}>{institution?.institution_code}</strong>
        {' — '}Status: <strong className="resq-green">{institution?.status}</strong>
      </p>

      {error && <p style={{ color: '#ff8080' }}>{error}</p>}

      <div className="resq-fade-in resq-fade-in-2" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, margin: '20px 0' }}>
        <GuardianShield buildingCount={1} alert={hasActiveAlert} size={140} label={hasActiveAlert ? 'Responding' : 'Protecting your institution'} />
        <div style={{ flex: '1 1 260px', minWidth: 260 }}>
          <HeartMonitorLine alert={hasActiveAlert} label={hasActiveAlert ? 'Active emergency' : 'All clear'} />
        </div>
      </div>

      <div className="resq-two-col resq-fade-in resq-fade-in-2" style={{ gridTemplateColumns: '1.4fr 1fr', margin: '24px 0' }}>
        <section className="glass-card" style={{ minHeight: 180 }}>
          <h2 style={{ marginTop: 0 }}>
            {activeEmergencies.length > 0 && <span className="resq-live-dot" aria-hidden="true" />}
            Active Emergencies
          </h2>
          {activeEmergencies.length === 0 && <p className="resq-subtle">No active emergencies.</p>}
          {activeEmergencies.map((emergency) => (
            <div key={emergency.id} className="resq-row-interactive" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{emergency.emergency_type || 'Emergency'}</strong>
                  <p className="resq-subtle" style={{ margin: '4px 0' }}>{new Date(emergency.created_at).toLocaleString()}</p>
                </div>
                <span className={emergency.claimed_by ? 'resq-badge resq-badge-claimed' : 'resq-badge resq-badge-open'}>
                  {emergency.claimed_by ? 'Claimed' : 'Open'}
                </span>
              </div>
            </div>
          ))}
        </section>
        <section className="glass-card" style={{ minHeight: 180 }}>
          <h2 style={{ marginTop: 0 }}>Recently Resolved</h2>
        <p className="resq-subtle" style={{ marginTop: 0 }}>Weekly report emails go to this institution admin with resolution details.</p>
          {recentResolved.length === 0 && <p className="resq-subtle">No resolved emergencies yet.</p>}
          {recentResolved.map((emergency) => (
            <div key={emergency.id} className="resq-row-interactive" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <strong>{emergency.emergency_type || 'Emergency'}</strong>
              <p className="resq-subtle" style={{ margin: '4px 0' }}>
                Resolved {emergency.resolved_at ? new Date(emergency.resolved_at).toLocaleString() : 'recently'}
              </p>
            </div>
          ))}
        </section>
      </div>

      <div className="resq-fade-in resq-fade-in-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 12px' }}>
        <h2 style={{ margin: 0 }}>Responders</h2>
        <Link href="/institution-admin/add-responder" className="resq-btn-primary" style={{ textDecoration: 'none' }}>
          + Add Responder
        </Link>
      </div>

      {responders.length === 0 && <p className="resq-subtle resq-fade-in resq-fade-in-3">No responders yet. Add your first one above.</p>}

      {responders.length > 0 && (
        <section className="glass-card resq-fade-in resq-fade-in-3" style={{ marginBottom: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Email</th>
              <th style={{ padding: 10 }}>Phone</th>
              <th style={{ padding: 10 }}>Upcoming Shifts</th>
            </tr>
          </thead>
          <tbody>
            {responders.map((r) => (
              <tr key={r.id} className="resq-row-interactive">
                <td style={{ padding: 10 }}>{r.full_name}</td>
                <td style={{ padding: 10 }}>{r.email}</td>
                <td style={{ padding: 10 }}>{r.phone}</td>
                <td style={{ padding: 10 }}>
                  {(shiftsByResponder[r.id] || []).length === 0 && <span className="resq-subtle">None scheduled</span>}
                  {(shiftsByResponder[r.id] || []).map((s) => (
                    <div key={s.id} className="resq-subtle" style={{ fontSize: 13 }}>
                      {new Date(s.shift_start).toLocaleString()} → {new Date(s.shift_end).toLocaleString()}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </section>
      )}

      {responders.length > 0 && (
        <section className="glass-card resq-fade-in resq-fade-in-3">
          <h3 style={{ marginTop: 0 }}>Schedule a Shift</h3>
          <form onSubmit={handleAddShift} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label>Responder</label><br />
              <select
                className="resq-input"
                value={shiftForm.responderId}
                onChange={(e) => setShiftForm({ ...shiftForm, responderId: e.target.value })}
                style={{ marginTop: 4 }}
              >
                <option value="">Select...</option>
                {responders.map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Shift Start</label><br />
              <input
                className="resq-input"
                type="datetime-local"
                value={shiftForm.start}
                onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })}
                style={{ marginTop: 4 }}
              />
            </div>
            <div>
              <label>Shift End</label><br />
              <input
                className="resq-input"
                type="datetime-local"
                value={shiftForm.end}
                onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })}
                style={{ marginTop: 4 }}
              />
            </div>
            <button className="resq-btn-primary" type="submit" disabled={savingShift}>
              {savingShift ? 'Saving...' : 'Add Shift'}
            </button>
          </form>
        </section>
      )}
      </div>
    </div>
  )
}
