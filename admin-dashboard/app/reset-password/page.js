'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session))) }, [])
  async function handleSubmit(event) {
    event.preventDefault(); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(updateError.message)
    else { setMessage('Password updated.'); setTimeout(() => router.replace('/login'), 1000) }
  }
  return <main className="resq-shell"><EmergencyPulseBackground /><div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><section className="glass-card" style={{ width: '100%', maxWidth: 440 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><div style={{ width: 120, height: 120 }}><img src="/icon.svg" alt="RESQ" width="120" height="120" /></div></div><h1 className="resq-h1" style={{ fontSize: 28 }}>Choose a new password</h1>{ready ? <form onSubmit={handleSubmit}><input className="resq-input" style={{ marginTop: 24 }} type="password" minLength={8} placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p style={{ color: '#ff8080' }}>{error}</p>}{message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}<button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }}>Update password</button></form> : <p className="resq-subtle" style={{ marginTop: 16 }}>Open this page from the reset link in your email.</p>}</section></div></main>
}