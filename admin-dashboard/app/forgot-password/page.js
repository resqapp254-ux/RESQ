'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true); setError(''); setMessage('')
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    setLoading(false)
    if (resetError) setError(resetError.message)
    else setMessage('If that email is registered, a password-reset link has been sent.')
  }

  return <main className="resq-shell"><EmergencyPulseBackground /><div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><section className="glass-card" style={{ width: '100%', maxWidth: 440 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><div style={{ width: 120, height: 120 }}><img src="/icon.svg" alt="RESQ" width="120" height="120" /></div></div><h1 className="resq-h1" style={{ fontSize: 28 }}>Reset your password</h1><p className="resq-subtle" style={{ margin: '8px 0 24px' }}>We will email you a secure reset link.</p><form onSubmit={handleSubmit}><input className="resq-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />{error && <p style={{ color: '#ff8080' }}>{error}</p>}{message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}<button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button></form><p className="resq-subtle" style={{ marginTop: 18 }}><a href="/login">Back to login</a></p></section></div></main>
}