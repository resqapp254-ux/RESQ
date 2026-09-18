// app/super-admin/page.js
'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'
import GuardianShield from '../../components/GuardianShield'
import HeartMonitorLine from '../../components/HeartMonitorLine'
import LoadingScreen from '../../components/LoadingScreen'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import SignOutOverlay from '../../components/SignOutOverlay'
import { ManagementFlowDiagram, EmergencyFlowDiagram } from '../../components/FlowDiagrams'
import { buildAllInstitutionsReportHtml, downloadHtmlFile } from '../../lib/buildEmergencyReport'

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
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [uploadingLogoFor, setUploadingLogoFor] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [downloadingSolvedReport, setDownloadingSolvedReport] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [expandedInstId, setExpandedInstId] = useState(null)
  const [instResponders, setInstResponders] = useState({})
  const [loadingResponders, setLoadingResponders] = useState(null)
  const [showFlow, setShowFlow] = useState(false)
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
      .in('status', ['triggered', 'claimed', 'in_progress'])
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

  async function toggleResponderDrilldown(inst) {
    if (expandedInstId === inst.id) {
      setExpandedInstId(null)
      return
    }
    setExpandedInstId(inst.id)
    if (instResponders[inst.id]) return // already loaded, cached
    setLoadingResponders(inst.id)
    const [{ data: people }, { data: units }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, phone, role, is_active, service_id')
        .eq('institution_id', inst.id)
        .in('role', ['institution_admin', 'unit_admin', 'responder']),
      supabase
        .from('institution_services')
        .select('id, name, service_type')
        .eq('institution_id', inst.id)
    ])
    const unitNameById = {}
    for (const u of units || []) unitNameById[u.id] = u.name
    const rows = (people || []).map((p) => ({
      ...p,
      unitName: p.service_id ? unitNameById[p.service_id] || 'Partner unit' : null
    }))
    setInstResponders((prev) => ({ ...prev, [inst.id]: rows }))
    setLoadingResponders(null)
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

  async function downloadContract(institution) {
    const { data: contract, error: fetchError } = await supabase
      .from('institution_contracts')
      .select('*')
      .eq('institution_id', institution.id)
      .maybeSingle()

    if (fetchError) {
      alert('Failed to load contract: ' + fetchError.message)
      return
    }
    if (!contract) {
      alert(`${institution.name} has not signed the service agreement yet.`)
      return
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>RESQ Service Agreement: ${contract.company_name}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:32px auto;padding:0 16px;line-height:1.6;color:#1a1a1a}
h1{font-size:20px;border-bottom:2px solid #cc0000;padding-bottom:8px}table{border-collapse:collapse;width:100%;margin-top:12px}
th{text-align:left;padding:6px 12px 6px 0;color:#555;width:220px;vertical-align:top}td{padding:6px 0}</style></head>
<body><h1>RESQ Service Agreement</h1><table>
<tr><th>Company / institution</th><td>${contract.company_name}</td></tr>
<tr><th>Signed by</th><td>${contract.signee_name}${contract.signee_title ? ' (' + contract.signee_title + ')' : ''}</td></tr>
<tr><th>Contact email</th><td>${contract.signee_email}</td></tr>
<tr><th>Contact phone</th><td>${contract.signee_phone || 'Not provided'}</td></tr>
<tr><th>Agreed to Terms of Service</th><td>${contract.agreed_terms ? 'Yes' : 'No'}</td></tr>
<tr><th>Agreed to Privacy Policy</th><td>${contract.agreed_privacy ? 'Yes' : 'No'}</td></tr>
<tr><th>Agreed to responsibilities</th><td>${contract.agreed_responsibilities ? 'Yes' : 'No'}</td></tr>
<tr><th>Agreed to data handling</th><td>${contract.agreed_data_handling ? 'Yes' : 'No'}</td></tr>
<tr><th>Contract version</th><td>${contract.contract_version}</td></tr>
<tr><th>Signed at</th><td>${new Date(contract.signed_at).toLocaleString()}</td></tr>
</table></body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resq-contract-${institution.institution_code}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function toggleVisibility(institution) {
    const goingPublic = institution.visibility !== 'public'
    let lat = institution.lat
    let lng = institution.lng

    if (goingPublic && (lat == null || lng == null)) {
      const latInput = window.prompt('Public institutions are matched by distance to the emergency. Enter this institution\'s latitude:')
      if (latInput === null) return
      const lngInput = window.prompt('Longitude:')
      if (lngInput === null) return
      lat = parseFloat(latInput)
      lng = parseFloat(lngInput)
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        alert('Latitude and longitude must be numbers.')
        return
      }
    }

    const { error: updateError } = await supabase
      .from('institutions')
      .update({ visibility: goingPublic ? 'public' : 'private', lat, lng, updated_at: new Date().toISOString() })
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

  function startEditName(institution) {
    setEditingId(institution.id)
    setEditName(institution.name)
  }

  async function saveEditName(institution) {
    const trimmed = editName.trim()
    if (!trimmed) return
    const { error: updateError } = await supabase
      .from('institutions')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', institution.id)

    if (updateError) {
      alert('Failed to rename: ' + updateError.message)
      return
    }
    setEditingId(null)
    loadInstitutions()
  }

  async function uploadLogo(institution, file) {
    if (!file) return
    const maxBytes = 3 * 1024 * 1024
    if (file.size > maxBytes) {
      alert('Logo image is too large. Please use one under 3MB.')
      return
    }

    setUploadingLogoFor(institution.id)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const path = `${institution.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('institution-logos')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('institution-logos').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('institutions')
        .update({ logo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', institution.id)
      if (updateError) throw updateError

      loadInstitutions()
    } catch (err) {
      alert('Failed to upload logo: ' + err.message)
    } finally {
      setUploadingLogoFor(null)
    }
  }

  async function deleteInstitution(institution) {
    const confirmed = window.confirm(
      `Delete "${institution.name}" permanently? This removes all its admins, responders, users, and emergency records. ` +
      `This cannot be undone. A full record download will be prepared first, for your own record-keeping.`
    )
    if (!confirmed) return

    setDeletingId(institution.id)
    try {
      const [profiles, emergencies, services, chatMessages] = await Promise.all([
        supabase.from('profiles').select('*').eq('institution_id', institution.id),
        supabase.from('emergencies').select('*').eq('institution_id', institution.id),
        supabase.from('institution_services').select('*').eq('institution_id', institution.id),
        supabase.from('institution_chat_messages').select('*').eq('institution_id', institution.id)
      ])

      const emergencyIds = (emergencies.data || []).map((e) => e.id)
      const { data: emergencyMessages } = emergencyIds.length
        ? await supabase.from('emergency_messages').select('*').in('emergency_id', emergencyIds)
        : { data: [] }

      const snapshot = {
        generatedAt: new Date().toISOString(),
        reason: 'Pre-deletion archive',
        institution,
        profiles: profiles.data || [],
        emergencies: emergencies.data || [],
        emergency_messages: emergencyMessages || [],
        institution_services: services.data || [],
        institution_chat_messages: chatMessages.data || []
      }

      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `resq-${institution.institution_code}-pre-deletion-archive.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Could not prepare the download, deletion cancelled: ' + err.message)
      setDeletingId(null)
      return
    }

    const confirmedAfterDownload = window.confirm(
      `The archive for "${institution.name}" has been downloaded. Proceed with permanent deletion now?`
    )
    setDeletingId(null)
    if (!confirmedAfterDownload) return

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

  function handleLogout() {
    setSigningOut(true)
  }

  async function finishLogout() {
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

  const SOLVED_CASE_SELECT = `
    id, emergency_type, status, created_at, claimed_at, resolved_at, lat, lng, institution_id,
    triggered_by_phone, triggered_via, photo_url, video_url, rating, rating_comment,
    reporter:profiles!emergencies_triggered_by_fkey(full_name, phone, email),
    claimant:profiles!emergencies_claimed_by_fkey(full_name, email)
  `

  // Every resolved emergency across every institution, with full
  // details (location, timestamps, chat, media, rating) in one file —
  // the cross-institution equivalent of an institution admin's own
  // case reports, for RESQ's own record-keeping/oversight.
  async function downloadAllSolvedReport() {
    setError('')
    setDownloadingSolvedReport(true)
    try {
      const { data: cases, error: fetchError } = await supabase
        .from('emergencies')
        .select(SOLVED_CASE_SELECT)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })

      if (fetchError) throw fetchError

      const institutionNameById = {}
      for (const inst of institutions) institutionNameById[inst.id] = inst.name

      const withMessages = []
      for (const emergency of cases || []) {
        const { data: messages } = await supabase
          .from('emergency_messages')
          .select('sender_role, message, media_url, media_type, is_ai_generated, created_at')
          .eq('emergency_id', emergency.id)
          .order('created_at', { ascending: true })
        withMessages.push({ emergency, messages: messages || [], institutionName: institutionNameById[emergency.institution_id] || 'Unknown institution' })
      }

      const html = buildAllInstitutionsReportHtml({ cases: withMessages })
      downloadHtmlFile(`resq-all-solved-emergencies-${new Date().toISOString().slice(0, 10)}.html`, html)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingSolvedReport(false)
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
      {signingOut && <SignOutOverlay onComplete={finishLogout} />}
      <EmergencyPulseBackground alert={hasActiveAlert} />
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
          <button className="resq-btn-secondary" onClick={downloadBackup} title="Download a full JSON snapshot of all data: a self-serve recovery point in addition to Supabase's own backups">
            ⬇ Download Backup
          </button>
          <button
            className="resq-btn-secondary"
            onClick={downloadAllSolvedReport}
            disabled={downloadingSolvedReport}
            title="Every resolved emergency across every institution, with location coordinates, timestamps, chat history, media, and ratings, in one readable file"
          >
            {downloadingSolvedReport ? 'Preparing…' : '⬇ All Solved Emergencies'}
          </button>
          <button className="resq-btn-secondary" onClick={() => setShowFlow((v) => !v)}>
            {showFlow ? '📊 Hide System Flow' : '📊 System Flow'}
          </button>
          <button className="resq-btn-secondary" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      {!loading && institutions.length > 0 && (
        <div className="glass-card resq-tilt-card resq-fade-in resq-fade-in-2" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 28, margin: '4px 0 24px' }}>
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

      {showFlow && (
        <section className="glass-card resq-fade-in" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0 }}>📊 Management Flow</h2>
          <p className="resq-subtle" style={{ marginTop: 0 }}>Who sets up whom, and who reports to whom.</p>
          <ManagementFlowDiagram />

          <h2 style={{ marginTop: 28 }}>🚨 Emergency Response Flow</h2>
          <p className="resq-subtle" style={{ marginTop: 0 }}>From the moment a user triggers an SOS to resolution, with every branch.</p>
          <EmergencyFlowDiagram />
        </section>
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
              <th style={{ padding: 10 }}>Logo</th>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Visibility</th>
              <th style={{ padding: 10 }}>Tier</th>
              <th style={{ padding: 10 }}>Emergencies</th>
              <th style={{ padding: 10 }}>Institution Code</th>
              <th style={{ padding: 10 }}>Verification Code</th>
              <th style={{ padding: 10 }}>QR Code</th>
              <th style={{ padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst, i) => {
              const instSummary = emergencySummary[inst.id] || { active: 0, resolved: 0 }
              const instHasLiveAlert = instSummary.active > 0
              return (
              <Fragment key={inst.id}>
              <tr className="resq-row-interactive resq-row-stagger" style={{ '--resq-row-index': i, ...(instHasLiveAlert ? { background: 'rgba(255,80,80,0.08)' } : {}) }}>
                <td style={{ padding: 10 }}>
                  <label style={{ cursor: 'pointer', display: 'block' }} title="Click to upload a logo">
                    {inst.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={inst.logo_url} alt={`${inst.name} logo`} width={44} height={44} style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px dashed var(--resq-glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏢</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingLogoFor === inst.id}
                      onChange={(e) => uploadLogo(inst, e.target.files?.[0])}
                    />
                    {uploadingLogoFor === inst.id && <span className="resq-subtle" style={{ fontSize: 10 }}>Uploading…</span>}
                  </label>
                </td>
                <td style={{ padding: 10 }}>
                  {editingId === inst.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        className="resq-input"
                        style={{ padding: '6px 8px' }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditName(inst)}
                        autoFocus
                      />
                      <button className="resq-btn-secondary" style={{ padding: '4px 10px' }} onClick={() => saveEditName(inst)}>Save</button>
                      <button className="resq-btn-secondary" style={{ padding: '4px 10px' }} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <strong>{inst.name}</strong>{' '}
                      {instHasLiveAlert && (
                        <span className="resq-badge resq-badge-open" style={{ fontSize: 10, marginLeft: 4 }} title={`${instSummary.active} active emergenc${instSummary.active === 1 ? 'y' : 'ies'} right now`}>
                          🚨 LIVE
                        </span>
                      )}
                      <button
                        className="resq-btn-secondary"
                        style={{ padding: '2px 8px', fontSize: 11, marginLeft: 4 }}
                        onClick={() => startEditName(inst)}
                        title="Edit institution name"
                      >
                        ✎ Edit
                      </button>
                      <br />
                      <small className="resq-subtle">{inst.contact_email}</small>
                      {inst.contact_phone && (
                        <>
                          {' · '}
                          <small className="resq-subtle">
                            <a href={`tel:${inst.contact_phone}`} style={{ color: 'inherit' }}>{inst.contact_phone}</a>
                          </small>
                        </>
                      )}
                    </>
                  )}
                </td>
                <td style={{ padding: 10 }}>
                  <span style={{ color: STATUS_COLORS[inst.status] || 'var(--resq-text-primary)', fontWeight: 'bold' }}>
                    {inst.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: 10 }}>
                  <button
                    className="resq-btn-secondary"
                    onClick={() => toggleVisibility(inst)}
                    title={inst.visibility === 'public' ? 'Receives emergencies from general public accounts by nearest match' : 'Only receives emergencies from users connected via its institution code'}
                  >
                    {inst.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                  </button>
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
                  <button className="resq-btn-secondary" onClick={() => toggleResponderDrilldown(inst)} style={{ marginRight: 8 }}>
                    {expandedInstId === inst.id ? '▲ Hide' : '👥 Responders'}
                  </button>
                  <button className="resq-btn-secondary" onClick={() => downloadContract(inst)} style={{ marginRight: 8 }}>
                    📄 Contract
                  </button>
                  <button className="resq-btn-secondary" onClick={() => toggleStatus(inst)} style={{ marginRight: 8 }}>
                    {inst.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                  <button className="resq-btn-secondary" onClick={() => deleteInstitution(inst)} disabled={deletingId === inst.id} style={{ color: '#ff8080' }}>
                    {deletingId === inst.id ? 'Preparing archive...' : 'Delete'}
                  </button>
                </td>
              </tr>
              {expandedInstId === inst.id && (
                <tr>
                  <td colSpan={10} style={{ padding: '4px 10px 16px', background: 'rgba(255,255,255,0.03)' }}>
                    {loadingResponders === inst.id ? (
                      <span className="resq-subtle">Loading responders…</span>
                    ) : (
                      (() => {
                        const rows = instResponders[inst.id] || []
                        if (rows.length === 0) return <span className="resq-subtle">No responders registered yet.</span>
                        const byUnit = {}
                        for (const r of rows) {
                          const key = r.unitName || (r.role === 'institution_admin' ? 'Institution admin' : 'Internal (no partner unit)')
                          byUnit[key] = byUnit[key] || []
                          byUnit[key].push(r)
                        }
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                            {Object.entries(byUnit).map(([unitName, members]) => (
                              <div key={unitName} style={{ minWidth: 220 }}>
                                <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4, opacity: 0.8 }}>{unitName}</div>
                                {members.map((m) => (
                                  <div key={m.id} style={{ fontSize: 12, padding: '3px 0', opacity: m.is_active === false ? 0.4 : 1 }}>
                                    {m.full_name || 'Unnamed'}{' '}
                                    <span className="resq-subtle">({m.role.replace('_', ' ')})</span>
                                    {m.phone && (
                                      <>
                                        {' — '}
                                        <a href={`tel:${m.phone}`} style={{ color: 'inherit' }}>{m.phone}</a>
                                      </>
                                    )}
                                    {m.is_active === false && <span style={{ marginLeft: 6, color: '#ff8080' }}>removed</span>}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )
                      })()
                    )}
                  </td>
                </tr>
              )}
              </Fragment>
              )
            })}
          </tbody>
        </table>
        </section>
      )}
      </div>
    </div>
  )
}
