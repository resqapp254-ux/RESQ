// app/auth/mobile-bridge/page.js
//
// The mobile app's AdminWebView used to point straight at /login,
// which meant an admin who had just signed in natively was asked for
// their password again inside the WebView — two logins for one
// session. This page lets the native app hand its already-established
// Supabase session to the WebView via the URL fragment (never sent to
// the server, unlike a query string), so the admin lands directly on
// their dashboard instead.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import GlobeBackground from '../../../components/GlobeBackground'

export default function MobileBridgePage() {
  const router = useRouter()
  const [status, setStatus] = useState('checking') // checking | failed

  useEffect(() => {
    let cancelled = false

    async function bridge() {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      // Clear the tokens from the visible URL/history immediately —
      // they've done their job once read.
      window.history.replaceState(null, '', window.location.pathname)

      if (!access_token || !refresh_token) {
        if (!cancelled) setStatus('failed')
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
      if (sessionError) {
        if (!cancelled) setStatus('failed')
        return
      }

      const { data, error: statusError } = await supabase.rpc('get_onboarding_status')
      if (cancelled) return

      if (statusError || !data?.role) {
        setStatus('failed')
        return
      }

      if (data.role === 'super_admin') {
        router.replace('/super-admin')
      } else if (data.role === 'institution_admin') {
        router.replace(data.next_step === 'enter_verification_code' ? '/institution-admin/verify' : '/institution-admin')
      } else {
        router.replace('/login')
      }
    }

    bridge()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          {status === 'checking' && (
            <>
              <h1 className="resq-h1" style={{ fontSize: 22 }}>Signing you in…</h1>
              <p className="resq-subtle" style={{ marginTop: 8 }}>One moment.</p>
            </>
          )}
          {status === 'failed' && (
            <>
              <h1 className="resq-h1" style={{ fontSize: 22 }}>Could not sign you in automatically</h1>
              <p className="resq-subtle" style={{ marginTop: 8 }}>Please sign in below.</p>
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
