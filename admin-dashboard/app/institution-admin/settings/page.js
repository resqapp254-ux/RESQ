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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
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
      .select('enabled_emergency_types')
      .eq('id', profile.institution_id)
      .single()

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setEnabledTypes(institution?.enabled_emergency_types || EMERGENCY_TYPES.map((t) => t.key))
    }
    setLoading(false)
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
      <LanguageSwitcher />
        <div className="resq-content"><LoadingScreen /></div>
      </main>
    )
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </section>
      </div>
    </main>
  )
}
