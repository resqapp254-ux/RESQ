// app/institution-admin/services/page.js
// Institution admins register partner units here: a partner
// hospital, police post, fire unit, or any custom service. A
// responder can optionally be linked to one of these (see
// add-responder) so their queue only shows emergencies routed to
// that unit — independent of whether they're a primary responder
// (can claim) or secondary responder (sees the feed, cannot claim).

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'
import LoadingScreen from '../../../components/LoadingScreen'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import { DEFAULT_HANDLES_BY_SERVICE_TYPE } from '../../../lib/serviceDispatch'

const SERVICE_TYPES = [
  { key: 'hospital', label: 'Hospital', emoji: '🏥' },
  { key: 'police', label: 'Police station', emoji: '🚓' },
  { key: 'fire', label: 'Fire unit', emoji: '🚒' },
  { key: 'ambulance', label: 'Ambulance', emoji: '🚑' },
  { key: 'other', label: 'Other service', emoji: '🧩' }
]

const EMERGENCY_TYPES = ['medical', 'fire', 'accident', 'security', 'gbv', 'mental_health', 'property_damage', 'other']

export default function ManageServicesPage() {
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState('')
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)

  const [form, setForm] = useState({
    name: '',
    serviceType: 'hospital',
    lat: '',
    lng: '',
    contactPhone: '',
    handlesTypes: DEFAULT_HANDLES_BY_SERVICE_TYPE.hospital
  })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id, role')
      .eq('id', sessionData.session.user.id)
      .single()

    if (!profile || profile.role !== 'institution_admin' || !profile.institution_id) {
      router.replace('/institution-admin')
      return
    }

    setInstitutionId(profile.institution_id)
    await loadServices(profile.institution_id)
    setLoading(false)
  }

  async function loadServices(instId) {
    const { data, error: fetchError } = await supabase
      .from('institution_services')
      .select('*')
      .eq('institution_id', instId)
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else setServices(data || [])
  }

  function handleServiceTypeChange(serviceType) {
    setForm((prev) => ({ ...prev, serviceType, handlesTypes: DEFAULT_HANDLES_BY_SERVICE_TYPE[serviceType] || [] }))
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

  async function handleAddService(e) {
    e.preventDefault()
    setError('')

    const lat = parseFloat(form.lat)
    const lng = parseFloat(form.lng)
    if (!form.name.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Name and a valid location (latitude/longitude) are required.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('institution_services').insert({
      institution_id: institutionId,
      service_type: form.serviceType,
      name: form.name.trim(),
      lat,
      lng,
      contact_phone: form.contactPhone.trim() || null,
      handles_emergency_types: form.handlesTypes
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setForm({ name: '', serviceType: 'hospital', lat: '', lng: '', contactPhone: '', handlesTypes: DEFAULT_HANDLES_BY_SERVICE_TYPE.hospital })
    await loadServices(institutionId)
  }

  async function toggleActive(service) {
    const { error: updateError } = await supabase
      .from('institution_services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
    if (updateError) {
      setError(updateError.message)
      return
    }
    await loadServices(institutionId)
  }

  async function removeService(service) {
    const confirmed = window.confirm(`Remove "${service.name}"? Responders linked to it will become primary responders.`)
    if (!confirmed) return
    const { error: deleteError } = await supabase.from('institution_services').delete().eq('id', service.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    await loadServices(institutionId)
  }

  if (loading) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
        <div className="resq-content"><LoadingScreen /></div>
      </main>
    )
  }

  const routingNote =
    services.filter((s) => s.is_active).length <= 2
      ? 'You have 2 or fewer active services, so every one of them receives every emergency for this institution.'
      : 'You have more than 2 active services, so each one only receives emergencies matching its type and nearby location.'

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
        <Link href="/institution-admin">&larr; Back to Dashboard</Link>

        <div className="glass-card resq-fade-in" style={{ marginTop: 16, marginBottom: 24 }}>
          <h1 className="resq-h1" style={{ fontSize: 26 }}>Partner Units</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Add hospitals, police stations, or any other partner service. Link a responder to one from "Add
            Responder" so their queue only shows emergencies routed here, whether they're a primary responder (can
            claim) or a secondary responder (sees the feed, cannot claim). {routingNote}
          </p>
        </div>

        {error && <p style={{ color: '#ff8080' }}>{error}</p>}

        <section className="glass-card resq-fade-in resq-fade-in-2" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>Add a service</h2>
          <form onSubmit={handleAddService}>
            <label>Service name</label>
            <input
              className="resq-input"
              style={{ marginTop: 4, marginBottom: 14 }}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. St. Mary's Hospital"
              required
            />

            <label>Service type</label>
            <div className="resq-type-grid" style={{ marginBottom: 14 }}>
              {SERVICE_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={'resq-type-chip' + (form.serviceType === t.key ? ' resq-type-chip-selected' : '')}
                  onClick={() => handleServiceTypeChange(t.key)}
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

            <label>Location</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 6 }}>
              <input className="resq-input" placeholder="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
              <input className="resq-input" placeholder="Longitude" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
            </div>
            <button type="button" className="resq-btn-secondary" onClick={useMyLocation} disabled={locationBusy} style={{ marginBottom: 14 }}>
              {locationBusy ? 'Locating...' : '📍 Use my current location'}
            </button>

            <label>Contact phone (optional)</label>
            <input
              className="resq-input"
              style={{ marginTop: 4, marginBottom: 14 }}
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />

            <button className="resq-btn-primary" disabled={saving} style={{ width: '100%' }}>
              {saving ? 'Adding...' : 'Add service'}
            </button>
          </form>
        </section>

        <section className="glass-card resq-fade-in resq-fade-in-3">
          <h2 style={{ marginTop: 0 }}>Your services ({services.length})</h2>
          {services.length === 0 && <p className="resq-subtle">No partner units yet.</p>}
          {services.map((s) => (
            <div key={s.id} className="resq-row-interactive" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{SERVICE_TYPES.find((t) => t.key === s.service_type)?.emoji} {s.name}</strong>
                <p className="resq-subtle" style={{ margin: '4px 0' }}>
                  {s.service_type} · {(s.handles_emergency_types || []).length === 0 ? 'handles all types' : s.handles_emergency_types.join(', ')}
                </p>
                <p className="resq-subtle" style={{ margin: 0, fontFamily: 'monospace', fontSize: 12 }}>{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className={s.is_active ? 'resq-badge resq-badge-resolved' : 'resq-badge resq-badge-open'}>
                  {s.is_active ? 'Active' : 'Inactive'}
                </span>
                <button className="resq-btn-secondary" onClick={() => toggleActive(s)}>{s.is_active ? 'Deactivate' : 'Activate'}</button>
                <button className="resq-btn-secondary" onClick={() => removeService(s)} style={{ color: '#ff8080' }}>Remove</button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
