'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

export default function UserPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')

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
      }
    }

    load()
  }, [router])

  return (
    <main className="resq-shell">
      <EmergencyPulseBackground />
      <div className="resq-content" style={{ padding: 32 }}>
        <div className="glass-card" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 120, height: 120 }}>
              <img src="/icon.svg" alt="RESQ" width="120" height="120" />
            </div>
          </div>
          <h1 className="resq-h1">RESQ User</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>Signed in as {email}{role ? ` (${role})` : ''}. Use the mobile app to trigger and manage emergencies.</p>
        </div>
      </div>
    </main>
  )
}
