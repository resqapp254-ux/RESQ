// app/institution-admin/verify/page.js
// Shown on first login only, until the institution_admin enters
// the verification code super_admin sent them.

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'

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
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>Activate Your Institution</h1>
      <p>Enter the verification code sent to you by the RESQ super admin.</p>
      <form onSubmit={handleVerify}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Verification code"
          required
          style={{ width: '100%', padding: 8, marginBottom: 12 }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Verifying...' : 'Activate Institution'}
        </button>
      </form>
    </div>
  )
}
