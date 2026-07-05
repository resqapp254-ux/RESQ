// app/institution-admin/add-responder/page.js
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'

export default function AddResponderPage() {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', tempPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
      <div style={{ maxWidth: 500, margin: '60px auto', fontFamily: 'sans-serif', padding: 24 }}>
        <h1>Responder Added ✅</h1>
        <div style={{ background: '#f0fdf4', border: '1px solid #1a7f37', borderRadius: 8, padding: 20 }}>
          <p><strong>{form.fullName}</strong> can now log in to the RESQ mobile app with:</p>
          <p>Email: <strong>{form.email}</strong><br />Password: <strong>{form.tempPassword}</strong></p>
        </div>
        <button onClick={() => router.push('/institution-admin')} style={{ marginTop: 20, padding: '10px 20px' }}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 450, margin: '40px auto', fontFamily: 'sans-serif', padding: 24 }}>
      <Link href="/institution-admin">&larr; Back to Dashboard</Link>
      <h1>Add Responder</h1>

      <form onSubmit={handleSubmit}>
        <label>Full Name</label>
        <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} style={inputStyle} />

        <label>Email (their login)</label>
        <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} style={inputStyle} />

        <label>Phone Number</label>
        <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} style={inputStyle} placeholder="Used for offline SMS alerts" />

        <label>Temporary Password</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input required value={form.tempPassword} onChange={(e) => update('tempPassword', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button type="button" onClick={generatePassword} style={{ padding: '0 12px' }}>Generate</button>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, marginTop: 16, background: '#cc0000', color: 'white', border: 'none', borderRadius: 6 }}>
          {loading ? 'Adding...' : 'Add Responder'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = { width: '100%', padding: 10, marginBottom: 14, marginTop: 4, borderRadius: 6, border: '1px solid #ccc' }
