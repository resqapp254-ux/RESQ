'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'
import HeartMonitorLine from '../../components/HeartMonitorLine'
import { useEmergencySiren } from '../../lib/useEmergencySiren'
import { pickMatchingServices } from '../../lib/serviceDispatch'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useTranslation } from '../../lib/i18n/LanguageContext'
import LoadingScreen from '../../components/LoadingScreen'

const EMERGENCY_TYPES = [
  { key: 'medical', translationKey: 'medical', emoji: '\uD83C\uDFE5' },
  { key: 'fire', translationKey: 'fire', emoji: '\uD83D\uDD25' },
  { key: 'accident', translationKey: 'accident', emoji: '\uD83D\uDE91' },
  { key: 'security', translationKey: 'security', emoji: '\uD83D\uDEE1\uFE0F' },
  { key: 'gbv', translationKey: 'gbv', emoji: '\uD83E\uDD1D' },
  { key: 'mental_health', translationKey: 'mentalHealth', emoji: '\uD83E\uDDE0' },
  { key: 'other', translationKey: 'other', emoji: '\u26A0\uFE0F' }
]

function typeLabel(key, t) {
  const found = EMERGENCY_TYPES.find((type) => type.key === key)
  return found ? found.emoji + ' ' + t(found.translationKey) : (key || 'Emergency')
}

function statusBadgeClass(status, claimedBy) {
  if (status === 'resolved') return 'resq-badge resq-badge-resolved'
  if (claimedBy) return 'resq-badge resq-badge-claimed'
  return 'resq-badge resq-badge-open'
}

const RESPONDER_ROLES = ['responder', 'institution_admin', 'super_admin']

export default function UserPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [institutionName, setInstitutionName] = useState('')
  const [institutionId, setInstitutionId] = useState('')
  const [myServiceId, setMyServiceId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedType, setSelectedType] = useState('other')
  const [activeEmergencies, setActiveEmergencies] = useState([])
  const [resolvedEmergencies, setResolvedEmergencies] = useState([])
  const [claimingId, setClaimingId] = useState('')
  const [resolvingId, setResolvingId] = useState('')
  const [currentEmergency, setCurrentEmergency] = useState(null)
  const [currentAdvice, setCurrentAdvice] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [chatError, setChatError] = useState('')
  const [chatSuggestion, setChatSuggestion] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [triggerBusy, setTriggerBusy] = useState(false)

  const [chatMessages, setChatMessages] = useState([])
  const [myUserId, setMyUserId] = useState('')

  const [reportOpen, setReportOpen] = useState(false)
  const [reportEmergencyId, setReportEmergencyId] = useState('')
  const [reportCategory, setReportCategory] = useState('no_response')
  const [reportMessage, setReportMessage] = useState('')
  const [reportBusy, setReportBusy] = useState(false)
  const [reportError, setReportError] = useState('')
  const [reportSent, setReportSent] = useState(false)

  const isResponderView = RESPONDER_ROLES.includes(role)
  // Wails until someone claims it — once claimed_by is set (by any
  // responder on the institution), the alarm goes quiet for everyone.
  const hasActiveAlert = isResponderView && activeEmergencies.some((e) => !e.claimed_by && e.status !== 'resolved')
  const { muted: sirenMuted, setMuted: setSirenMuted } = useEmergencySiren(hasActiveAlert)

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login')
        return
      }

      setEmail(authData.user.email || '')
      setMyUserId(authData.user.id)

      const { data: status } = await supabase.rpc('get_onboarding_status')
      if (status?.role) setRole(status.role)
      if (status?.role === 'user' && status.next_step === 'enter_institution_code') {
        router.replace('/join-institution')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id, service_id')
        .eq('id', authData.user.id)
        .single()

      if (profile?.institution_id) {
        setInstitutionId(profile.institution_id)
        const { data: institution } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', profile.institution_id)
          .single()
        setInstitutionName(institution?.name || '')
      }
      if (profile?.service_id) setMyServiceId(profile.service_id)

      await refreshEmergencies(authData.user.id, status?.role, profile?.institution_id, profile?.service_id)
      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  // Live updates: when anyone (on the same institution) claims,
  // resolves, or triggers an emergency, every open dashboard reflects
  // it immediately — this is what lets the siren go quiet the moment
  // a colleague claims a case, not only when this device claims it.
  useEffect(() => {
    if (!role) return

    const channel = supabase
      .channel('resq-emergencies-' + (institutionId || 'super-admin'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emergencies' },
        (payload) => {
          const row = payload.new || payload.old
          if (!row) return
          if (role !== 'super_admin' && role !== 'user' && row.institution_id !== institutionId) return
          if (role === 'user' && row.triggered_by !== myUserId) return
          refreshEmergencies(myUserId, role, institutionId, myServiceId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, institutionId, myServiceId, myUserId])

  // Responders can only message an emergency they've claimed — RLS
  // enforces this server-side (day11-chat-claim-rules.sql), so the
  // UI needs to target the same emergency, not just "the first one
  // in the queue", or the send fails with a raw policy error.
  const myClaimedEmergency = isResponderView ? activeEmergencies.find((e) => e.claimed_by === myUserId) : null
  const chatTargetId = isResponderView ? (myClaimedEmergency?.id || '') : (currentEmergency?.id || activeEmergencies[0]?.id || '')

  async function loadChatMessages(emergencyId) {
    const { data } = await supabase
      .from('emergency_messages')
      .select('id, sender_id, sender_role, message, created_at, is_ai_generated')
      .eq('emergency_id', emergencyId)
      .order('created_at', { ascending: true })
      .limit(200)
    setChatMessages(data || [])
  }

  // Show the conversation, and keep it live for both sides while the
  // chat is open.
  useEffect(() => {
    if (!chatTargetId) {
      setChatMessages([])
      return
    }
    loadChatMessages(chatTargetId)

    const channel = supabase
      .channel('resq-chat-' + chatTargetId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergency_messages', filter: `emergency_id=eq.${chatTargetId}` },
        (payload) => setChatMessages((prev) => [...prev, payload.new])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatTargetId])

  async function refreshEmergencies(userId, roleValue, institutionIdArg, serviceIdArg) {
    const roleName = roleValue || role
    const institutionIdValue = institutionIdArg || institutionId
    const serviceIdValue = serviceIdArg || myServiceId

    if (roleName === 'user') {
      const { data: open } = await supabase
        .from('emergencies')
        .select('id, emergency_type, status, created_at, claimed_by, ai_advice_to_user')
        .eq('triggered_by', userId)
        .neq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: resolved } = await supabase
        .from('emergencies')
        .select('id, emergency_type, status, resolved_at, claimed_by')
        .eq('triggered_by', userId)
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(10)

      setActiveEmergencies(open || [])
      setResolvedEmergencies(resolved || [])

      if (open && open.length > 0 && open[0].ai_advice_to_user) {
        setCurrentEmergency(open[0])
        setCurrentAdvice(open[0].ai_advice_to_user)
      }
      return
    }

    if (RESPONDER_ROLES.includes(roleName)) {
      let openQuery = supabase
        .from('emergencies')
        .select(
          'id, emergency_type, status, created_at, claimed_by, institution_id, triggered_by, triggered_by_phone, triggered_via, ai_flag_to_responder, lat, lng, reporter:profiles!emergencies_triggered_by_fkey(full_name, phone)'
        )
        .in('status', ['triggered', 'claimed', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (roleName !== 'super_admin' && institutionIdValue) {
        openQuery = openQuery.eq('institution_id', institutionIdValue)
      }

      let { data: open } = await openQuery

      // Secondary responders (linked to an institution_service) only
      // see emergencies routed to their service — see lib/serviceDispatch.js.
      if (roleName === 'responder' && serviceIdValue && institutionIdValue) {
        const { data: services } = await supabase
          .from('institution_services')
          .select('id, service_type, lat, lng, handles_emergency_types, is_active')
          .eq('institution_id', institutionIdValue)
          .eq('is_active', true)

        open = (open || []).filter((emergency) => {
          const matching = pickMatchingServices(services, {
            emergencyType: emergency.emergency_type,
            lat: emergency.lat,
            lng: emergency.lng
          })
          return matching.some((s) => s.id === serviceIdValue)
        })
      }

      let resolvedQuery = supabase
        .from('emergencies')
        .select('id, emergency_type, status, resolved_at, institution_id')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(10)

      if (roleName !== 'super_admin' && institutionIdValue) {
        resolvedQuery = resolvedQuery.eq('institution_id', institutionIdValue)
      }

      const { data: resolved } = await resolvedQuery

      setActiveEmergencies(open || [])
      setResolvedEmergencies(resolved || [])
    }
  }

  async function requestLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }

  async function getAccessToken() {
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.access_token || null
  }

  async function handleTriggerEmergency() {
    setError('')
    setMessage('')
    setCurrentAdvice('')
    setLocationBusy(true)
    setTriggerBusy(true)

    const location = await requestLocation()
    setLocationBusy(false)

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace('/login')
      return
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      setError('Missing session token. Please log in again.')
      setTriggerBusy(false)
      return
    }

    const response = await fetch('/api/emergency/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({
        emergencyType: selectedType,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null
      })
    })

    const result = await response.json()
    setTriggerBusy(false)

    if (!response.ok) {
      setError(result.error || 'Could not trigger emergency')
      return
    }

    setCurrentEmergency(result.emergency)
    setMessage('Emergency sent. Responders are being notified.')
    await refreshEmergencies(authData.user.id, role)

    if (result.emergency?.id) {
      fetch('/api/emergency/generate-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({ emergencyId: result.emergency.id })
      })
        .then((res) => res.json())
        .then((adviceResult) => {
          if (adviceResult?.advice) setCurrentAdvice(adviceResult.advice)
        })
        .catch(() => null)
    }
  }

  async function handleClaim(emergencyId) {
    setClaimingId(emergencyId)
    setError('')
    setMessage('')

    const accessToken = await getAccessToken()
    if (!accessToken) {
      setError('Missing session token. Please log in again.')
      setClaimingId('')
      return
    }

    const response = await fetch('/api/emergency/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ emergencyId })
    })

    const result = await response.json()
    setClaimingId('')

    if (!response.ok) {
      setError(result.error || 'Could not claim emergency')
      return
    }

    setMessage('Emergency claimed.')
    await refreshEmergencies((await supabase.auth.getUser()).data.user.id, role)
  }

  async function handleResolve(emergencyId) {
    setResolvingId(emergencyId)
    setError('')
    setMessage('')

    const accessToken = await getAccessToken()
    if (!accessToken) {
      setError('Missing session token. Please log in again.')
      setResolvingId('')
      return
    }

    const response = await fetch('/api/emergency/mark-resolved', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken
      },
      body: JSON.stringify({ emergencyId })
    })

    const result = await response.json()
    setResolvingId('')

    if (!response.ok) {
      setError(result.error || 'Could not resolve emergency')
      return
    }

    setMessage('Emergency marked resolved.')
    await refreshEmergencies((await supabase.auth.getUser()).data.user.id, role)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function sendChatMessage() {
    setChatError('')
    setChatSuggestion('')
    setChatBusy(true)

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace('/login')
      return
    }

    const targetId = chatTargetId
    if (!targetId) {
      setChatError(isResponderView ? 'Claim an emergency first — you can only message its reporter once you have.' : 'No emergency selected.')
      setChatBusy(false)
      return
    }

    const message = chatMessage.trim()
    if (!message) {
      setChatError('Type a message first.')
      setChatBusy(false)
      return
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      setChatError('Missing session token. Please log in again.')
      setChatBusy(false)
      return
    }

    if (isResponderView) {
      // Responder messages are AI-safety-checked server-side BEFORE
      // they reach the user. If flagged, nothing is delivered — the
      // responder sees why plus a corrected message to send instead.
      const response = await fetch('/api/emergency/check-responder-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({ emergencyId: targetId, message })
      })
      const result = await response.json()
      setChatBusy(false)

      if (!response.ok || !result.success) {
        setChatError(result.error || 'Could not send message.')
        return
      }
      if (result.blocked) {
        setChatError((result.reason || 'That message was not sent — it looked unsafe or incorrect.') + ' Try the suggestion below, or rewrite it.')
        setChatSuggestion(result.suggestion || '')
        return
      }

      setChatMessage('')
      setMessage('Message sent.')
      return
    }

    const { error: insertError } = await supabase
      .from('emergency_messages')
      .insert({
        emergency_id: targetId,
        sender_id: authData.user.id,
        sender_role: role || 'user',
        message
      })
    setChatBusy(false)

    if (insertError) {
      setChatError(insertError.message)
      return
    }

    setChatMessage('')
    setMessage('Message sent.')
  }

  const reportableEmergencies = [...activeEmergencies, ...resolvedEmergencies].filter((e) => e.claimed_by)

  async function handleSubmitReport(e) {
    e.preventDefault()
    setReportError('')

    if (!reportEmergencyId) {
      setReportError('Choose which emergency this is about.')
      return
    }
    const text = reportMessage.trim()
    if (!text) {
      setReportError('Describe what happened.')
      return
    }

    setReportBusy(true)
    const chosen = reportableEmergencies.find((e) => e.id === reportEmergencyId)

    const { error: insertError } = await supabase.from('responder_reports').insert({
      institution_id: institutionId,
      emergency_id: reportEmergencyId,
      reported_by: myUserId,
      reported_responder_id: chosen?.claimed_by || null,
      category: reportCategory,
      message: text
    })
    setReportBusy(false)

    if (insertError) {
      setReportError(insertError.message)
      return
    }

    setReportSent(true)
    setReportMessage('')
  }

  const chatThread = chatMessages.length > 0 && (
    <div
      style={{
        maxHeight: 220,
        overflowY: 'auto',
        marginBottom: 10,
        padding: '4px 2px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      {chatMessages.map((m) => {
        const mine = m.sender_id === myUserId
        return (
          <div
            key={m.id}
            style={{
              alignSelf: mine ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: mine ? 'rgba(255,43,43,0.22)' : 'rgba(255,255,255,0.06)',
              border: '1px solid ' + (mine ? 'rgba(255,43,43,0.4)' : 'var(--resq-glass-border)'),
              borderRadius: 12,
              padding: '8px 12px'
            }}
          >
            <p className="resq-subtle" style={{ margin: 0, fontSize: 11, textTransform: 'capitalize' }}>
              {m.is_ai_generated ? 'AI' : m.sender_role} · {new Date(m.created_at).toLocaleTimeString()}
            </p>
            <p style={{ margin: '2px 0 0' }}>{m.message}</p>
          </div>
        )
      })}
    </div>
  )

  if (loading) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <div className="resq-content"><LoadingScreen /></div>
      </main>
    )
  }

  return (
    <main className={'resq-shell' + (hasActiveAlert ? ' resq-alert-shell' : '')}>
      <EmergencyPulseBackground />
      <LanguageSwitcher />
      <div className="resq-content" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div className="glass-card resq-fade-in" style={{ maxWidth: 720, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="resq-btn-secondary" onClick={handleLogout}>{t('logOut')}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 96, height: 96 }}>
              <img src="/icon.svg" alt="RESQ" width="96" height="96" />
            </div>
          </div>
          <h1 className="resq-h1">RESQ</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            {t('signedInAs')} {email}
            {role ? ' \u2022 ' + (isResponderView ? t('responderWorkspace') : t('userWorkspace')) + ' (' + role + ')' : ''}
            {institutionName ? ' \u2022 ' + institutionName : ''}
          </p>
        </div>

        {isResponderView && (
          <HeartMonitorLine alert={hasActiveAlert} label={hasActiveAlert ? t('activeEmergencyLabel') : t('allClear')} />
        )}

        {hasActiveAlert && (
          <div className="resq-siren-banner resq-fade-in" role="alert">
            <span>
              <strong>{activeEmergencies.length}</strong> {activeEmergencies.length === 1 ? t('activeEmergencyBanner') : t('activeEmergenciesBanner')}
            </span>
            <button
              type="button"
              className="resq-btn-secondary resq-siren-mute"
              onClick={() => setSirenMuted((m) => !m)}
              aria-pressed={sirenMuted}
            >
              {sirenMuted ? '\ud83d\udd07 ' + t('unmuteSiren') : '\ud83d\udd0a ' + t('muteSiren')}
            </button>
          </div>
        )}

        <div className="resq-two-col" style={{ gridTemplateColumns: '1.2fr 1fr', marginTop: isResponderView ? 20 : 0 }}>
          <section className="glass-card resq-fade-in resq-fade-in-2">
            {isResponderView ? (
              <>
                <h2 style={{ marginTop: 0 }}>{t('responderConsole')}</h2>
                <p className="resq-subtle" style={{ marginTop: 0 }}>
                  {t('responderConsoleSubtitle')}
                </p>
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ marginTop: 0 }}>{t('messageReporter')}</h3>
                  {myClaimedEmergency ? (
                    <>
                      {chatThread}
                      <textarea
                        className="resq-input"
                        style={{ minHeight: 120 }}
                        placeholder={t('messageReporterPlaceholder')}
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                      />
                      <button className="resq-btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={sendChatMessage} disabled={chatBusy}>
                        {chatBusy ? t('sendingEllipsis') : t('sendMessage')}
                      </button>
                    </>
                  ) : (
                    <p className="resq-subtle">Claim an emergency below to message the person who reported it.</p>
                  )}
                  {chatError && <p style={{ color: '#ff8080' }}>{chatError}</p>}
                  {chatSuggestion && (
                    <div className="resq-advice-box">
                      <strong>Suggested message</strong>
                      <p style={{ margin: '6px 0 10px' }}>{chatSuggestion}</p>
                      <button
                        type="button"
                        className="resq-btn-secondary"
                        onClick={() => {
                          setChatMessage(chatSuggestion)
                          setChatSuggestion('')
                          setChatError('')
                        }}
                      >
                        Use this instead
                      </button>
                    </div>
                  )}
                  {message && <p className="resq-green">{message}</p>}
                </div>
              </>
            ) : (
              <>
                <h2 style={{ marginTop: 0 }}>{t('emergencyControl')}</h2>
                <p className="resq-subtle" style={{ marginTop: 0 }}>{t('emergencyControlSubtitle')}</p>

                <label id="resq-type-label" className="resq-subtle">{t('emergencyType')}</label>
                <div className="resq-type-grid" role="radiogroup" aria-labelledby="resq-type-label">
                  {EMERGENCY_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type.key}
                      role="radio"
                      aria-checked={selectedType === type.key}
                      aria-label={t(type.translationKey)}
                      className={'resq-type-chip' + (selectedType === type.key ? ' resq-type-chip-selected' : '')}
                      onClick={() => setSelectedType(type.key)}
                    >
                      <span className="resq-type-emoji" aria-hidden="true">{type.emoji}</span>
                      <span>{t(type.translationKey)}</span>
                    </button>
                  ))}
                </div>

                <div className="resq-trigger-wrap">
                  <button
                    className="resq-trigger-btn"
                    aria-label={`Send an SOS for a ${typeLabel(selectedType, t)} emergency`}
                    onClick={handleTriggerEmergency}
                    disabled={locationBusy || triggerBusy}
                  >
                    {locationBusy ? t('locating') : triggerBusy ? t('sendingEllipsis') : t('sosTrigger')}
                  </button>
                </div>

                <div aria-live="polite">
                  {message && <p className="resq-green" style={{ textAlign: 'center' }}>{message}</p>}
                  {error && <p style={{ color: '#ff8080', textAlign: 'center' }}>{error}</p>}
                </div>

                {currentAdvice && (
                  <div className="resq-advice-box">
                    <strong>{t('aiSafetyGuidance')}</strong>
                    <p style={{ margin: '6px 0 0' }}>{currentAdvice}</p>
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <h3 style={{ marginTop: 0 }}>{t('chatWithResponders')}</h3>
                  {chatThread}
                  <textarea
                    className="resq-input"
                    style={{ minHeight: 100 }}
                    placeholder={t('chatPlaceholder')}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                  <button className="resq-btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={sendChatMessage} disabled={chatBusy}>
                    {chatBusy ? t('sendingEllipsis') : t('sendMessage')}
                  </button>
                  {chatError && <p style={{ color: '#ff8080' }}>{chatError}</p>}
                </div>

                <div style={{ marginTop: 24, borderTop: '1px solid var(--resq-glass-border)', paddingTop: 16 }}>
                  <button
                    type="button"
                    className="resq-btn-secondary"
                    onClick={() => { setReportOpen((v) => !v); setReportSent(false); setReportError('') }}
                  >
                    🚩 Report a responder
                  </button>
                  {reportOpen && (
                    <div style={{ marginTop: 12 }}>
                      {reportSent ? (
                        <p className="resq-green">Report sent to your institution admin. Thank you.</p>
                      ) : reportableEmergencies.length === 0 ? (
                        <p className="resq-subtle">You don't have any claimed emergencies yet to report on.</p>
                      ) : (
                        <form onSubmit={handleSubmitReport}>
                          <label className="resq-subtle">Which emergency?</label>
                          <select
                            className="resq-input"
                            style={{ marginTop: 4, marginBottom: 10 }}
                            value={reportEmergencyId}
                            onChange={(e) => setReportEmergencyId(e.target.value)}
                          >
                            <option value="">Select…</option>
                            {reportableEmergencies.map((e) => (
                              <option key={e.id} value={e.id}>
                                {typeLabel(e.emergency_type, t)} — {new Date(e.created_at || e.resolved_at).toLocaleString()}
                              </option>
                            ))}
                          </select>

                          <label className="resq-subtle">What happened?</label>
                          <select
                            className="resq-input"
                            style={{ marginTop: 4, marginBottom: 10 }}
                            value={reportCategory}
                            onChange={(e) => setReportCategory(e.target.value)}
                          >
                            <option value="no_response">No response / slow to help</option>
                            <option value="unprofessional">Unprofessional conduct</option>
                            <option value="wrong_advice">Gave wrong or unsafe advice</option>
                            <option value="other">Other</option>
                          </select>

                          <textarea
                            className="resq-input"
                            style={{ minHeight: 90 }}
                            placeholder="Describe what happened"
                            value={reportMessage}
                            onChange={(e) => setReportMessage(e.target.value)}
                          />
                          {reportError && <p style={{ color: '#ff8080' }}>{reportError}</p>}
                          <button className="resq-btn-primary" style={{ width: '100%', marginTop: 10 }} disabled={reportBusy}>
                            {reportBusy ? 'Sending…' : 'Send report to institution admin'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-3">
            <h2 style={{ marginTop: 0 }}>
              {activeEmergencies.length > 0 && <span className="resq-live-dot" aria-hidden="true" />}
              {isResponderView ? t('emergencyQueue') : t('myEmergencies')}
            </h2>
            <p className="resq-subtle" style={{ marginTop: 0 }}>
              {isResponderView ? t('openCasesInstitution') : t('activeAndRecentCases')}
            </p>

            <div style={{ marginBottom: 18 }}>
              <h3 style={{ marginTop: 0 }}>{t('active')}</h3>
              {activeEmergencies.length === 0 && <p className="resq-subtle">{t('noActiveEmergencies')}</p>}
              {activeEmergencies.map((emergency) => (
                <div key={emergency.id} className="resq-row-interactive" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{typeLabel(emergency.emergency_type, t)}</strong>
                      <p className="resq-subtle" style={{ margin: '4px 0' }}>
                        {new Date(emergency.created_at).toLocaleString()}
                      </p>
                      <span className={statusBadgeClass(emergency.status, emergency.claimed_by)}>
                        {emergency.claimed_by ? 'Claimed' : 'Open'} \u00b7 {emergency.status}
                      </span>
                      {isResponderView && (
                        <p className="resq-subtle" style={{ margin: '6px 0 0' }}>
                          {emergency.reporter?.full_name ? (
                            <>\ud83d\udc64 {emergency.reporter.full_name}{(emergency.reporter.phone || emergency.triggered_by_phone) ? ' \u00b7 ' + (emergency.reporter.phone || emergency.triggered_by_phone) : ''}</>
                          ) : emergency.triggered_by_phone ? (
                            <>\ud83d\udcde {emergency.triggered_by_phone} {emergency.triggered_via === 'ussd' ? '(USSD)' : emergency.triggered_via === 'sms' ? '(SMS)' : ''}</>
                          ) : (
                            <>Reporter details unavailable</>
                          )}
                          {emergency.lat != null && emergency.lng != null && (
                            <>
                              {' \u00b7 '}
                              <a
                                href={`https://www.google.com/maps?q=${emergency.lat},${emergency.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                \ud83d\udccd View location
                              </a>
                            </>
                          )}
                        </p>
                      )}
                      {isResponderView && emergency.ai_flag_to_responder && (
                        <div className="resq-flag-box">
                          <strong>AI flag</strong>
                          <p style={{ margin: '4px 0 0' }}>{emergency.ai_flag_to_responder}</p>
                        </div>
                      )}
                    </div>
                    {isResponderView && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <button className="resq-btn-secondary" onClick={() => handleClaim(emergency.id)} disabled={claimingId === emergency.id}>
                          {claimingId === emergency.id ? t('claiming') : t('claim')}
                        </button>
                        <button className="resq-btn-secondary" onClick={() => handleResolve(emergency.id)} disabled={resolvingId === emergency.id}>
                          {resolvingId === emergency.id ? t('resolving') : t('resolve')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginTop: 0 }}>{t('resolved')}</h3>
              {resolvedEmergencies.length === 0 && <p className="resq-subtle">{t('noResolvedEmergencies')}</p>}
              {resolvedEmergencies.map((emergency) => (
                <div key={emergency.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <strong>{typeLabel(emergency.emergency_type, t)}</strong>
                  <p className="resq-subtle" style={{ margin: '4px 0' }}>
                    Resolved {emergency.resolved_at ? new Date(emergency.resolved_at).toLocaleString() : 'recently'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}