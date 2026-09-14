'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import GlobeBackground from '../../components/GlobeBackground'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useTranslation } from '../../lib/i18n/LanguageContext'

export default function SignupPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/join-institution`,
        data: { role: 'user', full_name: form.fullName.trim(), phone: form.phone.trim() }
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

    setMessage('Account created. Return to login and use the password you just set.')
  }

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 120, height: 120 }}>
              <img src="/icon.svg" alt="RESQ" width="120" height="120" />
            </div>
          </div>
          <h1 className="resq-h1" style={{ fontSize: 28 }}>{t('createAccountTitle')}</h1>
          <p className="resq-subtle" style={{ margin: '8px 0 24px' }}>{t('createAccountSubtitle')}</p>
          <form onSubmit={handleSignup}>
            <input className="resq-input" placeholder={t('fullName')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <input className="resq-input" style={{ marginTop: 12 }} type="email" placeholder={t('email')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className="resq-input" style={{ marginTop: 12 }} placeholder={t('phoneNumber')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <input className="resq-input" style={{ marginTop: 12 }} type="password" minLength={8} placeholder={t('passwordHint')} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            {error && <p style={{ color: '#ff8080' }}>{error}</p>}
            {message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}
            <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>{loading ? t('creatingAccount') : t('createAccountButton')}</button>
          </form>
          <p className="resq-subtle" style={{ marginTop: 18 }}>{t('alreadyHaveAccount')} <a href="/login">{t('signInHere')}</a></p>
        </section>
      </div>
    </main>
  )
}