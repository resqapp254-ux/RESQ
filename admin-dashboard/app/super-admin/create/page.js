// app/super-admin/create/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

export default function CreateInstitutionPage() {
  const [form, setForm] = useState({
    institutionName: '',
    contactEmail: '',
    contactPhone: '',
    adminFullName: '',
    adminEmail: '',
    adminTempPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const router = useRouter()

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pass = ''
    for (let i = 0; i < 12; i++) pass += chars[Math.floor(Math.random() * chars.length)]
    update('adminTempPassword', pass)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    // Get the current session so the API route could later verify super_admin server-side (Day 9 hardening)
    const { data: sessionData } = await supabase.auth.getSession()

    try {
      const res = await fetch('/api/admin/create-institution', {
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
        setResult(data)
      }
    } catch (err) {
      setError(err.message)
    }

    setLoading(false)
  }

  if (result) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
      <LanguageSwitcher />
        <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 560 }}>
            <h1 className="resq-h1" style={{ fontSize: 24 }}>Institution Created</h1>
            <div className="resq-success-box" style={{ marginTop: 16 }}>
              <p><strong>{result.institution.name}</strong> has been created.</p>
              <p style={{ marginTop: 8 }}>Send these two codes to the institution's admin ({form.adminEmail}):</p>
              <p style={{ fontFamily: 'monospace', fontSize: 18, marginTop: 8 }}>
                Institution Code: <strong>{result.institutionCode}</strong><br />
                Verification Code: <strong>{result.verificationCode}</strong>
              </p>
              <p className="resq-subtle" style={{ marginTop: 16 }}>
                Their login is <strong style={{ color: 'var(--resq-text-primary)' }}>{form.adminEmail}</strong> with the temporary password you set.
                They should log in, enter the verification code above, then change their password.
              </p>
            </div>
            <button className="resq-btn-primary" style={{ marginTop: 20 }} onClick={() => router.push('/super-admin')}>
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
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 480 }}>
          <Link href="/super-admin">&larr; Back to Dashboard</Link>
          <h1 className="resq-h1" style={{ fontSize: 26, marginTop: 12 }}>Create New Institution</h1>

          <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>Institution Details</h3>
            <label>Institution Name</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required value={form.institutionName} onChange={(e) => update('institutionName', e.target.value)} />

            <label>Contact Email</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />

            <label>Contact Phone (optional)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />

            <h3>First Institution Admin Account</h3>
            <label>Admin Full Name</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required value={form.adminFullName} onChange={(e) => update('adminFullName', e.target.value)} />

            <label>Admin Email (their login)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} required type="email" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} />

            <label>Temporary Password</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input className="resq-input" required value={form.adminTempPassword} onChange={(e) => update('adminTempPassword', e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="resq-btn-secondary" onClick={generatePassword}>Generate</button>
            </div>

            {error && <p style={{ color: '#ff8080' }}>{error}</p>}

            <button type="submit" disabled={loading} className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }}>
              {loading ? 'Creating...' : 'Create Institution'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
