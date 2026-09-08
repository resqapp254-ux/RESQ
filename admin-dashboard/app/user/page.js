'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

const EMERGENCY_TYPES = [
  'medical',
  'fire',
  'accident',
  'security',
  'gbv',
  'mental_health',
  'other'
]

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
  const [chatMessage, setChatMessage] = useState('')
  const [chatError, setChatError] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [locationBusy, setLocationBusy] = useState(false)

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

      await refreshEmergencies(authData.user.id, status?.role)
      setLoading(false)
    }

    load()
  }, [router])

  async function refreshEmergencies(userId, roleValue) {
    const roleName = roleValue || role

    if (roleName === 'user') {
      const { data: open } = await supabase
        .from('emergencies')
        .select('id, emergency_type, status, created_at, claimed_by, ai_advice_to_user')
        .eq('triggered_by', userId)
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
      return
    }

    if (['responder', 'institution_admin', 'super_admin'].includes(roleName)) {
      let openQuery = supabase
        .from('emergencies')
        .select('id, emergency_type, status, created_at, claimed_by, institution_id, triggered_by')
        .in('status', ['triggered', 'claimed', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20)

      if (roleName !== 'super_admin') {
        openQuery = openQuery.eq('institution_id', (await supabase.auth.getUser()).data.user.id)
      }

      const { data: open } = await openQuery

      let resolvedQuery = supabase
        .from('emergencies')
        .select('id, emergency_type, status, resolved_at, institution_id')
        .eq('status', 'resolved')
        .order('resolved_at', { ascending: false })
        .limit(10)

      if (roleName !== 'super_admin') {
        resolvedQuery = resolvedQuery.eq('institution_id', (await supabase.auth.getUser()).data.user.id)
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

  async function handleTriggerEmergency() {
    setError('')
    setMessage('')
    setLocationBusy(true)

    const location = await requestLocation()
    setLocationBusy(false)

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      router.replace('/login')
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setError('Missing session token. Please log in again.')
      return
    }

    const response = await fetch('/api/emergency/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        emergencyType: selectedType,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null
      })
    })

    const result = await response.json()
    if (!response.ok) {
      setError(result.error || 'Could not trigger emergency')
      return
    }

    setCurrentEmergency(result.emergency)
    setMessage('Emergency sent. Responders are being notified.')
    await refreshEmergencies(authData.user.id, role)
  }

  async function handleClaim(emergencyId) {
    setClaimingId(emergencyId)
    setError('')
    setMessage('')

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setError('Missing session token. Please log in again.')
      setClaimingId('')
      return
    }

    const response = await fetch('/api/emergency/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
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

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      setError('Missing session token. Please log in again.')
      setResolvingId('')
      return
    }

    const response = await fetch('/api/emergency/mark-resolved', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
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

    const { data: emergency, error: emergencyError } = await supabase
      .from('emergencies')
      .select('id, institution_id, triggered_by, claimed_by')
      .eq('id', currentEmergency?.id || activeEmergencies[0]?.id || '')
      .single()

    if (emergencyError || !emergency) {
      setChatError('No emergency selected.')
      setChatBusy(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
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
      await fetch('/api/emergency/check-responder-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ emergencyId: emergency.id, message })
      }).catch(() => null)
    }

    setChatMessage('')
    setChatBusy(false)
    setMessage('Message sent.')
  }

  if (loading) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading...</div>
  }

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <div className="resq-content" style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div className="glass-card" style={{ maxWidth: 720, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 120, height: 120 }}>
              <img src="/icon.svg" alt="RESQ" width="120" height="120" />
            </div>
          </div>
          <h1 className="resq-h1">RESQ</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>
            Signed in as {email}{role ? ` (${role})` : ''}{institutionName ? ` • ${institutionName}` : ''}.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>Emergency Control</h2>
            <p className="resq-subtle" style={{ marginTop: 0 }}>Trigger an emergency or manage one from here.</p>

            <div style={{ marginBottom: 14 }}>
              <label className="resq-subtle">Emergency type</label>
              <select
                className="resq-input"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {EMERGENCY_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <button
              className="resq-btn-primary"
              style={{ width: '100%' }}
              onClick={handleTriggerEmergency}
              disabled={locationBusy}
            >
              {locationBusy ? 'Locating...' : 'Trigger Emergency'}
            </button>

            {message && <p style={{ color: 'var(--resq-green)' }}>{message}</p>}
            {error && <p style={{ color: '#ff8080' }}>{error}</p>}

            <div style={{ marginTop: 20 }}>
              <h3 style={{ marginTop: 0 }}>Chat</h3>
              <textarea
                className="resq-input"
                style={{ minHeight: 120 }}
                placeholder="Type a message to responders..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
              <button className="resq-btn-secondary" style={{ width: '100%', marginTop: 12 }} onClick={sendChatMessage} disabled={chatBusy}>
                {chatBusy ? 'Sending...' : 'Send message'}
              </button>
              {chatError && <p style={{ color: '#ff8080' }}>{chatError}</p>}
            </div>
          </section>

          <section className="glass-card">
            <h2 style={{ marginTop: 0 }}>Emergencies</h2>
            <p className="resq-subtle" style={{ marginTop: 0 }}>Active and recent cases.</p>

            <div style={{ marginBottom: 18 }}>
              <h3 style={{ marginTop: 0 }}>Active</h3>
              {activeEmergencies.length === 0 && <p className="resq-subtle">No active emergencies.</p>}
              {activeEmergencies.map((emergency) => (
                <div key={emergency.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{emergency.emergency_type || 'Emergency'}</strong>
                      <p className="resq-subtle" style={{ margin: '4px 0' }}>
                        {new Date(emergency.created_at).toLocaleString()}
                      </p>
                      <p className="resq-subtle" style={{ margin: 0 }}>
                        {emergency.claimed_by ? 'Claimed' : 'Open'} · {emergency.status}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {['responder', 'institution_admin', 'super_admin'].includes(role) && (
                        <button className="resq-btn-secondary" onClick={() => handleClaim(emergency.id)} disabled={claimingId === emergency.id}>
                          {claimingId === emergency.id ? 'Claiming...' : 'Claim'}
                        </button>
                      )}
                      {['responder', 'institution_admin', 'super_admin'].includes(role) && (
                        <button className="resq-btn-secondary" onClick={() => handleResolve(emergency.id)} disabled={resolvingId === emergency.id}>
                          {resolvingId === emergency.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ marginTop: 0 }}>Resolved</h3>
              {resolvedEmergencies.length === 0 && <p className="resq-subtle">No resolved emergencies yet.</p>}
              {resolvedEmergencies.map((emergency) => (
                <div key={emergency.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <strong>{emergency.emergency_type || 'Emergency'}</strong>
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
