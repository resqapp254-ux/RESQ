// app/institution-admin/contract/page.js
// Shown once, right after verification, until the institution admin
// signs RESQ's service agreement. Every box must be ticked; the
// signed record (with the signer's name, title, and contact details)
// is kept permanently and only the super_admin can view/download it
// later, see app/super-admin/page.js.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import GlobeBackground from '../../../components/GlobeBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

const CONTRACT_VERSION = 'v1'

export default function InstitutionContractPage() {
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    companyName: '',
    signeeName: '',
    signeeTitle: '',
    signeeEmail: '',
    signeePhone: '',
    agreedTerms: false,
    agreedPrivacy: false,
    agreedResponsibilities: false,
    agreedDataHandling: false
  })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      router.replace('/login')
      return
    }

    const { data: statusData } = await supabase.rpc('get_onboarding_status')
    if (statusData?.next_step === 'enter_verification_code') {
      router.replace('/institution-admin/verify')
      return
    }
    if (statusData?.next_step === 'dashboard') {
      router.replace('/institution-admin')
      return
    }

    setUserId(sessionData.session.user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('institution_id, email, full_name')
      .eq('id', sessionData.session.user.id)
      .single()

    setInstitutionId(profile?.institution_id || '')
    setForm((prev) => ({ ...prev, signeeName: profile?.full_name || '', signeeEmail: profile?.email || '' }))

    const { data: institution } = await supabase.from('institutions').select('name').eq('id', profile?.institution_id).single()
    setInstitutionName(institution?.name || '')
    setForm((prev) => ({ ...prev, companyName: institution?.name || '' }))

    setLoading(false)
  }

  const allAgreed = form.agreedTerms && form.agreedPrivacy && form.agreedResponsibilities && form.agreedDataHandling

  async function handleSign(e) {
    e.preventDefault()
    setError('')

    if (!allAgreed) {
      setError('You must agree to all of the items above to continue.')
      return
    }
    if (!form.companyName.trim() || !form.signeeName.trim() || !form.signeeEmail.trim()) {
      setError('Company name, your name, and your email are required.')
      return
    }

    setSaving(true)
    const { error: insertError } = await supabase.from('institution_contracts').insert({
      institution_id: institutionId,
      signed_by: userId,
      company_name: form.companyName.trim(),
      signee_name: form.signeeName.trim(),
      signee_title: form.signeeTitle.trim() || null,
      signee_email: form.signeeEmail.trim(),
      signee_phone: form.signeePhone.trim() || null,
      agreed_terms: form.agreedTerms,
      agreed_privacy: form.agreedPrivacy,
      agreed_responsibilities: form.agreedResponsibilities,
      agreed_data_handling: form.agreedDataHandling,
      contract_version: CONTRACT_VERSION
    })
    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    router.replace('/institution-admin')
  }

  if (loading) {
    return (
      <main className="resq-shell">
        <GlobeBackground />
        <RadarSweepBackground />
        <LanguageSwitcher />
        <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="resq-subtle">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <RadarSweepBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center' }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 640 }}>
          <h1 className="resq-h1" style={{ fontSize: 26 }}>Service Agreement</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Before {institutionName || 'your institution'} can go live on RESQ, someone authorized to act on its
            behalf must accept the terms below. This is signed once and kept on file.
          </p>

          <form onSubmit={handleSign} style={{ marginTop: 20 }}>
            <label>Company / institution name</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />

            <label>Your full name (the person accepting on the institution's behalf)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.signeeName} onChange={(e) => setForm({ ...form, signeeName: e.target.value })} required />

            <label>Your title / role (optional)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} value={form.signeeTitle} onChange={(e) => setForm({ ...form, signeeTitle: e.target.value })} placeholder="e.g. Operations Manager" />

            <label>Your email</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 14 }} type="email" value={form.signeeEmail} onChange={(e) => setForm({ ...form, signeeEmail: e.target.value })} required />

            <label>Your phone (optional)</label>
            <input className="resq-input" style={{ marginTop: 4, marginBottom: 20 }} value={form.signeePhone} onChange={(e) => setForm({ ...form, signeePhone: e.target.value })} />

            <div className="resq-success-box" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.agreedTerms} onChange={(e) => setForm({ ...form, agreedTerms: e.target.checked })} style={{ marginTop: 3 }} />
                <span>I have read and agree to RESQ's <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> on behalf of {form.companyName || 'this institution'}.</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.agreedPrivacy} onChange={(e) => setForm({ ...form, agreedPrivacy: e.target.checked })} style={{ marginTop: 3 }} />
                <span>I have read and agree to RESQ's <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, including how emergency data is stored and retained.</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.agreedResponsibilities} onChange={(e) => setForm({ ...form, agreedResponsibilities: e.target.checked })} style={{ marginTop: 3 }} />
                <span>I understand this institution is responsible for staffing, training, and reviewing its own responders, and for acting on emergencies routed to it in good faith.</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.agreedDataHandling} onChange={(e) => setForm({ ...form, agreedDataHandling: e.target.checked })} style={{ marginTop: 3 }} />
                <span>I understand this institution must keep its own weekly/case records for follow-up and investigations, as described in the Privacy Policy's retention section, and must not share reporter data outside its own responders and admins.</span>
              </label>
            </div>

            {error && <p style={{ color: '#ff8080', marginTop: 12 }}>{error}</p>}

            <button className="resq-btn-primary" style={{ width: '100%', marginTop: 20 }} disabled={saving || !allAgreed}>
              {saving ? 'Signing...' : 'I agree, sign and continue'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
