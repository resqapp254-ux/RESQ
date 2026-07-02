// app/login/page.js
// Shared login for super_admin and institution_admin.
// After login, redirects based on get_onboarding_status().

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
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
      router.push('/super-admin')
    } else if (data.role === 'institution_admin') {
      if (data.next_step === 'enter_verification_code') {
        router.push('/institution-admin/verify')
      } else {
        router.push('/institution-admin')
      }
    } else {
      setError('This login is for super admins and institution admins only.')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>RESQ Admin Login</h1>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label><br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label><br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
