// app/auth/confirmed/page.js
// Where Supabase's email confirmation link redirects to. Supabase's
// own hosted error page was showing when the link's redirect target
// wasn't recognized — this page exists so a successful confirmation
// always reads as a clear success message, not an error, regardless
// of what happened just before landing here.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import GlobeBackground from '../../../components/GlobeBackground'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

export default function EmailConfirmedPage() {
  const router = useRouter()
  const [status, setStatus] = useState('checking') // checking | success | failed

  useEffect(() => {
    let cancelled = false

    async function check() {
      // supabase-js auto-detects the session from the URL fragment
      // Supabase's confirmation redirect appends; give it a moment.
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          if (!cancelled) setStatus('success')
          return
        }
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
      if (!cancelled) setStatus('failed')
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.replace('/join-institution'), 1800)
      return () => clearTimeout(timer)
    }
  }, [status, router])

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 100, height: 100 }}>
              <img src="/icon.svg" alt="RESQ" width="100" height="100" />
            </div>
          </div>

          {status === 'checking' && (
            <>
              <h1 className="resq-h1" style={{ fontSize: 24 }}>Confirming your email…</h1>
              <p className="resq-subtle" style={{ marginTop: 8 }}>One moment.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <h1 className="resq-h1" style={{ fontSize: 24, color: 'var(--resq-green)' }}>Email verified successfully</h1>
              <p className="resq-subtle" style={{ marginTop: 8 }}>Taking you to connect your institution…</p>
            </>
          )}

          {status === 'failed' && (
            <>
              <h1 className="resq-h1" style={{ fontSize: 24 }}>Could not confirm automatically</h1>
              <p className="resq-subtle" style={{ marginTop: 8 }}>
                Your email may already be verified. Try signing in below.
              </p>
              <a href="/login" className="resq-btn-primary" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none' }}>
                Go to Sign In
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
