// app/super-admin/terminal/page.js
// A live operations terminal for the super admin: every signed-up
// account with its sign-in/confirmation/ban status (from Supabase
// Auth directly, via /api/admin/users), plus a live-scrolling feed of
// app-level events — rate limits hit, unauthorized attempts, blocked
// triggers, and new institutions/responders/units created.
//
// What this can't show: Supabase Auth's own failed-password-attempt
// logs. Those live only in Supabase's Dashboard → Logs Explorer —
// there's no API this app's service-role key can use to read them.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import LoadingScreen from '../../../components/LoadingScreen'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const EVENT_COLORS = {
  auth_failed: '#ff8080',
  rate_limited: '#e0b34d',
  trigger_blocked_no_responder: '#ff2b2b',
  emergency_triggered: '#3fe08a',
  institution_created: '#7fe3f2',
  responder_created: '#7fe3f2',
  unit_admin_created: '#7fe3f2',
  account_self_deleted: '#e0b34d',
  account_self_deactivated: '#e0b34d',
  account_removed_by_admin: '#e0b34d'
}

function formatEvent(e) {
  const time = new Date(e.created_at).toLocaleTimeString()
  return `[${time}] ${e.event_type}${e.detail ? ' — ' + e.detail : ''}`
}

export default function TerminalPage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('activity')
  const [users, setUsers] = useState([])
  const [usersError, setUsersError] = useState('')
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    checkAccessAndLoad()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkAccessAndLoad() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace('/login')
      return
    }
    const { data: statusData, error: statusError } = await supabase.rpc('get_onboarding_status')
    if (statusError || statusData.role !== 'super_admin') {
      router.replace('/login')
      return
    }
    setAuthorized(true)

    await Promise.all([loadUsers(sessionData.session.access_token), loadLogs()])
    setLoading(false)

    const channel = supabase
      .channel('activity-log-terminal')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 300))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  async function loadUsers(accessToken) {
    const res = await fetch('/api/admin/users', { headers: { Authorization: 'Bearer ' + accessToken } })
    const result = await res.json()
    if (!result.success) {
      setUsersError(result.error || 'Failed to load users')
      return
    }
    setUsers(result.users)
  }

  async function loadLogs() {
    const { data } = await supabase
      .from('activity_log')
      .select('id, event_type, detail, user_id, institution_id, created_at')
      .order('created_at', { ascending: false })
      .limit(300)
    setLogs(data || [])
  }

  if (!authorized || loading) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <div className="resq-content"><LoadingScreen label="Loading terminal…" /></div>
      </main>
    )
  }

  const filteredLogs = filter ? logs.filter((l) => l.event_type === filter) : logs
  const eventTypes = [...new Set(logs.map((l) => l.event_type))]
  const newToday = users.filter((u) => new Date(u.created_at).toDateString() === new Date().toDateString()).length
  const signedInToday = users.filter((u) => u.last_sign_in_at && new Date(u.last_sign_in_at).toDateString() === new Date().toDateString()).length

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
        <Link href="/super-admin">&larr; Back to Dashboard</Link>
        <h1 className="resq-h1" style={{ fontSize: 26, marginTop: 12 }}>🖥 Terminal</h1>
        <p className="resq-subtle" style={{ marginTop: 4 }}>
          Live signups, sign-ins, and app-level events. Supabase Auth's own failed-login security logs live only in
          the Supabase Dashboard's Logs Explorer — not reproducible here without a Management API token.
        </p>

        <div className="glass-card resq-fade-in" style={{ display: 'flex', gap: 24, flexWrap: 'wrap', margin: '16px 0' }}>
          <div><strong style={{ fontSize: 22 }}>{users.length}</strong><div className="resq-subtle" style={{ fontSize: 12 }}>Total accounts</div></div>
          <div><strong style={{ fontSize: 22, color: '#3fe08a' }}>{newToday}</strong><div className="resq-subtle" style={{ fontSize: 12 }}>New today</div></div>
          <div><strong style={{ fontSize: 22, color: '#7fe3f2' }}>{signedInToday}</strong><div className="resq-subtle" style={{ fontSize: 12 }}>Signed in today</div></div>
          <div><strong style={{ fontSize: 22, color: '#ff8080' }}>{users.filter((u) => u.banned_until).length}</strong><div className="resq-subtle" style={{ fontSize: 12 }}>Banned/deactivated</div></div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button className={tab === 'activity' ? 'resq-btn-primary' : 'resq-btn-secondary'} onClick={() => setTab('activity')}>Activity Log</button>
          <button className={tab === 'users' ? 'resq-btn-primary' : 'resq-btn-secondary'} onClick={() => setTab('users')}>Users &amp; Sessions</button>
        </div>

        {tab === 'activity' && (
          <section className="glass-card resq-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>Live Feed</h2>
              <select className="resq-input" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 260 }}>
                <option value="">All event types</option>
                {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div
              style={{
                background: '#03050a',
                border: '1px solid var(--resq-glass-border)',
                borderRadius: 10,
                padding: 14,
                height: 480,
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: 12.5
              }}
            >
              {filteredLogs.length === 0 && <div className="resq-subtle">No events recorded yet.</div>}
              {filteredLogs.map((l) => (
                <div key={l.id} style={{ color: EVENT_COLORS[l.event_type] || '#f4f6fb', marginBottom: 4, whiteSpace: 'pre-wrap' }}>
                  {formatEvent(l)}
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'users' && (
          <section className="glass-card resq-fade-in" style={{ overflowX: 'auto' }}>
            <h2 style={{ marginTop: 0 }}>Users &amp; Sessions</h2>
            {usersError && <p style={{ color: '#ff8080' }}>{usersError}</p>}
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Email / Phone</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Role</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Institution</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Signed up</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Last sign-in</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: 8 }}>{u.email || u.phone || '—'}</td>
                    <td style={{ padding: 8, textTransform: 'capitalize' }}>{(u.role || 'unknown').replace('_', ' ')}</td>
                    <td style={{ padding: 8 }}>{u.institution_name || '—'}</td>
                    <td style={{ padding: 8 }}>{new Date(u.created_at).toLocaleString()}</td>
                    <td style={{ padding: 8 }}>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}</td>
                    <td style={{ padding: 8 }}>
                      {u.banned_until ? <span style={{ color: '#ff8080' }}>Banned</span> :
                        !u.is_active ? <span style={{ color: '#ff8080' }}>Deactivated</span> :
                        !u.email_confirmed_at ? <span style={{ color: '#e0b34d' }}>Unconfirmed</span> :
                        <span style={{ color: '#3fe08a' }}>Active</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  )
}
