// app/institution-admin/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'
import GuardianShield from '../../components/GuardianShield'
import HeartMonitorLine from '../../components/HeartMonitorLine'
import LoadingScreen from '../../components/LoadingScreen'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import SignOutOverlay from '../../components/SignOutOverlay'
import { pickMatchingServices } from '../../lib/serviceDispatch'

export default function InstitutionAdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [institution, setInstitution] = useState(null)
  const [responders, setResponders] = useState([])
  const [services, setServices] = useState([])
  const [shiftsByResponder, setShiftsByResponder] = useState({})
  const [activeEmergencies, setActiveEmergencies] = useState([])
  const [recentResolved, setRecentResolved] = useState([])
  const [unitStats, setUnitStats] = useState({})
  const [openReportCount, setOpenReportCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyResponderId, setBusyResponderId] = useState('')
  const [resolvingId, setResolvingId] = useState('')

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
    if (statusData.next_step === 'sign_contract') {
      router.replace('/institution-admin/contract')
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

    const { data: svc } = await supabase
      .from('institution_services')
      .select('id, name, service_type, lat, lng, handles_emergency_types, is_active')
      .eq('institution_id', profile.institution_id)
    setServices(svc || [])

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

    await loadEmergencies(inst)
    await loadUnitStats(inst, resp || [], svc || [])
    await loadOpenReportCount()
    setLoading(false)
  }

  const DELAYED_THRESHOLD_MS = 5 * 60 * 1000

  // Per-partner-unit summary: live emergency routed to it right now,
  // responders on duty, cases solved, and cases sitting unclaimed/
  // unresolved past a 5-minute threshold ("delayed").
  async function loadUnitStats(inst, resp, svc) {
    if (!inst || svc.length === 0) return

    const { data: resolvedForInst } = await supabase
      .from('emergencies')
      .select('claimed_by')
      .eq('institution_id', inst.id)
      .eq('status', 'resolved')

    const { data: liveForInst } = await supabase
      .from('emergencies')
      .select('id, emergency_type, status, lat, lng, created_at')
      .eq('institution_id', inst.id)
      .in('status', ['triggered', 'claimed', 'in_progress'])

    const solvedByResponder = {}
    for (const e of resolvedForInst || []) {
      if (!e.claimed_by) continue
      solvedByResponder[e.claimed_by] = (solvedByResponder[e.claimed_by] || 0) + 1
    }

    const now = Date.now()
    const stats = {}
    for (const unit of svc) {
      const unitResponders = resp.filter((r) => r.service_id === unit.id)
      const onDuty = unitResponders.filter((r) => r.is_active !== false).length
      const solved = unitResponders.reduce((sum, r) => sum + (solvedByResponder[r.id] || 0), 0)

      const liveMatched = (liveForInst || []).filter((e) => {
        const matching = pickMatchingServices(svc, { emergencyType: e.emergency_type, lat: e.lat, lng: e.lng })
        return matching.some((s) => s.id === unit.id)
      })
      const delayed = liveMatched.filter((e) => now - new Date(e.created_at).getTime() > DELAYED_THRESHOLD_MS).length

      stats[unit.id] = { live: liveMatched.length, onDuty, solved, delayed }
    }
    setUnitStats(stats)
  }

  async function loadOpenReportCount() {
    const { count } = await supabase
      .from('responder_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
    setOpenReportCount(count || 0)
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

  async function loadEmergencies(inst) {
    const targetInstitution = inst || institution
    if (!targetInstitution) return

    const { data: openEmergencies, error: openError } = await supabase
      .from('emergencies')
      .select('id, emergency_type, status, claimed_by, created_at, claimed_at, lat, lng, claimant:profiles!emergencies_claimed_by_fkey(full_name, phone, service_id)')
      .eq('institution_id', targetInstitution.id)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: resolvedEmergencies, error: resolvedError } = await supabase
      .from('emergencies')
      .select('id, emergency_type, status, claimed_by, created_at, resolved_at')
      .eq('institution_id', targetInstitution.id)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(10)

    if (openError || resolvedError) {
      setError(openError?.message || resolvedError?.message || 'Failed to load emergencies')
      return
    }

    setActiveEmergencies(openEmergencies || [])
    setRecentResolved(resolvedEmergencies || [])
    return openEmergencies || []
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

  async function resolveEmergency(emergency) {
    const confirmed = window.confirm(
      `Mark this ${emergency.emergency_type || 'emergency'} as resolved? Use this when the responder who claimed it ` +
      `(or should have) is unreachable or stuck — it closes the case immediately as the institution admin.`
    )
    if (!confirmed) return

    setResolvingId(emergency.id)
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch('/api/emergency/mark-resolved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (sessionData.session?.access_token || '') },
      body: JSON.stringify({ emergencyId: emergency.id })
    })
    const result = await res.json()
    setResolvingId('')
    if (!result.success) {
      alert('Failed to resolve: ' + result.error)
      return
    }
    setActiveEmergencies((prev) => prev.filter((e) => e.id !== emergency.id))
    await loadEmergencies(institution)
  }

  function handleLogout() {
    setSigningOut(true)
  }

  async function finishLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function updatePermission(responderId, permission) {
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch('/api/institution/update-responder-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (sessionData.session?.access_token || '') },
      body: JSON.stringify({ responderId, permission })
    })
    const result = await res.json()
    if (!result.success) {
      alert('Failed to update: ' + result.error)
      return
    }
    setResponders((prev) => prev.map((r) => (r.id === responderId ? { ...r, responder_permission: permission } : r)))
  }

  async function toggleResponderActive(responder) {
    const nextActive = !responder.is_active
    if (!nextActive) {
      const confirmed = window.confirm(
        `Remove ${responder.full_name}? If they have no case history, their account is deleted outright. ` +
        `If they've ever claimed or triggered an emergency, their access is revoked instead so that case's record stays intact.`
      )
      if (!confirmed) return
    }

    setBusyResponderId(responder.id)
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch('/api/institution/remove-responder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (sessionData.session?.access_token || '') },
      body: JSON.stringify({ responderId: responder.id, active: nextActive })
    })
    const result = await res.json()
    setBusyResponderId('')
    if (!result.success) {
      alert('Failed: ' + result.error)
      return
    }
    if (result.note) alert(result.note)
    if (result.outcome === 'deleted') {
      setResponders((prev) => prev.filter((r) => r.id !== responder.id))
      return
    }
    setResponders((prev) => prev.map((r) => (r.id === responder.id ? { ...r, is_active: nextActive } : r)))
  }

  if (!authorized || loading) {
    return (
      <div className="resq-shell">
        <EmergencyPulseBackground />
        <div className="resq-content"><LoadingScreen /></div>
      </div>
    )
  }

  const hasActiveAlert = activeEmergencies.some((e) => e.status !== 'resolved')
  const primaryResponders = responders.filter((r) => !r.service_id)

  return (
    <div className={'resq-shell' + (hasActiveAlert ? ' resq-alert-shell' : '')}>
      {signingOut && <SignOutOverlay onComplete={finishLogout} />}
      <EmergencyPulseBackground alert={hasActiveAlert} />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 40, maxWidth: 1000, margin: '0 auto' }}>
      <div className="resq-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {institution?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institution.logo_url} alt={`${institution.name} logo`} width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover' }} />
          )}
          <h1 className="resq-h1">{institution?.name}</h1>
        </div>
        <button className="resq-btn-secondary" onClick={handleLogout}>Log Out</button>
      </div>
      <p className="resq-fade-in resq-subtle">
        Institution Code: <strong style={{ fontFamily: 'monospace', color: 'var(--resq-text-primary)' }}>{institution?.institution_code}</strong>
        {' · '}Status: <strong className="resq-green">{institution?.status}</strong>
      </p>

      {error && <p style={{ color: '#ff8080' }}>{error}</p>}

      <div className="glass-card resq-tilt-card resq-fade-in resq-fade-in-2" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, margin: '20px 0' }}>
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
          {activeEmergencies.map((emergency, i) => (
            <div key={emergency.id} className="resq-row-interactive resq-row-stagger" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', '--resq-row-index': i }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <strong>{emergency.emergency_type || 'Emergency'}</strong>
                  <p className="resq-subtle" style={{ margin: '4px 0' }}>
                    Alerted {new Date(emergency.created_at).toLocaleString()}
                    {emergency.claimed_at && <> · Claimed {new Date(emergency.claimed_at).toLocaleString()}</>}
                  </p>
                  {emergency.claimant?.full_name && (
                    <p className="resq-subtle" style={{ margin: '4px 0' }}>
                      Handled by {emergency.claimant.full_name}
                      {emergency.claimant.phone && (
                        <> — <a href={`tel:${emergency.claimant.phone}`} style={{ color: 'inherit' }}>{emergency.claimant.phone}</a></>
                      )}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span className={emergency.claimed_by ? 'resq-badge resq-badge-claimed' : 'resq-badge resq-badge-open'}>
                    {emergency.status === 'in_progress' ? 'In Progress' : emergency.claimed_by ? 'Claimed' : 'Unclaimed'}
                  </span>
                  <button
                    className="resq-btn-secondary"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => resolveEmergency(emergency)}
                    disabled={resolvingId === emergency.id}
                    title="Mark resolved yourself, whether or not it's been claimed — use this if the responder is stuck or unreachable"
                  >
                    {resolvingId === emergency.id ? '...' : '✅ Mark Resolved'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
        <section className="glass-card" style={{ minHeight: 180 }}>
          <h2 style={{ marginTop: 0 }}>Recently Resolved</h2>
        <p className="resq-subtle" style={{ marginTop: 0 }}>Weekly report emails go to this institution admin with resolution details.</p>
          {recentResolved.length === 0 && <p className="resq-subtle">No resolved emergencies yet.</p>}
          {recentResolved.map((emergency, i) => (
            <div key={emergency.id} className="resq-row-interactive resq-row-stagger" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', '--resq-row-index': i }}>
              <strong>{emergency.emergency_type || 'Emergency'}</strong>
              <p className="resq-subtle" style={{ margin: '4px 0' }}>
                Resolved {emergency.resolved_at ? new Date(emergency.resolved_at).toLocaleString() : 'recently'}
              </p>
            </div>
          ))}
        </section>
      </div>

      <div className="resq-fade-in resq-fade-in-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '30px 0 12px', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Responders</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/institution-admin/case-reports" className="resq-btn-secondary" style={{ textDecoration: 'none' }}>
            ⬇ Case Reports
          </Link>
          <Link href="/institution-admin/settings" className="resq-btn-secondary" style={{ textDecoration: 'none' }}>
            ⚙ Settings
          </Link>
          <Link href="/institution-admin/reports" className="resq-btn-secondary" style={{ textDecoration: 'none', position: 'relative' }}>
            🚩 Reports
            {openReportCount > 0 && (
              <span className="resq-badge resq-badge-open" style={{ marginLeft: 8 }}>{openReportCount}</span>
            )}
          </Link>
          <Link href="/institution-admin/services" className="resq-btn-secondary" style={{ textDecoration: 'none' }}>
            🏥 Partner Units
          </Link>
          <Link href="/institution-admin/add-responder" className="resq-btn-primary" style={{ textDecoration: 'none' }}>
            + Add Responder
          </Link>
        </div>
      </div>

      {responders.length === 0 && <p className="resq-subtle resq-fade-in resq-fade-in-3">No responders yet. Add your first one above.</p>}

      {/* Institution-wide responders (no partner unit link) — the
          institution admin's own directly-managed team. Responders a
          hospital/unit added for itself are never mixed in here; they
          show grouped under that unit's own heading below instead. */}
      {primaryResponders.length > 0 && (
        <section className="glass-card resq-fade-in resq-fade-in-3" style={{ marginBottom: 24, overflowX: 'auto' }}>
          <h3 style={{ marginTop: 0 }}>Institution Responders</h3>
          <ResponderTable
            list={primaryResponders}
            shiftsByResponder={shiftsByResponder}
            busyResponderId={busyResponderId}
            updatePermission={updatePermission}
            toggleResponderActive={toggleResponderActive}
          />
        </section>
      )}

      {services.map((service) => {
        const unitResponders = responders.filter((r) => r.service_id === service.id)
        if (unitResponders.length === 0) return null
        const stats = unitStats[service.id] || { live: 0, onDuty: 0, solved: 0, delayed: 0 }
        return (
          <section key={service.id} className="glass-card resq-fade-in resq-fade-in-3" style={{ marginBottom: 24, overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                🏥 {service.name} Responders
                {stats.live > 0 && (
                  <span className="resq-badge resq-badge-open" style={{ fontSize: 10, marginLeft: 8 }}>
                    🚨 {stats.live} live
                  </span>
                )}
              </h3>
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }} className="resq-subtle">
                <span>{stats.onDuty} on duty</span>
                <span>{stats.solved} solved</span>
                {stats.delayed > 0 ? (
                  <span style={{ color: '#ff8080' }}>{stats.delayed} delayed</span>
                ) : (
                  <span>0 delayed</span>
                )}
              </div>
            </div>
            <ResponderTable
              list={unitResponders}
              shiftsByResponder={shiftsByResponder}
              busyResponderId={busyResponderId}
              updatePermission={updatePermission}
              toggleResponderActive={toggleResponderActive}
            />
          </section>
        )
      })}

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

// Shared table markup for both the institution-wide responder list
// and each partner unit's own grouped list below it.
function ResponderTable({ list, shiftsByResponder, busyResponderId, updatePermission, toggleResponderActive }) {
  return (
    <table style={{ width: '100%' }}>
      <thead>
        <tr>
          <th style={{ padding: 10 }}>Name</th>
          <th style={{ padding: 10 }}>Email</th>
          <th style={{ padding: 10 }}>Phone</th>
          <th style={{ padding: 10 }}>Permission</th>
          <th style={{ padding: 10 }}>Status</th>
          <th style={{ padding: 10 }}>Upcoming Shifts</th>
          <th style={{ padding: 10 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r) => (
          <tr key={r.id} className="resq-row-interactive" style={{ opacity: r.is_active === false ? 0.5 : 1 }}>
            <td style={{ padding: 10 }}>{r.full_name}</td>
            <td style={{ padding: 10 }}>{r.email}</td>
            <td style={{ padding: 10 }}>{r.phone}</td>
            <td style={{ padding: 10 }}>
              <select
                className="resq-input"
                value={r.responder_permission || 'full'}
                onChange={(e) => updatePermission(r.id, e.target.value)}
                disabled={r.is_active === false}
                style={{ minWidth: 120 }}
              >
                <option value="full">Full (claim & respond)</option>
                <option value="view_only">View only</option>
              </select>
            </td>
            <td style={{ padding: 10 }}>
              <span className={r.is_active === false ? 'resq-badge resq-badge-open' : 'resq-badge resq-badge-resolved'}>
                {r.is_active === false ? 'Removed' : 'Active'}
              </span>
            </td>
            <td style={{ padding: 10 }}>
              {(shiftsByResponder[r.id] || []).length === 0 && <span className="resq-subtle">None scheduled</span>}
              {(shiftsByResponder[r.id] || []).map((s) => (
                <div key={s.id} className="resq-subtle" style={{ fontSize: 13 }}>
                  {new Date(s.shift_start).toLocaleString()} → {new Date(s.shift_end).toLocaleString()}
                </div>
              ))}
            </td>
            <td style={{ padding: 10 }}>
              <button
                className="resq-btn-secondary"
                onClick={() => toggleResponderActive(r)}
                disabled={busyResponderId === r.id}
                style={{ color: r.is_active === false ? undefined : '#ff8080' }}
              >
                {busyResponderId === r.id ? '...' : r.is_active === false ? 'Reactivate' : 'Remove'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
