'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import GlobeBackground from '../../components/GlobeBackground'
import RadarSweepBackground from '../../components/RadarSweepBackground'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useTranslation } from '../../lib/i18n/LanguageContext'

export default function JoinInstitutionPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [mode, setMode] = useState('private')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (!data.session) router.replace('/login') })
  }, [router])

  async function handleJoin(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: joinError } = await supabase.rpc('join_institution_by_code', { code: code.trim().toUpperCase() })
    setLoading(false)
    if (joinError || !data?.success) {
      setError(data?.error || joinError?.message || 'Could not join institution')
      return
    }
    router.replace('/user')
  }

  async function handleGoPublic() {
    setError('')
    setLoading(true)
    const { data, error: modeError } = await supabase.rpc('set_account_mode', { mode: 'public' })
    setLoading(false)
    if (modeError || !data?.success) {
      setError(data?.error || modeError?.message || 'Could not switch to a public account')
      return
    }
    router.replace('/user')
  }

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-tilt-card resq-fade-in" style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 120, height: 120 }}>
              <img src="/icon.svg" alt="RESQ" width="120" height="120" />
            </div>
          </div>
          <h1 className="resq-h1" style={{ fontSize: 28 }}>{t('connectInstitution')}</h1>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, marginBottom: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
            <button
              type="button"
              onClick={() => setMode('private')}
              className={mode === 'private' ? 'resq-btn-primary' : 'resq-btn-secondary'}
              style={{ flex: 1, border: 'none' }}
            >
              Connected to an institution
            </button>
            <button
              type="button"
              onClick={() => setMode('public')}
              className={mode === 'public' ? 'resq-btn-primary' : 'resq-btn-secondary'}
              style={{ flex: 1, border: 'none' }}
            >
              General public
            </button>
          </div>

          {mode === 'private' ? (
            <>
              <p className="resq-subtle" style={{ margin: '8px 0 24px' }}>{t('connectInstitutionSubtitle')}</p>
              <form onSubmit={handleJoin}>
                <input className="resq-input" placeholder="RESQ-AB12CD" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" required />
                {error && <p style={{ color: '#ff8080' }}>{error}</p>}
                <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>{loading ? t('connecting') : t('connectButton')}</button>
              </form>
            </>
          ) : (
            <>
              <p className="resq-subtle" style={{ margin: '8px 0 24px' }}>
                No code needed. Your emergencies route to the nearest public institution (like police or a public
                hospital) that handles that type. You can connect to a specific institution later from Settings.
              </p>
              {error && <p style={{ color: '#ff8080' }}>{error}</p>}
              <button className="resq-btn-primary" style={{ width: '100%', marginTop: 4 }} onClick={handleGoPublic} disabled={loading}>
                {loading ? 'Setting up...' : 'Continue as general public'}
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  )
}