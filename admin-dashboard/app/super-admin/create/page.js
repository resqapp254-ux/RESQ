// app/super-admin/create/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'

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
      <div style={{ maxWidth: 600, margin: '60px auto', fontFamily: 'sans-serif', padding: 24 }}>
        <h1>Institution Created 🎉</h1>
        <div style={{ background: '#f0fdf4', border: '1px solid #1a7f37', borderRadius: 8, padding: 20, marginTop: 20 }}>
          <p><strong>{result.institution.name}</strong> has been created.</p>
          <p>Send these two codes to the institution's admin ({form.adminEmail}):</p>
          <p style={{ fontFamily: 'monospace', fontSize: 18 }}>
            Institution Code: <strong>{result.institutionCode}</strong><br />
            Verification Code: <strong>{result.verificationCode}</strong>
          </p>
          <p style={{ marginTop: 16 }}>
            Their login is <strong>{form.adminEmail}</strong> with the temporary password you set.
            They should log in, enter the verification code above, then change their password.
          </p>
        </div>
        <button onClick={() => router.push('/super-admin')} style={{ marginTop: 24, padding: '10px 20px' }}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 }}>
      <Link href="/super-admin">&larr; Back to Dashboard</Link>
      <h1>Create New Institution</h1>

      <form onSubmit={handleSubmit}>
        <h3>Institution Details</h3>
        <label>Institution Name</label>
        <input required value={form.institutionName} onChange={(e) => update('institutionName', e.target.value)} style={inputStyle} />

        <label>Contact Email</label>
        <input required type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} style={inputStyle} />

        <label>Contact Phone (optional)</label>
        <input value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} style={inputStyle} />

        <h3>First Institution Admin Account</h3>
        <label>Admin Full Name</label>
        <input required value={form.adminFullName} onChange={(e) => update('adminFullName', e.target.value)} style={inputStyle} />

        <label>Admin Email (their login)</label>
        <input required type="email" value={form.adminEmail} onChange={(e) => update('adminEmail', e.target.value)} style={inputStyle} />

        <label>Temporary Password</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input required value={form.adminTempPassword} onChange={(e) => update('adminTempPassword', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button type="button" onClick={generatePassword} style={{ padding: '0 12px' }}>Generate</button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, marginTop: 20, background: '#cc0000', color: 'white', border: 'none', borderRadius: 6 }}>
          {loading ? 'Creating...' : 'Create Institution'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = { width: '100%', padding: 10, marginBottom: 14, marginTop: 4, borderRadius: 6, border: '1px solid #ccc' }
