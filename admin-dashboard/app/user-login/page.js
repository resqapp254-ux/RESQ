'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

export default function UserLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState('request')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function requestAccessCode() {
    setError('')
    setMessage('')
    setLoading(true)

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/join-institution`
      }
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setStage('verify')
    setMessage('An access code has been sent to your email. Enter it below to continue.')
  }

  async function verifyLogin() {
    setError('')
    setMessage('')
    setLoading(true)

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email'
    })

    if (verifyError) {
      setLoading(false)
      setError(verifyError.message)
      return
    }

    const { data: status, error: statusError } = await supabase.rpc('get_onboarding_status')
    setLoading(false)

    if (statusError) {
      setError('Login succeeded, but your account status could not be loaded.')
      return
    }

    if (status.role === 'user' && status.next_step === 'enter_institution_code') {
      router.replace('/join-institution')
      return
    }

    if (status.role === 'user') {
      router.replace('/user')
      return
    }

    setError('This account is not a user account. Please use the admin login for super admin or institution admin access.')
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card" style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 120, height: 120 }}>
              <img src="/icon.svg" alt="RESQ" width="120" height="120" />
            </div>
          </div>
          <h1 className="resq-h1" style={{ fontSize: 28 }}>User access code</h1>
          <p className="resq-subtle" style={{ margin: '8px 0 24px' }}>Enter your email to receive a one-time sign-in code.</p>

          <div style={{ marginBottom: 12 }}>
            <label className="resq-subtle">Email</label>
            <input
              className="resq-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {stage === 'verify' && (
            <div style={{ marginBottom: 12 }}>
              <label className="resq-subtle">Access code</label>
              <input
                className="resq-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                maxLength={6}
              />
            </div>
          )}

          {error && <p style={{ color: '#ff8080', marginTop: 12 }}>{error}</p>}
          {message && <p style={{ color: 'var(--resq-green)', marginTop: 12 }}>{message}</p>}

          {stage === 'request' ? (
            <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading} onClick={requestAccessCode}>
              {loading ? 'Sending...' : 'Send access code'}
            </button>
          ) : (
            <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading} onClick={verifyLogin}>
              {loading ? 'Signing in...' : 'Verify and continue'}
            </button>
          )}

          <p className="resq-subtle" style={{ marginTop: 18 }}>
            <a href="/login">Admin login</a> · <a href="/signup">Create user account</a>
          </p>
        </section>
      </div>
    </main>
  )
}
