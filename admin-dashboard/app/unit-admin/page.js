// app/unit-admin/page.js
// A partner unit's own dashboard: set up its own location/
// coordinates, contact details, and handled emergency types, and
// manage the responders linked to this unit. Everything scoped to
// the one institution_services row this account is linked to — a
// unit_admin never sees or touches anything else in the institution.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'
import RadarSweepBackground from '../../components/RadarSweepBackground'
import LoadingScreen from '../../components/LoadingScreen'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { pickMatchingServices } from '../../lib/serviceDispatch'
import { buildAllCasesReportHtml, downloadHtmlFile } from '../../lib/buildEmergencyReport'

const SERVICE_TYPES = [
  { key: 'hospital', label: 'Hospital', emoji: '🏥' },
  { key: 'police', label: 'Police station', emoji: '🚓' },
  { key: 'fire', label: 'Fire unit', emoji: '🚒' },
  { key: 'ambulance', label: 'Ambulance', emoji: '🚑' },
  { key: 'individual', label: 'Individual responder (no fixed location)', emoji: '🧍' },
  { key: 'other', label: 'Other service', emoji: '🧩' }
]

const EMERGENCY_TYPES = ['medical', 'fire', 'accident', 'security', 'gbv', 'mental_health', 'property_damage', 'other']

export default function UnitAdminPage() {
  const router = useRouter()
  const [serviceId, setServiceId] = useState('')
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [responders, setResponders] = useState([])
  const [busyResponderId, setBusyResponderId] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [liveEmergencies, setLiveEmergencies] = useState([])
  const [resolvedCount, setResolvedCount] = useState(0)
  const [resolvingId, setResolvingId] = useState('')
  const [downloadingAll, setDownloadingAll] = useState(false)

  const [addForm, setAddForm] = useState({ fullName: '', email: '', phone: '', tempPassword: '', permission: 'full' })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [addedCreds, setAddedCreds] = useState(null)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, service_id')
      .eq('id', sessionData.session.user.id)
      .single()

    if (!profile || profile.role !== 'unit_admin' || !profile.service_id) {
      router.replace('/login')
      return
    }
    setServiceId(profile.service_id)

    const { data: service, error: fetchError } = await supabase
      .from('institution_services')
      .select('*')
      .eq('id', profile.service_id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setForm({
        name: service.name,
        serviceType: service.service_type,
        lat: service.lat != null ? String(service.lat) : '',
        lng: service.lng != null ? String(service.lng) : '',
        contactPhone: service.contact_phone || '',
        contactEmail: service.contact_email || '',
        handlesTypes: service.handles_emergency_types || []
      })
      setInstitutionId(service.institution_id)
      await loadLiveEmergencies(service.institution_id, profile.service_id)

      // Live updates so a new/claimed/resolved emergency shows up
      // without needing a manual refresh — this is the unit's own
      // "where the siren would wail" view of its own routed cases.
      supabase
        .channel('unit-admin-emergencies-' + profile.service_id)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergencies', filter: `institution_id=eq.${service.institution_id}` },
          () => loadLiveEmergencies(service.institution_id, profile.service_id)
        )
        .subscribe()
    }

    await loadResponders(profile.service_id)
    setLoading(false)
  }

  async function loadLiveEmergencies(instId, sId) {
    const { data: emergencies } = await supabase
      .from('emergencies')
      .select('id, emergency_type, status, created_at, claimed_at, lat, lng, triggered_by_phone, triggered_via, claimant:profiles!emergencies_claimed_by_fkey(full_name, phone)')
      .eq('institution_id', instId)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .order('created_at', { ascending: false })

    const { data: allServices } = await supabase
      .from('institution_services')
      .select('id, service_type, lat, lng, handles_emergency_types, is_active')
      .eq('institution_id', instId)
      .eq('is_active', true)

    const mine = (emergencies || []).filter((e) => {
      const matching = pickMatchingServices(allServices, { emergencyType: e.emergency_type, lat: e.lat, lng: e.lng })
      return matching.some((s) => s.id === sId)
    })
    setLiveEmergencies(mine)
  }

  async function loadResponders(sId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, responder_permission, is_active')
      .eq('service_id', sId)
      .eq('role', 'responder')
      .order('created_at', { ascending: false })
    setResponders(data || [])

    const ids = (data || []).map((r) => r.id)
    if (ids.length > 0) {
      const { count } = await supabase
        .from('emergencies')
        .select('id', { count: 'exact', head: true })
        .in('claimed_by', ids)
        .eq('status', 'resolved')
      setResolvedCount(count || 0)
    } else {
      setResolvedCount(0)
    }
  }

  function toggleHandlesType(type) {
    setForm((prev) => ({
      ...prev,
      handlesTypes: prev.handlesTypes.includes(type)
        ? prev.handlesTypes.filter((t) => t !== type)
        : [...prev.handlesTypes, type]
    }))
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }
    setLocationBusy(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({ ...prev, lat: String(position.coords.latitude), lng: String(position.coords.longitude) }))
        setLocationBusy(false)
      },
      () => {
        setError('Could not read your location. Enter latitude/longitude manually.')
        setLocationBusy(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    const isIndividual = form.serviceType === 'individual'
    const lat = parseFloat(form.lat)
    const lng = parseFloat(form.lng)

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (!isIndividual && (Number.isNaN(lat) || Number.isNaN(lng))) {
      setError('A valid location (latitude/longitude) is required for this unit type.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase
      .from('institution_services')
      .update({
        name: form.name.trim(),
        service_type: form.serviceType,
        lat: isIndividual ? null : lat,
        lng: isIndividual ? null : lng,
        contact_phone: form.contactPhone.trim() || null,
        contact_email: form.contactEmail.trim() || null,
        handles_emergency_types: form.handlesTypes
      })
      .eq('id', serviceId)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('Saved.')
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pass = ''
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)]
    setAddForm((prev) => ({ ...prev, tempPassword: pass }))
  }

  async function handleAddResponder(e) {
    e.preventDefault()
    setAddError('')
    setAdding(true)

    const { data: sessionData } = await supabase.auth.getSession()
    try {
      const res = await fetch('/api/institution/create-responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify(addForm)
      })
      const data = await res.json()
      if (!data.success) {
        setAddError(data.error || 'Something went wrong')
      } else {
        setAddedCreds({ email: addForm.email, password: addForm.tempPassword })
        setAddForm({ fullName: '', email: '', phone: '', tempPassword: '', permission: 'full' })
        await loadResponders(serviceId)
      }
    } catch (err) {
      setAddError(err.message)
    }
    setAdding(false)
  }

  async function toggleResponderActive(responder) {
    if (responder.is_active) {
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
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
      body: JSON.stringify({ responderId: responder.id, active: !responder.is_active })
    })
    const result = await res.json()
    setBusyResponderId('')
    if (!result.success) {
      alert('Failed: ' + result.error)
      return
    }
    if (result.note) alert(result.note)
    await loadResponders(serviceId)
  }

  async function updateResponderPermission(responderId, permission) {
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch('/api/institution/update-responder-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
      body: JSON.stringify({ responderId, permission })
    })
    const result = await res.json()
    if (!result.success) {
      alert('Failed: ' + result.error)
      return
    }
    setResponders((prev) => prev.map((r) => (r.id === responderId ? { ...r, responder_permission: permission } : r)))
  }

  async function resolveEmergency(emergency) {
    const confirmed = window.confirm(
      `Mark this ${emergency.emergency_type || 'emergency'} as resolved? Use this when the responder who claimed it ` +
      `(or should have) is unreachable or stuck — it closes the case immediately as this unit's admin.`
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
    await loadLiveEmergencies(institutionId, serviceId)
  }

  // Every emergency this unit's own responders have ever resolved —
  // separate from the institution admin's institution-wide report,
  // since a partner unit only manages/sees its own responders.
  async function downloadAllSolved() {
    setDownloadingAll(true)
    try {
      const ids = responders.map((r) => r.id)
      if (ids.length === 0) {
        const html = buildAllCasesReportHtml({ institutionName: form.name, cases: [], scopeLabel: 'for this unit' })
        downloadHtmlFile(`resq-${form.name.replace(/\s+/g, '-').toLowerCase()}-solved-emergencies-${new Date().toISOString().slice(0, 10)}.html`, html)
        return
      }

      const { data: cases, error: fetchError } = await supabase
        .from('emergencies')
        .select(`
          id, emergency_type, status, created_at, claimed_at, resolved_at, lat, lng,
          triggered_by_phone, triggered_via, photo_url, video_url, rating, rating_comment,
          reporter:profiles!emergencies_triggered_by_fkey(full_name, phone, email),
          claimant:profiles!emergencies_claimed_by_fkey(full_name, email)
        `)
        .in('claimed_by', ids)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const withMessages = []
      for (const emergency of cases || []) {
        const { data: messages } = await supabase
          .from('emergency_messages')
          .select('sender_role, message, media_url, media_type, is_ai_generated, created_at')
          .eq('emergency_id', emergency.id)
          .order('created_at', { ascending: true })
        withMessages.push({ emergency, messages: messages || [] })
      }

      const html = buildAllCasesReportHtml({ institutionName: form.name, cases: withMessages, scopeLabel: 'for this unit' })
      downloadHtmlFile(`resq-${form.name.replace(/\s+/g, '-').toLowerCase()}-solved-emergencies-${new Date().toISOString().slice(0, 10)}.html`, html)
    } finally {
      setDownloadingAll(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading || !form) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <RadarSweepBackground />
        <LanguageSwitcher />
        <div className="resq-content"><LoadingScreen /></div>
      </main>
    )
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
        <div className="glass-card resq-fade-in" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="resq-h1" style={{ fontSize: 26 }}>{form.name}</h1>
            <p className="resq-subtle" style={{ marginTop: 4 }}>Your unit's own dashboard · {resolvedCount} case{resolvedCount === 1 ? '' : 's'} resolved</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="resq-btn-secondary" onClick={downloadAllSolved} disabled={downloadingAll}>
              {downloadingAll ? 'Preparing…' : '⬇ Solved Emergencies'}
            </button>
            <button className="resq-btn-secondary" onClick={handleLogout}>Log Out</button>
          </div>
        </div>

        {error && <p style={{ color: '#ff8080' }}>{error}</p>}

        <section className="glass-card resq-fade-in" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>
            {liveEmergencies.some((e) => !e.claimed_by) ? '🚨 ' : ''}Live Emergencies ({liveEmergencies.length})
          </h2>
          {liveEmergencies.length === 0 && <p className="resq-subtle">No active emergencies routed to this unit right now.</p>}
          {liveEmergencies.map((e) => (
            <div key={e.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <strong style={{ textTransform: 'capitalize' }}>{(e.emergency_type || 'other').replace('_', ' ')}</strong>{' '}
              <span className={e.claimed_by ? 'resq-badge resq-badge-claimed' : 'resq-badge resq-badge-open'}>
                {e.status.replace('_', ' ')}
              </span>
              <p className="resq-subtle" style={{ margin: '4px 0 0', fontSize: 13 }}>
                Alerted {new Date(e.created_at).toLocaleString()}
                {e.claimed_at ? ` · Claimed ${new Date(e.claimed_at).toLocaleString()}` : ''}
              </p>
              {e.claimant && (
                <p className="resq-subtle" style={{ margin: '4px 0 0', color: '#7fe3f2', fontSize: 13 }}>
                  ✋ {e.claimant.full_name}{e.claimant.phone ? ` · 📞 ${e.claimant.phone}` : ''}
                </p>
              )}
              <button
                className="resq-btn-secondary"
                style={{ fontSize: 11, padding: '3px 8px', marginTop: 6 }}
                onClick={() => resolveEmergency(e)}
                disabled={resolvingId === e.id}
                title="Mark resolved yourself, whether or not it's been claimed — use this if the responder is stuck or unreachable"
              >
                {resolvingId === e.id ? '...' : '✅ Mark Resolved'}
              </button>
            </div>
          ))}
        </section>

        <section className="glass-card resq-fade-in resq-fade-in-2" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Unit Settings</h2>
          <form onSubmit={handleSave}>
            <label>Unit name</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

            <label>Unit type</label>
            <div className="resq-type-grid" style={{ marginBottom: 14 }}>
              {SERVICE_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={'resq-type-chip' + (form.serviceType === t.key ? ' resq-type-chip-selected' : '')}
                  onClick={() => setForm({ ...form, serviceType: t.key })}
                >
                  <span className="resq-type-emoji" aria-hidden="true">{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <label>Responds to emergency types (leave all off to respond to everything)</label>
            <div className="resq-type-grid" style={{ marginBottom: 14 }}>
              {EMERGENCY_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  aria-pressed={form.handlesTypes.includes(type)}
                  className={'resq-type-chip' + (form.handlesTypes.includes(type) ? ' resq-type-chip-selected' : '')}
                  onClick={() => toggleHandlesType(type)}
                  style={{ textTransform: 'capitalize' }}
                >
                  <span>{type.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            {form.serviceType === 'individual' ? (
              <p className="resq-subtle" style={{ marginBottom: 14 }}>
                Individual units have no fixed location, they receive matching emergencies regardless of distance.
              </p>
            ) : (
              <>
                <label>Location</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 6 }}>
                  <input className="resq-input" placeholder="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
                  <input className="resq-input" placeholder="Longitude" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
                </div>
                <button type="button" className="resq-btn-secondary" onClick={useMyLocation} disabled={locationBusy} style={{ marginBottom: 14 }}>
                  {locationBusy ? 'Locating...' : '📍 Use my current location'}
                </button>
              </>
            )}

            <label>Contact phone (optional)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />

            <label>Contact email (optional)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />

            {message && <p className="resq-green">{message}</p>}

            <button className="resq-btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </form>
        </section>

        <section className="glass-card resq-fade-in resq-fade-in-3" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Responders ({responders.length})</h2>
          {responders.length === 0 && <p className="resq-subtle">No responders yet. Add your first one below.</p>}
          {responders.map((r) => (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ opacity: r.is_active ? 1 : 0.5 }}>{r.full_name}</strong>{' '}
                {!r.is_active && <span className="resq-badge resq-badge-muted">Removed</span>}
                <p className="resq-subtle" style={{ margin: '4px 0 0' }}>{r.email} {r.phone ? '· ' + r.phone : ''}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="resq-input"
                  value={r.responder_permission || 'full'}
                  onChange={(e) => updateResponderPermission(r.id, e.target.value)}
                  disabled={!r.is_active}
                  style={{ minWidth: 140 }}
                >
                  <option value="full">Primary (claims)</option>
                  <option value="view_only">Secondary (view only)</option>
                </select>
                <button className="resq-btn-secondary" onClick={() => toggleResponderActive(r)} disabled={busyResponderId === r.id} style={{ color: r.is_active ? '#ff8080' : undefined }}>
                  {busyResponderId === r.id ? '...' : r.is_active ? 'Remove' : 'Reactivate'}
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="glass-card resq-fade-in resq-fade-in-3">
          <h2 style={{ marginTop: 0 }}>Add a Responder</h2>
          {addedCreds && (
            <div className="resq-success-box" style={{ marginBottom: 14 }}>
              <p>Share these credentials with the new responder:</p>
              <p>Email: <strong>{addedCreds.email}</strong><br />Password: <strong>{addedCreds.password}</strong></p>
            </div>
          )}
          <form onSubmit={handleAddResponder}>
            <label>Full name</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} required />

            <label>Email (their login)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} required />

            <label>Phone number</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Used for offline SMS alerts" required />

            <label>Temporary password</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 14 }}>
              <input className="resq-input" required value={addForm.tempPassword} onChange={(e) => setAddForm({ ...addForm, tempPassword: e.target.value })} style={{ flex: 1 }} />
              <button type="button" className="resq-btn-secondary" onClick={generatePassword}>Generate</button>
            </div>

            <label>Role</label>
            <select className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={addForm.permission} onChange={(e) => setAddForm({ ...addForm, permission: e.target.value })}>
              <option value="full">Primary responder: claims, responds, and resolves emergencies</option>
              <option value="view_only">Secondary responder: sees the full feed and logs, cannot claim</option>
            </select>

            {addError && <p style={{ color: '#ff8080' }}>{addError}</p>}

            <button className="resq-btn-primary" style={{ width: '100%' }} disabled={adding}>
              {adding ? 'Adding...' : 'Add Responder'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
