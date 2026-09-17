// app/institution-admin/add-responder/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const EMERGENCY_TYPES = ['medical', 'fire', 'accident', 'security', 'gbv', 'mental_health', 'property_damage', 'other']

export default function AddResponderPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    tempPassword: '',
    serviceId: '',
    permission: 'full',
    emergencyTypes: []
  })
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadServices() {
      const { data: sessionData } = await supabase.auth.getSession()
      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', sessionData.session?.user?.id)
        .single()
      if (!profile?.institution_id) return
      const { data } = await supabase
        .from('institution_services')
        .select('id, name, service_type')
        .eq('institution_id', profile.institution_id)
        .eq('is_active', true)
        .order('name')
      setServices(data || [])
    }
    loadServices()
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleType(key) {
    setForm((prev) => ({
      ...prev,
      emergencyTypes: prev.emergencyTypes.includes(key)
        ? prev.emergencyTypes.filter((k) => k !== key)
        : [...prev.emergencyTypes, key]
    }))
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pass = ''
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)]
    update('tempPassword', pass)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: sessionData } = await supabase.auth.getSession()

    try {
      const res = await fetch('/api/institution/create-responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token || ''}`
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Something went wrong')
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }

  if (success) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <RadarSweepBackground />
      <LanguageSwitcher />
        <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 480 }}>
            <h1 className="resq-h1" style={{ fontSize: 24 }}>Responder Added</h1>
            <div className="resq-success-box" style={{ marginTop: 16 }}>
              <p><strong>{form.fullName}</strong> can now log in at the RESQ sign-in page (web or mobile app) with:</p>
              <p style={{ marginTop: 10 }}>Email: <strong>{form.email}</strong><br />Password: <strong>{form.tempPassword}</strong></p>
              {form.serviceId && (
                <p className="resq-subtle" style={{ marginTop: 10 }}>
                  Assigned as a secondary responder to: <strong style={{ color: 'var(--resq-text-primary)' }}>{services.find((s) => s.id === form.serviceId)?.name}</strong>
                </p>
              )}
            </div>
            <button className="resq-btn-primary" style={{ marginTop: 20 }} onClick={() => router.push('/institution-admin')}>
              Back to Dashboard
            </button>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 440 }}>
          <Link href="/institution-admin">&larr; Back to Dashboard</Link>
          <h1 className="resq-h1" style={{ fontSize: 26, marginTop: 12 }}>Add Responder</h1>

          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            <label>Full Name</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />

            <label>Email (their login)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />

            <label>Phone Number</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Used for offline SMS alerts" />

            <label>Temporary Password</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, marginBottom: 14 }}>
              <input className="resq-input" required value={form.tempPassword} onChange={(e) => update('tempPassword', e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="resq-btn-secondary" onClick={generatePassword}>Generate</button>
            </div>

            <label>Assign to a service (optional)</label>
            <select className="resq-input" style={{ marginTop: 4 }} value={form.serviceId} onChange={(e) => update('serviceId', e.target.value)}>
              <option value="">Primary responder (all emergencies)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.service_type})</option>
              ))}
            </select>
            <p className="resq-subtle" style={{ marginTop: 4, marginBottom: 14 }}>
              Leave as "Primary" for your main team. Pick a service to make this a secondary responder — see{' '}
              <Link href="/institution-admin/services">Secondary Responders</Link> to add one first.
            </p>

            <label>Permission</label>
            <select className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.permission} onChange={(e) => update('permission', e.target.value)}>
              <option value="full">Full — can claim, respond, and resolve</option>
              <option value="view_only">View only — sees the log, cannot claim</option>
            </select>

            <label>Notify for these emergency types (leave all off for every type)</label>
            <div className="resq-type-grid" style={{ marginBottom: 14 }}>
              {EMERGENCY_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  aria-pressed={form.emergencyTypes.includes(type)}
                  className={'resq-type-chip' + (form.emergencyTypes.includes(type) ? ' resq-type-chip-selected' : '')}
                  onClick={() => toggleType(type)}
                  style={{ textTransform: 'capitalize' }}
                >
                  <span>{type.replace('_', ' ')}</span>
                </button>
              ))}
            </div>

            {error && <p style={{ color: '#ff8080' }}>{error}</p>}

            <button type="submit" disabled={loading} className="resq-btn-primary" style={{ width: '100%', marginTop: 16 }}>
              {loading ? 'Adding...' : 'Add Responder'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
