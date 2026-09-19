// app/super-admin/reports/page.js
// Every responder-conduct report filed by a user, across every
// institution — super_admin previously had no RLS access to this
// table at all (see day45 migration) and no UI to view it, so these
// reports were invisible outside each institution's own admin.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'
import LoadingScreen from '../../../components/LoadingScreen'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const CATEGORY_LABELS = {
  no_response: 'No response / slow to help',
  unprofessional: 'Unprofessional conduct',
  wrong_advice: 'Gave wrong or unsafe advice',
  other: 'Other'
}

export default function SuperAdminReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [profiles, setProfiles] = useState({})
  const [institutions, setInstitutions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true)
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

    const { data, error: fetchError } = await supabase
      .from('responder_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setReports(data || [])

    const peopleIds = [...new Set((data || []).flatMap((r) => [r.reported_by, r.reported_responder_id]).filter(Boolean))]
    if (peopleIds.length > 0) {
      const { data: people } = await supabase.from('profiles').select('id, full_name, email').in('id', peopleIds)
      const map = {}
      for (const p of people || []) map[p.id] = p
      setProfiles(map)
    }

    const institutionIds = [...new Set((data || []).map((r) => r.institution_id).filter(Boolean))]
    if (institutionIds.length > 0) {
      const { data: insts } = await supabase.from('institutions').select('id, name').in('id', institutionIds)
      const map = {}
      for (const i of insts || []) map[i.id] = i
      setInstitutions(map)
    }

    setLoading(false)
  }

  async function setStatus(report, status) {
    const { error: updateError } = await supabase
      .from('responder_reports')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', report.id)

    if (updateError) {
      setError(updateError.message)
      return
    }
    load()
  }

  if (loading) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <RadarSweepBackground />
        <LanguageSwitcher />
        <div className="resq-content"><LoadingScreen /></div>
      </main>
    )
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
        <Link href="/super-admin">&larr; Back to Dashboard</Link>
        <div className="glass-card resq-fade-in" style={{ marginTop: 16, marginBottom: 24 }}>
          <h1 className="resq-h1" style={{ fontSize: 26 }}>Responder Reports — All Institutions</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Every report a user has filed about a responder's conduct, across every institution.
          </p>
        </div>

        {error && <p style={{ color: '#ff8080' }}>{error}</p>}

        {reports.length === 0 && <p className="resq-subtle resq-fade-in">No reports filed yet.</p>}

        {reports.map((r) => (
          <section key={r.id} className="glass-card resq-fade-in" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>{CATEGORY_LABELS[r.category] || r.category}</strong>
                {institutions[r.institution_id] && (
                  <span className="resq-subtle" style={{ marginLeft: 8 }}>· {institutions[r.institution_id].name}</span>
                )}
                <p className="resq-subtle" style={{ margin: '4px 0' }}>
                  {new Date(r.created_at).toLocaleString()}
                  {profiles[r.reported_responder_id] && <> · Responder: {profiles[r.reported_responder_id].full_name || profiles[r.reported_responder_id].email}</>}
                  {profiles[r.reported_by] && <> · Reported by: {profiles[r.reported_by].full_name || profiles[r.reported_by].email}</>}
                </p>
              </div>
              <span className={r.status === 'open' ? 'resq-badge resq-badge-open' : r.status === 'reviewed' ? 'resq-badge resq-badge-claimed' : 'resq-badge resq-badge-resolved'}>
                {r.status}
              </span>
            </div>
            <p style={{ marginTop: 12 }}>{r.message}</p>
            {r.status === 'open' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="resq-btn-secondary" onClick={() => setStatus(r, 'reviewed')}>Mark reviewed</button>
                <button className="resq-btn-secondary" onClick={() => setStatus(r, 'dismissed')}>Dismiss</button>
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
