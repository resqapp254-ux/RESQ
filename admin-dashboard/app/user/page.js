'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import EmergencyPulseBackground from '../../components/EmergencyPulseBackground'

export default function UserPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login')
      else setEmail(data.user.email || '')
    })
  }, [router])
  return <main className="resq-shell"><EmergencyPulseBackground /><div className="resq-content" style={{ padding: 32 }}><div className="glass-card" style={{ maxWidth: 720 }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><div style={{ width: 120, height: 120 }}><img src="/icon.svg" alt="RESQ" width="120" height="120" /></div></div><h1 className="resq-h1">RESQ User</h1><p className="resq-subtle" style={{ marginTop: 8 }}>Signed in as {email}. Use the mobile app to trigger and manage emergencies.</p></div></div></main>
}