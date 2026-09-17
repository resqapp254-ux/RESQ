'use client'

// Lets a `user` (not a responder/admin) toggle between a public
// account (no institution, routes to the nearest public institution)
// and a private one, switch between institutions they've already
// joined without re-entering a code, and join an additional
// institution by code. Mounted on the /user dashboard for the user
// role only.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MyInstitutionsPanel({ onChanged }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('private')
  const [activeInstitutionId, setActiveInstitutionId] = useState('')
  const [institutions, setInstitutions] = useState([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_mode, institution_id')
      .eq('id', userData.user.id)
      .single()

    setMode(profile?.account_mode || 'private')
    setActiveInstitutionId(profile?.institution_id || '')

    const { data: links } = await supabase
      .from('user_institutions')
      .select('institution_id, institutions(id, name)')
      .order('added_at', { ascending: true })

    setInstitutions((links || []).map((l) => l.institutions).filter(Boolean))
    setLoaded(true)
  }

  async function refreshAndNotify() {
    await load()
    onChanged?.()
  }

  async function handleGoPublic() {
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('set_account_mode', { mode: 'public' })
    setBusy(false)
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || 'Could not switch modes')
      return
    }
    await refreshAndNotify()
  }

  async function handleGoPrivate() {
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('set_account_mode', { mode: 'private' })
    setBusy(false)
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || 'Join an institution by code first')
      return
    }
    await refreshAndNotify()
  }

  async function handleSwitch(institutionId) {
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('switch_active_institution', { target_institution_id: institutionId })
    setBusy(false)
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || 'Could not switch institution')
      return
    }
    await refreshAndNotify()
  }

  async function handleAddCode(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('join_institution_by_code', { code: code.trim().toUpperCase() })
    setBusy(false)
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || 'Could not join institution')
      return
    }
    setCode('')
    await refreshAndNotify()
  }

  if (!loaded) return null

  return (
    <section className="glass-card resq-fade-in" style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>
          <strong>My Institutions</strong>{' '}
          <span className="resq-subtle" style={{ fontSize: 13 }}>
            ({mode === 'public' ? 'General public' : institutions.find((i) => i.id === activeInstitutionId)?.name || 'None active'})
          </span>
        </span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              type="button"
              className={mode === 'private' ? 'resq-btn-primary' : 'resq-btn-secondary'}
              style={{ flex: 1 }}
              onClick={handleGoPrivate}
              disabled={busy || mode === 'private'}
            >
              Connected to an institution
            </button>
            <button
              type="button"
              className={mode === 'public' ? 'resq-btn-primary' : 'resq-btn-secondary'}
              style={{ flex: 1 }}
              onClick={handleGoPublic}
              disabled={busy || mode === 'public'}
            >
              General public
            </button>
          </div>

          {error && <p style={{ color: '#ff8080', fontSize: 13 }}>{error}</p>}

          {mode === 'private' && institutions.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p className="resq-subtle" style={{ marginBottom: 6, fontSize: 13 }}>Switch which institution is active:</p>
              {institutions.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  className="resq-btn-secondary"
                  onClick={() => handleSwitch(inst.id)}
                  disabled={busy || inst.id === activeInstitutionId}
                  style={{ marginRight: 8, marginBottom: 8, opacity: inst.id === activeInstitutionId ? 0.5 : 1 }}
                >
                  {inst.id === activeInstitutionId ? '✓ ' : ''}{inst.name}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleAddCode} style={{ display: 'flex', gap: 8 }}>
            <input
              className="resq-input"
              placeholder="Add institution code, e.g. RESQ-AB12CD"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoCapitalize="characters"
              style={{ flex: 1 }}
            />
            <button className="resq-btn-secondary" disabled={busy}>Add</button>
          </form>
        </div>
      )}
    </section>
  )
}
