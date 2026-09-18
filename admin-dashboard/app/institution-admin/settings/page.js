// app/institution-admin/settings/page.js
// Which emergency types this institution's users are offered. Not
// every institution wants every option (e.g. a workplace might not
// want "GBV" or "mental health" surfaced) — this narrows the list
// shown on the reporting user's dashboard.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'
import LoadingScreen from '../../../components/LoadingScreen'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const EMERGENCY_TYPES = [
  { key: 'medical', label: 'Medical', emoji: '🏥' },
  { key: 'fire', label: 'Fire', emoji: '🔥' },
  { key: 'accident', label: 'Accident', emoji: '🚑' },
  { key: 'security', label: 'Security', emoji: '🛡️' },
  { key: 'gbv', label: 'GBV', emoji: '🤝' },
  { key: 'mental_health', label: 'Mental Health', emoji: '🧠' },
  { key: 'property_damage', label: 'Property Damage', emoji: '🏚️' },
  { key: 'other', label: 'Other', emoji: '⚠️' }
]

export default function InstitutionSettingsPage() {
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState('')
  const [enabledTypes, setEnabledTypes] = useState([])
  const [requireAdmissionNumber, setRequireAdmissionNumber] = useState(false)
  const [requireResponderPhoto, setRequireResponderPhoto] = useState(false)
  const [visibility, setVisibility] = useState('private')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locating, setLocating] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingIdentity, setSavingIdentity] = useState(false)
  const [message, setMessage] = useState('')
  const [identityMessage, setIdentityMessage] = useState('')
  const [error, setError] = useState('')

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
      .select('institution_id, role')
      .eq('id', sessionData.session.user.id)
      .single()

    if (!profile || profile.role !== 'institution_admin' || !profile.institution_id) {
      router.replace('/institution-admin')
      return
    }
    setInstitutionId(profile.institution_id)

    const { data: institution, error: fetchError } = await supabase
      .from('institutions')
      .select('enabled_emergency_types, require_admission_number, require_responder_photo, visibility, lat, lng')
      .eq('id', profile.institution_id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEnabledTypes(institution?.enabled_emergency_types || EMERGENCY_TYPES.map((t) => t.key))
      setRequireAdmissionNumber(!!institution?.require_admission_number)
      setRequireResponderPhoto(!!institution?.require_responder_photo)
      setVisibility(institution?.visibility || 'private')
      setLat(institution?.lat != null ? String(institution.lat) : '')
      setLng(institution?.lng != null ? String(institution.lng) : '')
    }
    setLoading(false)
  }

  async function handleSaveIdentity() {
    setIdentityMessage('')
    setSavingIdentity(true)
    const { error: updateError } = await supabase
      .from('institutions')
      .update({ require_admission_number: requireAdmissionNumber, require_responder_photo: requireResponderPhoto, updated_at: new Date().toISOString() })
      .eq('id', institutionId)
    setSavingIdentity(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setIdentityMessage('Saved.')
  }

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude))
        setLng(String(position.coords.longitude))
        setLocating(false)
      },
      (geoError) => {
        setError('Could not get your location: ' + geoError.message)
        setLocating(false)
      }
    )
  }

  async function handleSaveLocation() {
    setLocationMessage('')
    const latValue = lat.trim() === '' ? null : parseFloat(lat)
    const lngValue = lng.trim() === '' ? null : parseFloat(lng)
    if ((lat.trim() !== '' && Number.isNaN(latValue)) || (lng.trim() !== '' && Number.isNaN(lngValue))) {
      setError('Latitude and longitude must be valid numbers.')
      return
    }
    setSavingLocation(true)
    const { error: updateError } = await supabase
      .from('institutions')
      .update({ lat: latValue, lng: lngValue, updated_at: new Date().toISOString() })
      .eq('id', institutionId)
    setSavingLocation(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setLocationMessage('Saved.')
  }

  function toggleType(key) {
    setEnabledTypes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  async function handleSave() {
    if (enabledTypes.length === 0) {
      setError('Enable at least one emergency type.')
      return
    }
    setError('')
    setSaving(true)

    const { error: updateError } = await supabase
      .from('institutions')
      .update({ enabled_emergency_types: enabledTypes, updated_at: new Date().toISOString() })
      .eq('id', institutionId)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('Saved.')
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

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>
        <Link href="/institution-admin">&larr; Back to Dashboard</Link>

        <div className="glass-card resq-fade-in" style={{ marginTop: 16, marginBottom: 24 }}>
          <h1 className="resq-h1" style={{ fontSize: 26 }}>Emergency Types</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Choose which emergency types your users can report. Everyone reporting to this institution only sees the types enabled here.
          </p>
        </div>

        <section className="glass-card resq-fade-in resq-fade-in-2">
          <div className="resq-type-grid">
            {EMERGENCY_TYPES.map((type) => (
              <button
                type="button"
                key={type.key}
                aria-pressed={enabledTypes.includes(type.key)}
                className={'resq-type-chip' + (enabledTypes.includes(type.key) ? ' resq-type-chip-selected' : '')}
                onClick={() => toggleType(type.key)}
              >
                <span className="resq-type-emoji" aria-hidden="true">{type.emoji}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>

          {error && <p style={{ color: '#ff8080', marginTop: 12 }}>{error}</p>}
          {message && <p className="resq-green" style={{ marginTop: 12 }}>{message}</p>}

          <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </section>

        <div className="glass-card resq-fade-in" style={{ marginTop: 24, marginBottom: 24 }}>
          <h1 className="resq-h1" style={{ fontSize: 22 }}>Identity Requirements</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Collected once on first login, then shown whenever that person triggers or responds to an emergency.
          </p>
        </div>

        <section className="glass-card resq-fade-in resq-fade-in-2">
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
            <input type="checkbox" checked={requireAdmissionNumber} onChange={(e) => setRequireAdmissionNumber(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Require an admission/work ID or reference number from users and responders (e.g. student ID, staff ID, membership number).</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={requireResponderPhoto} onChange={(e) => setRequireResponderPhoto(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Require responders to upload a one-time profile picture, shown to reporters and other responders.</span>
          </label>

          {identityMessage && <p className="resq-green" style={{ marginTop: 12 }}>{identityMessage}</p>}

          <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={handleSaveIdentity} disabled={savingIdentity}>
            {savingIdentity ? 'Saving...' : 'Save'}
          </button>
        </section>

        <div className="glass-card resq-fade-in" style={{ marginTop: 24, marginBottom: 24 }}>
          <h1 className="resq-h1" style={{ fontSize: 22 }}>Location</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            {visibility === 'public'
              ? 'Your institution is public, so this location is what nearby public users are matched against. Only super admin can change whether you\'re public or private.'
              : 'Only used if super admin later makes your institution public — private institutions route by code, not location.'}
          </p>
        </div>

        <section className="glass-card resq-fade-in resq-fade-in-2">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <label className="resq-subtle">Latitude</label><br />
              <input className="resq-input" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. -1.2921" style={{ marginTop: 4 }} />
            </div>
            <div>
              <label className="resq-subtle">Longitude</label><br />
              <input className="resq-input" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 36.8219" style={{ marginTop: 4 }} />
            </div>
          </div>
          <button className="resq-btn-secondary" style={{ marginTop: 12 }} onClick={handleUseMyLocation} disabled={locating}>
            {locating ? 'Locating…' : '📍 Use my current location'}
          </button>

          {locationMessage && <p className="resq-green" style={{ marginTop: 12 }}>{locationMessage}</p>}

          <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={handleSaveLocation} disabled={savingLocation}>
            {savingLocation ? 'Saving...' : 'Save'}
          </button>
        </section>
      </div>
    </main>
  )
}
