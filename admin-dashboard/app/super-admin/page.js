// app/super-admin/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'
import GuardianShield from '../../components/GuardianShield'
import HeartMonitorLine from '../../components/HeartMonitorLine'
import LoadingScreen from '../../components/LoadingScreen'
import LanguageSwitcher from '../../components/LanguageSwitcher'

const STATUS_COLORS = {
  pending_verification: '#e0b34d',
  active: '#3fe08a',
  suspended: '#ff8080'
}

export default function SuperAdminPage() {
  const [institutions, setInstitutions] = useState([])
  const [emergencySummary, setEmergencySummary] = useState({})
  const [activeEmergencyCount, setActiveEmergencyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAccessAndLoad()
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
    await loadInstitutions()
    await loadActiveEmergencyCount()
    await loadEmergencySummary()
  }

  async function loadInstitutions() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setInstitutions(data)
    }
    setLoading(false)
  }

  async function loadActiveEmergencyCount() {
    const { count } = await supabase
      .from('emergencies')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved')
    setActiveEmergencyCount(count || 0)
  }

  // Totals only, per institution — not the raw emergency list, which
  // is the institution admin's view, not super admin's.
  async function loadEmergencySummary() {
    const { data, error: rpcError } = await supabase.rpc('get_institution_emergency_summary')
    if (rpcError) return
    const byInstitution = {}
    for (const row of data || []) {
      byInstitution[row.institution_id] = { active: row.active_count, resolved: row.resolved_count }
    }
    setEmergencySummary(byInstitution)
  }

  async function toggleStatus(institution) {
    const newStatus = institution.status === 'suspended' ? 'active' : 'suspended'
    const { error: updateError } = await supabase
      .from('institutions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', institution.id)

    if (updateError) {
      alert('Failed to update: ' + updateError.message)
      return
    }
    loadInstitutions()
  }

  async function changeTier(institution, newTier) {
    const { error: updateError } = await supabase
      .from('institutions')
      .update({ subscription_tier: newTier, updated_at: new Date().toISOString() })
      .eq('id', institution.id)

    if (updateError) {
      alert('Failed to update: ' + updateError.message)
      return
    }
    loadInstitutions()
  }

  async function deleteInstitution(institution) {
    const confirmed = window.confirm(
      `Delete "${institution.name}" permanently? This removes all its admins, responders, users, and emergency records. This cannot be undone.`
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('institutions')
      .delete()
      .eq('id', institution.id)

    if (deleteError) {
      alert('Failed to delete: ' + deleteError.message)
      return
    }
    loadInstitutions()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // Self-serve disaster-recovery snapshot — independent of whatever
  // backup/PITR tier the Supabase project is on. Downloads a full JSON
  // dump of every core table straight to the admin's device.
  async function downloadBackup() {
    setError('')
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) return

    try {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Backup failed (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resq-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  const hasActiveAlert = activeEmergencyCount > 0

  if (!authorized) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <div className="resq-content"><LoadingScreen label="Checking access…" /></div>
      </main>
    )
  }

  return (
    <div className={'resq-shell' + (hasActiveAlert ? ' resq-alert-shell' : '')}>
      <EmergencyPulseBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 40, maxWidth: 1100, margin: '0 auto' }}>
      <div className="resq-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h1 className="resq-h1">RESQ Super Admin</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                `${typeof window !== 'undefined' ? window.location.origin : ''}/download`
              )}`}
              alt="Download RESQ"
              width={60}
              height={60}
            />
            <div className="resq-subtle" style={{ fontSize: 11 }}>Download RESQ</div>
          </div>
          <Link href="/super-admin/create" className="resq-btn-primary" style={{ textDecoration: 'none' }}>
            + New Institution
          </Link>
          <Link href="/super-admin/animation-lab" className="resq-btn-secondary" style={{ textDecoration: 'none' }}>
            🎛 Animation Lab
          </Link>
          <button className="resq-btn-secondary" onClick={downloadBackup} title="Download a full JSON snapshot of all data — a self-serve recovery point in addition to Supabase's own backups">
            ⬇ Download Backup
          </button>
          <button className="resq-btn-secondary" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      {!loading && institutions.length > 0 && (
        <div className="resq-fade-in resq-fade-in-2" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, margin: '4px 0 24px' }}>
          <GuardianShield
            buildingCount={institutions.length}
            alert={hasActiveAlert}
            size={170}
            label={hasActiveAlert ? `Responding to ${activeEmergencyCount} active emergenc${activeEmergencyCount === 1 ? 'y' : 'ies'}` : `Watching over ${institutions.length} institution${institutions.length === 1 ? '' : 's'}`}
          />
          <div style={{ flex: '1 1 260px', minWidth: 260 }}>
            <HeartMonitorLine alert={hasActiveAlert} label={hasActiveAlert ? 'Active emergency' : 'All clear'} />
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ff8080' }}>{error}</p>}
      {loading && <p className="resq-subtle">Loading institutions...</p>}

      {!loading && institutions.length === 0 && (
        <p className="resq-subtle">No institutions yet. Click "+ New Institution" to create your first one.</p>
      )}

      {!loading && institutions.length > 0 && (
        <section className="glass-card resq-fade-in resq-fade-in-2" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Tier</th>
              <th style={{ padding: 10 }}>Emergencies</th>
              <th style={{ padding: 10 }}>Institution Code</th>
              <th style={{ padding: 10 }}>Verification Code</th>
              <th style={{ padding: 10 }}>QR Code</th>
              <th style={{ padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst) => (
              <tr key={inst.id} className="resq-row-interactive">
                <td style={{ padding: 10 }}>
                  <strong>{inst.name}</strong><br />
                  <small className="resq-subtle">{inst.contact_email}</small>
                </td>
                <td style={{ padding: 10 }}>
                  <span style={{ color: STATUS_COLORS[inst.status] || 'var(--resq-text-primary)', fontWeight: 'bold' }}>
                    {inst.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: 10 }}>
                  <select className="resq-input" value={inst.subscription_tier} onChange={(e) => changeTier(inst, e.target.value)}>
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>
                <td style={{ padding: 10 }}>
                  {(() => {
                    const summary = emergencySummary[inst.id] || { active: 0, resolved: 0 }
                    return (
                      <>
                        <span className={summary.active > 0 ? 'resq-badge resq-badge-open' : 'resq-badge resq-badge-resolved'}>
                          {summary.active} active
                        </span>
                        <span className="resq-subtle" style={{ marginLeft: 8, fontSize: 12 }}>{summary.resolved} resolved</span>
                      </>
                    )
                  })()}
                </td>
                <td style={{ padding: 10, fontFamily: 'monospace' }}>{inst.institution_code}</td>
                <td style={{ padding: 10, fontFamily: 'monospace' }}>
                  {inst.verification_code_used ? (
                    <span className="resq-subtle">used</span>
                  ) : (
                    inst.verification_code
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                      `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inst.institution_code}`
                    )}`}
                    alt={`QR code for ${inst.name}`}
                    width={80}
                    height={80}
                  />
                </td>
                <td style={{ padding: 10 }}>
                  <button className="resq-btn-secondary" onClick={() => toggleStatus(inst)} style={{ marginRight: 8 }}>
                    {inst.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                  <button className="resq-btn-secondary" onClick={() => deleteInstitution(inst)} style={{ color: '#ff8080' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </section>
      )}
      </div>
    </div>
  )
}
