'use client'

// One page, three modes: sign in, create account, and password
// recovery — switchable with tabs instead of being three separate
// pages. /login, /signup, and /forgot-password all render this with
// a different `defaultMode`, so old links/bookmarks keep working.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import GlobeBackground from './GlobeBackground'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from '../lib/i18n/LanguageContext'

export default function AuthPage({ defaultMode = 'signin' }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [mode, setMode] = useState(defaultMode)

  const [signInForm, setSignInForm] = useState({ email: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setMessage('')
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword(signInForm)

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data, error: statusError } = await supabase.rpc('get_onboarding_status')
    setLoading(false)

    if (statusError) {
      setError('Logged in, but could not determine account status. Contact super admin.')
      return
    }

    if (data.role === 'super_admin') {
      router.replace('/super-admin')
    } else if (data.role === 'institution_admin') {
      router.replace(data.next_step === 'enter_verification_code' ? '/institution-admin/verify' : '/institution-admin')
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

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email: signUpForm.email.trim(),
      password: signUpForm.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirmed`,
        data: { role: 'user', full_name: signUpForm.fullName.trim(), phone: signUpForm.phone.trim() }
      }
    })

    setLoading(false)
    if (signupError) {
      setError(signupError.message)
      return
    }
    if (data.session) {
      router.replace('/join-institution')
      return
    }

    setMessage('Account created. Sign in with the password you just set.')
  }

  async function handleForgot(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setLoading(false)

    if (resetError) setError(resetError.message)
    else setMessage('If that email is registered, a password-reset link has been sent.')
  }

  const tabs = [
    { key: 'signin', label: t('signInButton') },
    { key: 'signup', label: t('createAccount') },
    { key: 'forgot', label: t('forgotPassword') }
  ]

  return (
    <div className="resq-shell">
      <GlobeBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 100, height: 100 }}>
              <img src="/icon.svg" alt="RESQ" width="100" height="100" />
            </div>
          </div>

          <div role="tablist" aria-label="Account access" style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={mode === tab.key}
                onClick={() => switchMode(tab.key)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'var(--resq-font-body)',
                  color: mode === tab.key ? '#fff' : 'var(--resq-text-secondary)',
                  background: mode === tab.key ? 'linear-gradient(135deg, var(--resq-red-bright), var(--resq-red))' : 'transparent',
                  transition: 'background 0.15s ease, color 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === 'signin' && (
            <div key="signin" className="resq-fade-in">
              <h1 className="resq-h1" style={{ fontSize: 26, marginBottom: 16 }}>{t('signIn')}</h1>
              <form onSubmit={handleSignIn}>
                <div style={{ marginBottom: 12 }}>
                  <label className="resq-subtle">{t('email')}</label><br />
                  <input
                    type="email"
                    className="resq-input"
                    value={signInForm.email}
                    onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                    required
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="resq-subtle">{t('password')}</label><br />
                  <input
                    type="password"
                    className="resq-input"
                    value={signInForm.password}
                    onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                    required
                  />
                </div>
                {error && <p style={{ color: '#ff8080' }}>{error}</p>}
                <button type="submit" disabled={loading} className="resq-btn-primary" style={{ width: '100%' }}>
                  {loading ? t('signingIn') : t('signInButton')}
                </button>
              </form>
            </div>
          )}

          {mode === 'signup' && (
            <div key="signup" className="resq-fade-in">
              <h1 className="resq-h1" style={{ fontSize: 26, marginBottom: 8 }}>{t('createAccountTitle')}</h1>
              <p className="resq-subtle" style={{ margin: '0 0 16px' }}>{t('createAccountSubtitle')}</p>
              <form onSubmit={handleSignUp}>
                <input className="resq-input" placeholder={t('fullName')} value={signUpForm.fullName} onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })} required />
                <input className="resq-input" style={{ marginTop: 12 }} type="email" placeholder={t('email')} value={signUpForm.email} onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })} required />
                <input className="resq-input" style={{ marginTop: 12 }} placeholder={t('phoneNumber')} value={signUpForm.phone} onChange={(e) => setSignUpForm({ ...signUpForm, phone: e.target.value })} required />
                <input className="resq-input" style={{ marginTop: 12 }} type="password" minLength={8} placeholder={t('passwordHint')} value={signUpForm.password} onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })} required />
                {error && <p style={{ color: '#ff8080' }}>{error}</p>}
                {message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}
                <button className="resq-btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
                  {loading ? t('creatingAccount') : t('createAccountButton')}
                </button>
              </form>
            </div>
          )}

          {mode === 'forgot' && (
            <div key="forgot" className="resq-fade-in">
              <h1 className="resq-h1" style={{ fontSize: 26, marginBottom: 8 }}>{t('resetPasswordTitle')}</h1>
              <p className="resq-subtle" style={{ margin: '0 0 16px' }}>{t('resetPasswordSubtitle')}</p>
              <form onSubmit={handleForgot}>
                <input className="resq-input" type="email" placeholder={t('email')} value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                {error && <p style={{ color: '#ff8080' }}>{error}</p>}
                {message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}
                <button className="resq-btn-primary" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
                  {loading ? t('sending') : t('sendResetLink')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
