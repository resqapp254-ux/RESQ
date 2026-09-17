// app/institution-admin/case-reports/page.js
// Downloadable per-case and weekly reports for resolved emergencies:
// type, who triggered/handled, location, every timestamp, the full
// chat transcript, any media, and the responder's star rating.
// Downloaded to the admin's own device; see docs/deployment-readiness.md
// for the retention policy this supports.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabaseClient'
import EmergencyPulseBackground from '../../../components/EmergencyPulseBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'
import LoadingScreen from '../../../components/LoadingScreen'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import { buildEmergencyReportHtml, buildWeeklyReportHtml, downloadHtmlFile } from '../../../lib/buildEmergencyReport'

const CASE_SELECT = `
  id, emergency_type, status, created_at, claimed_at, resolved_at, lat, lng,
  triggered_by_phone, triggered_via, photo_url, video_url, rating, rating_comment,
  reporter:profiles!emergencies_triggered_by_fkey(full_name, phone, email),
  claimant:profiles!emergencies_claimed_by_fkey(full_name, email)
`

export default function CaseReportsPage() {
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState('')
  const [downloadingWeekly, setDownloadingWeekly] = useState(false)

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id, role')
      .eq('id', sessionData.session.user.id)
      .single()

    if (!profile || profile.role !== 'institution_admin' || !profile.institution_id) {
      router.replace('/institution-admin')
      return
    }
    setInstitutionId(profile.institution_id)

    const { data: institution } = await supabase.from('institutions').select('name').eq('id', profile.institution_id).single()
    setInstitutionName(institution?.name || 'Your institution')

    const { data, error: fetchError } = await supabase
      .from('emergencies')
      .select(CASE_SELECT)
      .eq('institution_id', profile.institution_id)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(100)

    if (fetchError) setError(fetchError.message)
    setCases(data || [])
    setLoading(false)
  }

  async function loadMessages(emergencyId) {
    const { data } = await supabase
      .from('emergency_messages')
      .select('sender_role, message, media_url, media_type, is_ai_generated, created_at')
      .eq('emergency_id', emergencyId)
      .order('created_at', { ascending: true })
    return data || []
  }

  async function downloadCase(emergency) {
    setDownloadingId(emergency.id)
    try {
      const messages = await loadMessages(emergency.id)
      const html = buildEmergencyReportHtml({ institutionName, emergency, messages })
      downloadHtmlFile(`resq-case-${emergency.id}.html`, html)
    } finally {
      setDownloadingId('')
    }
  }

  async function downloadWeekly() {
    setDownloadingWeekly(true)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const { data: weekCases, error: fetchError } = await supabase
        .from('emergencies')
        .select(CASE_SELECT)
        .eq('institution_id', institutionId)
        .eq('status', 'resolved')
        .gte('resolved_at', sevenDaysAgo.toISOString())
        .order('resolved_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        return
      }

      const withMessages = []
      for (const emergency of weekCases || []) {
        withMessages.push({ emergency, messages: await loadMessages(emergency.id) })
      }

      const rangeLabel = `${sevenDaysAgo.toLocaleDateString()} to ${new Date().toLocaleDateString()}`
      const html = buildWeeklyReportHtml({ institutionName, cases: withMessages, rangeLabel })
      downloadHtmlFile(`resq-weekly-report-${new Date().toISOString().slice(0, 10)}.html`, html)
    } finally {
      setDownloadingWeekly(false)
    }
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
        <Link href="/institution-admin">&larr; Back to Dashboard</Link>

        <div className="glass-card resq-fade-in" style={{ marginTop: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="resq-h1" style={{ fontSize: 26 }}>Case Reports</h1>
            <p className="resq-subtle" style={{ marginTop: 8 }}>
              Download a full record of any resolved emergency: type, who triggered and handled it, location, every
              timestamp, chat history, media, and the responder's rating. Files download to this device; nothing is
              kept on RESQ's servers beyond the case's normal retention period.
            </p>
          </div>
          <button className="resq-btn-primary" onClick={downloadWeekly} disabled={downloadingWeekly} style={{ whiteSpace: 'nowrap' }}>
            {downloadingWeekly ? 'Preparing...' : '⬇ Download Weekly Report'}
          </button>
        </div>

        {error && <p style={{ color: '#ff8080' }}>{error}</p>}

        {cases.length === 0 && <p className="resq-subtle resq-fade-in">No resolved cases yet.</p>}

        {cases.map((c) => (
          <section key={c.id} className="glass-card resq-fade-in" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <strong style={{ textTransform: 'capitalize' }}>{(c.emergency_type || 'other').replace('_', ' ')}</strong>
              <p className="resq-subtle" style={{ margin: '4px 0' }}>
                Resolved {c.resolved_at ? new Date(c.resolved_at).toLocaleString() : 'recently'}
                {c.reporter?.full_name ? ` · Triggered by ${c.reporter.full_name}` : ''}
                {c.claimant?.full_name ? ` · Handled by ${c.claimant.full_name}` : ''}
                {c.rating ? ` · ${'★'.repeat(c.rating)}${'☆'.repeat(5 - c.rating)}` : ''}
              </p>
            </div>
            <button className="resq-btn-secondary" onClick={() => downloadCase(c)} disabled={downloadingId === c.id}>
              {downloadingId === c.id ? 'Preparing...' : '⬇ Download Report'}
            </button>
          </section>
        ))}
      </div>
    </main>
  )
}
