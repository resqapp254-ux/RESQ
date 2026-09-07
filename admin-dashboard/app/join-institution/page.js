'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function JoinInstitutionPage() {
  const router = useRouter()
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

  return (
    <main className="resq-shell">
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card" style={{ width: '100%', maxWidth: 440 }}>
          <h1 className="resq-h1" style={{ fontSize: 28 }}>Connect your institution</h1>
          <p className="resq-subtle" style={{ margin: '8px 0 24px' }}>Enter the code provided by your school, workplace, or community organization.</p>
          <form onSubmit={handleJoin}>
            <input className="resq-input" placeholder="RESQ-AB12CD" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" required />
            {error && <p style={{ color: '#ff8080' }}>{error}</p>}
            <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={loading}>{loading ? 'Connecting...' : 'Connect institution'}</button>
          </form>
        </section>
      </div>
    </main>
  )
}