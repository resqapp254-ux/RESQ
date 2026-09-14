// app/login/page.js
// Shared sign-in for every role. After login, redirects based on get_onboarding_status().

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import GlobeBackground from '../../components/GlobeBackground'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useTranslation } from '../../lib/i18n/LanguageContext'

export default function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Ask the DB what screen this user needs next
    const { data, error: statusError } = await supabase.rpc('get_onboarding_status')

    setLoading(false)

    if (statusError) {
      setError('Logged in, but could not determine account status. Contact super admin.')
      return
    }

    if (data.role === 'super_admin') {
      router.replace('/super-admin')
    } else if (data.role === 'institution_admin') {
      if (data.next_step === 'enter_verification_code') {
        router.replace('/institution-admin/verify')
      } else {
        router.replace('/institution-admin')
      }
    } else if (data.role === 'responder') {
      router.replace('/user')
    } else if (data.role === 'user' && data.next_step === 'enter_institution_code') {
      router.replace('/join-institution')
    } else if (data.role === 'user') {
      router.replace('/user')
    } else {
      setError('Account role could not be determined. Contact support.')
    }
  }

  return (
    <div className="resq-shell">
      <GlobeBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 120, height: 120 }}>
              <img src="/icon.svg" alt="RESQ" width="120" height="120" />
            </div>
          </div>
          <h1 className="resq-h1" style={{ fontSize: 28, marginBottom: 24 }}>{t('signIn')}</h1>
          <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <label className="resq-subtle">{t('email')}</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="resq-input"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label className="resq-subtle">{t('password')}</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="resq-input"
          />
        </div>
        {error && <p style={{ color: '#ff8080' }}>{error}</p>}
        <button type="submit" disabled={loading} className="resq-btn-primary" style={{ width: '100%' }}>
          {loading ? t('signingIn') : t('signInButton')}
        </button>
          </form>
          <p className="resq-subtle" style={{ marginTop: 16 }}>
            <a href="/signup">{t('createAccount')}</a> · <a href="/forgot-password">{t('forgotPassword')}</a>
          </p>
        </div>
      </div>
    </div>
  )
}
