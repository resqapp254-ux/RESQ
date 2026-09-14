// app/institution-admin/verify/page.js
// Shown on first login only, until the institution_admin enters
// the verification code super_admin sent them.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import GlobeBackground from '../../../components/GlobeBackground'

export default function VerifyInstitutionPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: rpcError } = await supabase.rpc('redeem_verification_code', { code })

    setLoading(false)

    if (rpcError || !data.success) {
      setError(data?.error || rpcError?.message || 'Verification failed')
      return
    }

    router.push('/institution-admin')
  }

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 96, height: 96 }}>
              <img src="/icon.svg" alt="RESQ" width="96" height="96" />
            </div>
          </div>
          <h1 className="resq-h1" style={{ fontSize: 26, textAlign: 'center' }}>Activate Your Institution</h1>
          <p className="resq-subtle" style={{ margin: '8px 0 24px', textAlign: 'center' }}>
            Enter the verification code sent to you by the RESQ super admin.
          </p>
          <form onSubmit={handleVerify}>
            <input
              className="resq-input"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Verification code"
              required
            />
            {error && <p style={{ color: '#ff8080' }}>{error}</p>}
            <button className="resq-btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 20 }}>
              {loading ? 'Verifying...' : 'Activate Institution'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
