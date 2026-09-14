'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import GlobeBackground from '../../components/GlobeBackground'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useTranslation } from '../../lib/i18n/LanguageContext'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
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

  return <main className="resq-shell"><GlobeBackground /><LanguageSwitcher /><div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 440 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><div style={{ width: 120, height: 120 }}><img src="/icon.svg" alt="RESQ" width="120" height="120" /></div></div><h1 className="resq-h1" style={{ fontSize: 28 }}>{t('resetPasswordTitle')}</h1><p className="resq-subtle" style={{ margin: '8px 0 24px' }}>{t('resetPasswordSubtitle')}</p><form onSubmit={handleSubmit}><input className="resq-input" type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />{error && <p style={{ color: '#ff8080' }}>{error}</p>}{message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}<button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>{loading ? t('sending') : t('sendResetLink')}</button></form><p className="resq-subtle" style={{ marginTop: 18 }}><a href="/login">{t('backToLogin')}</a></p></section></div></main>
}