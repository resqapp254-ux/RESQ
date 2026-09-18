'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import GlobeBackground from '../../components/GlobeBackground'
import RadarSweepBackground from '../../components/RadarSweepBackground'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import PasswordInput from '../../components/PasswordInput'
import { useTranslation } from '../../lib/i18n/LanguageContext'
import { friendlyAuthError } from '../../lib/authErrors'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [ready, setReady] = useState(false)
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session))) }, [])
  async function handleSubmit(event) {
    event.preventDefault(); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(friendlyAuthError(updateError, 'Could not update your password right now. Please try again in a moment.'))
    else { setMessage('Password updated.'); setTimeout(() => router.replace('/login'), 1000) }
  }
  return <main className="resq-shell"><GlobeBackground /><RadarSweepBackground /><LanguageSwitcher /><div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}><section className="glass-card resq-tilt-card resq-fade-in" style={{ width: '100%', maxWidth: 440 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><div style={{ width: 120, height: 120 }}><img src="/icon.svg" alt="RESQ" width="120" height="120" /></div></div><h1 className="resq-h1" style={{ fontSize: 28 }}>{t('chooseNewPassword')}</h1>{ready ? <form onSubmit={handleSubmit}><PasswordInput className="resq-input" wrapperStyle={{ marginTop: 24 }} minLength={8} placeholder={t('newPasswordHint')} value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p style={{ color: '#ff8080' }}>{error}</p>}{message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}<button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }}>{t('updatePassword')}</button></form> : <p className="resq-subtle" style={{ marginTop: 16 }}>Open this page from the reset link in your email.</p>}</section></div></main>
}