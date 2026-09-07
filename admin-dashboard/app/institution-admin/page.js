// app/institution-admin/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

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

  return (
    <div className="resq-shell">
      <EmergencyPulseBackground />
      <div className="resq-content" style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1>{institution?.name}</h1>
        <button onClick={handleLogout} style={{ padding: '10px 16px' }}>Log Out</button>
      </div>
      <p style={{ color: '#666' }}>
        Institution Code: <strong style={{ fontFamily: 'monospace' }}>{institution?.institution_code}</strong>
        {' — '}Status: <strong style={{ color: '#1a7f37' }}>{institution?.status}</strong>
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, margin: '24px 0' }}>
        <section className="glass-card" style={{ minHeight: 180 }}>
          <h2 style={{ marginTop: 0 }}>Active Emergencies</h2>
          {activeEmergencies.length === 0 && <p className="resq-subtle">No active emergencies.</p>}
          {activeEmergencies.map((emergency) => (
            <div key={emergency.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{emergency.emergency_type || 'Emergency'}</strong>
                  <p className="resq-subtle" style={{ margin: '4px 0' }}>{new Date(emergency.created_at).toLocaleString()}</p>
                </div>
                <span style={{ color: emergency.claimed_by ? '#ff8080' : '#35d0e8' }}>
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
            <div key={emergency.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <strong>{emergency.emergency_type || 'Emergency'}</strong>
              <p className="resq-subtle" style={{ margin: '4px 0' }}>
                Resolved {emergency.resolved_at ? new Date(emergency.resolved_at).toLocaleString() : 'recently'}
              </p>
            </div>
          ))}
        </section>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 12px' }}>
        <h2 style={{ margin: 0 }}>Responders</h2>
        <Link href="/institution-admin/add-responder" style={{ padding: '10px 16px', background: '#cc0000', color: 'white', textDecoration: 'none', borderRadius: 6 }}>
          + Add Responder
        </Link>
      </div>

      {responders.length === 0 && <p>No responders yet. Add your first one above.</p>}

      {responders.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Email</th>
              <th style={{ padding: 10 }}>Phone</th>
              <th style={{ padding: 10 }}>Upcoming Shifts</th>
            </tr>
          </thead>
          <tbody>
            {responders.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>{r.full_name}</td>
                <td style={{ padding: 10 }}>{r.email}</td>
                <td style={{ padding: 10 }}>{r.phone}</td>
                <td style={{ padding: 10 }}>
                  {(shiftsByResponder[r.id] || []).length === 0 && <span style={{ color: '#999' }}>None scheduled</span>}
                  {(shiftsByResponder[r.id] || []).map((s) => (
                    <div key={s.id} style={{ fontSize: 13 }}>
                      {new Date(s.shift_start).toLocaleString()} → {new Date(s.shift_end).toLocaleString()}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {responders.length > 0 && (
        <div style={{ background: '#f7f7f7', padding: 20, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Schedule a Shift</h3>
          <form onSubmit={handleAddShift} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label>Responder</label><br />
              <select
                value={shiftForm.responderId}
                onChange={(e) => setShiftForm({ ...shiftForm, responderId: e.target.value })}
                style={{ padding: 8 }}
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
                type="datetime-local"
                value={shiftForm.start}
                onChange={(e) => setShiftForm({ ...shiftForm, start: e.target.value })}
                style={{ padding: 8 }}
              />
            </div>
            <div>
              <label>Shift End</label><br />
              <input
                type="datetime-local"
                value={shiftForm.end}
                onChange={(e) => setShiftForm({ ...shiftForm, end: e.target.value })}
                style={{ padding: 8 }}
              />
            </div>
            <button type="submit" disabled={savingShift} style={{ padding: '10px 16px' }}>
              {savingShift ? 'Saving...' : 'Add Shift'}
            </button>
          </form>
        </div>
      )}
      </div>
    </div>
  )
}
