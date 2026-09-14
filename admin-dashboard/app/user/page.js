'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

const EMERGENCY_TYPES = [
  { key: 'medical', label: 'Medical', emoji: '\uD83C\uDFE5' },
  { key: 'fire', label: 'Fire', emoji: '\uD83D\uDD25' },
  { key: 'accident', label: 'Accident', emoji: '\uD83D\uDE91' },
  { key: 'security', label: 'Security', emoji: '\uD83D\uDEE1\uFE0F' },
  { key: 'gbv', label: 'GBV', emoji: '\uD83E\uDD1D' },
  { key: 'mental_health', label: 'Mental Health', emoji: '\uD83E\uDDE0' },
  { key: 'other', label: 'Other', emoji: '\u26A0\uFE0F' }
]

function typeLabel(key) {
  const found = EMERGENCY_TYPES.find((t) => t.key === key)
  return found ? found.emoji + ' ' + found.label : (key || 'Emergency')
}

function statusBadgeClass(status, claimedBy) {
  if (status === 'resolved') return 'resq-badge resq-badge-resolved'
  if (claimedBy) return 'resq-badge resq-badge-claimed'
  return 'resq-badge resq-badge-open'
}

const RESPONDER_ROLES = ['responder', 'institution_admin', 'super_admin']

export default function UserPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [institutionName, setInstitutionName] = useState('')
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
  const [chatBusy, setChatBusy] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)
  const [triggerBusy, setTriggerBusy] = useState(false)

  const isResponderView = RESPONDER_ROLES.includes(role)

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        router.replace('/login')
        return
      }

      setEmail(authData.user.email || '')

      const { data: status } = await supabase.rpc('get_onboarding_status')
      if (status?.role) setRole(status.role)
      if (status?.role === 'user' && status.next_step === 'enter_institution_code') {
        router.replace('/join-institution')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', authData.user.id)
        .single()

      if (profile?.institution_id) {
        const { data: institution } = await supabase
          .from('institutions')
          .select('name')
          .eq('id', profile.institution_id)
          .single()
        setInstitutionName(institution?.name || '')
      }

      await refreshEmergencies(authData.user.id, status?.role, profile?.institution_id)
      setLoading(false)
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function refreshEmergencies(userId, roleValue, institutionId) {
    const roleName = roleValue || role

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
        .select('id, emergency_type, status, resolved_at')
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
        .select('id, emergency_type, status, created_at, claimed_by, institution_id, triggered_by, ai_flag_to_responder')
        .in('status', ['triggered', 'claimed', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (roleName !== 'super_admin' && institutionId) {
        openQuery = openQuery.eq('institution_id', institutionId)
      }

      const { data: open } = await openQuery

      let resolvedQuery = supabase
        .from('emergencies')
        .select('id, emergency_type, status, resolved_at, institution_id')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(10)

      if (roleName !== 'super_admin' && institutionId) {
        resolvedQuery = resolvedQuery.eq('institution_id', institutionId)
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

  async function sendChatMessage() {
    setChatError('')
    setChatBusy(true)

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace('/login')
      return
    }

    const targetId = currentEmergency?.id || activeEmergencies[0]?.id || ''
    if (!targetId) {
      setChatError('No emergency selected.')
      setChatBusy(false)
      return
    }

    const { data: emergency, error: emergencyError } = await supabase
      .from('emergencies')
      .select('id, institution_id, triggered_by, claimed_by')
      .eq('id', targetId)
      .single()

    if (emergencyError || !emergency) {
      setChatError('No emergency selected.')
      setChatBusy(false)
      return
    }

    const accessToken = await getAccessToken()
    if (!accessToken) {
      setChatError('Missing session token. Please log in again.')
      setChatBusy(false)
      return
    }

    const message = chatMessage.trim()
    if (!message) {
      setChatError('Type a message first.')
      setChatBusy(false)
      return
    }

    const senderRole = role || 'user'

    const { error: insertError } = await supabase
      .from('emergency_messages')
      .insert({
        emergency_id: emergency.id,
        sender_id: authData.user.id,
        sender_role: senderRole,
        message
      })

    if (insertError) {
      setChatError(insertError.message)
      setChatBusy(false)
      return
    }

    if (senderRole === 'responder') {
      fetch('/api/emergency/check-responder-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({ emergencyId: emergency.id, message })
      }).catch(() => null)
    }

    setChatMessage('')
    setChatBusy(false)
    setMessage('Message sent.')
  }

  if (loading) {
    return (
      <main className="resq-shell">
        <EmergencyPulseBackground />
        <div className="resq-content" style={{ padding: 40 }}>Loading...</div>
      </main>
    )
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <div className="resq-content" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div className="glass-card resq-fade-in" style={{ maxWidth: 720, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 96, height: 96 }}>
              <img src="/icon.svg" alt="RESQ" width="96" height="96" />
            </div>
          </div>
          <h1 className="resq-h1">RESQ</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Signed in as {email}
            {role ? ' \u2022 ' + (isResponderView ? 'Responder workspace' : 'User workspace') + ' (' + role + ')' : ''}
            {institutionName ? ' \u2022 ' + institutionName : ''}
          </p>
        </div>

        <div className="resq-two-col" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
          <section className="glass-card resq-fade-in resq-fade-in-2">
            {isResponderView ? (
              <>
                <h2 style={{ marginTop: 0 }}>Responder Console</h2>
                <p className="resq-subtle" style={{ marginTop: 0 }}>
                  Claim incoming emergencies, message the reporting user, and mark cases resolved once handled.
                </p>
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ marginTop: 0 }}>Message reporter</h3>
                  <textarea
                    className="resq-input"
                    style={{ minHeight: 120 }}
                    placeholder="Send an update to the person who reported this emergency..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                  <button className="resq-btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={sendChatMessage} disabled={chatBusy}>
                    {chatBusy ? 'Sending...' : 'Send message'}
                  </button>
                  {chatError && <p style={{ color: '#ff8080' }}>{chatError}</p>}
                  {message && <p className="resq-green">{message}</p>}
                </div>
              </>
            ) : (
              <>
                <h2 style={{ marginTop: 0 }}>Emergency Control</h2>
                <p className="resq-subtle" style={{ marginTop: 0 }}>Choose what's happening, then trigger — responders are alerted instantly.</p>

                <label className="resq-subtle">Emergency type</label>
                <div className="resq-type-grid">
                  {EMERGENCY_TYPES.map((type) => (
                    <button
                      type="button"
                      key={type.key}
                      className={'resq-type-chip' + (selectedType === type.key ? ' resq-type-chip-selected' : '')}
                      onClick={() => setSelectedType(type.key)}
                    >
                      <span className="resq-type-emoji">{type.emoji}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>

                <div className="resq-trigger-wrap">
                  <button
                    className="resq-trigger-btn"
                    onClick={handleTriggerEmergency}
                    disabled={locationBusy || triggerBusy}
                  >
                    {locationBusy ? 'Locating...' : triggerBusy ? 'Sending...' : 'SOS \u2014 Trigger'}
                  </button>
                </div>

                {message && <p className="resq-green" style={{ textAlign: 'center' }}>{message}</p>}
                {error && <p style={{ color: '#ff8080', textAlign: 'center' }}>{error}</p>}

                {currentAdvice && (
                  <div className="resq-advice-box">
                    <strong>AI safety guidance</strong>
                    <p style={{ margin: '6px 0 0' }}>{currentAdvice}</p>
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <h3 style={{ marginTop: 0 }}>Chat with responders</h3>
                  <textarea
                    className="resq-input"
                    style={{ minHeight: 100 }}
                    placeholder="Type a message to responders..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                  <button className="resq-btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={sendChatMessage} disabled={chatBusy}>
                    {chatBusy ? 'Sending...' : 'Send message'}
                  </button>
                  {chatError && <p style={{ color: '#ff8080' }}>{chatError}</p>}
                </div>
              </>
            )}
          </section>

          <section className="glass-card resq-fade-in resq-fade-in-3">
            <h2 style={{ marginTop: 0 }}>
              {activeEmergencies.length > 0 && <span className="resq-live-dot" aria-hidden="true" />}
              {isResponderView ? 'Emergency Queue' : 'My Emergencies'}
            </h2>
            <p className="resq-subtle" style={{ marginTop: 0 }}>
              {isResponderView ? 'Open cases assigned to your institution.' : 'Active and recent cases you have reported.'}
            </p>

            <div style={{ marginBottom: 18 }}>
              <h3 style={{ marginTop: 0 }}>Active</h3>
              {activeEmergencies.length === 0 && <p className="resq-subtle">No active emergencies.</p>}
              {activeEmergencies.map((emergency) => (
                <div key={emergency.id} className="resq-row-interactive" style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{typeLabel(emergency.emergency_type)}</strong>
                      <p className="resq-subtle" style={{ margin: '4px 0' }}>
                        {new Date(emergency.created_at).toLocaleString()}
                      </p>
                      <span className={statusBadgeClass(emergency.status, emergency.claimed_by)}>
                        {emergency.claimed_by ? 'Claimed' : 'Open'} \u00b7 {emergency.status}
                      </span>
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
                          {claimingId === emergency.id ? 'Claiming...' : 'Claim'}
                        </button>
                        <button className="resq-btn-secondary" onClick={() => handleResolve(emergency.id)} disabled={resolvingId === emergency.id}>
                          {resolvingId === emergency.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginTop: 0 }}>Resolved</h3>
              {resolvedEmergencies.length === 0 && <p className="resq-subtle">No resolved emergencies yet.</p>}
              {resolvedEmergencies.map((emergency) => (
                <div key={emergency.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <strong>{typeLabel(emergency.emergency_type)}</strong>
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