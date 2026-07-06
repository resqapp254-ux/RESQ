// app/super-admin/page.js
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

const STATUS_COLORS = {
  pending_verification: '#b8860b',
  active: '#1a7f37',
  suspended: '#c02020'
}

export default function SuperAdminPage() {
  const [institutions, setInstitutions] = useState([])
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

  if (!authorized) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Checking access...</div>
  }

  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>RESQ Super Admin</h1>
        <div>
          <Link href="/super-admin/create" style={{ marginRight: 16, padding: '10px 16px', background: '#cc0000', color: 'white', textDecoration: 'none', borderRadius: 6 }}>
            + New Institution
          </Link>
          <button onClick={handleLogout} style={{ padding: '10px 16px' }}>Log Out</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading && <p>Loading institutions...</p>}

      {!loading && institutions.length === 0 && (
        <p>No institutions yet. Click "+ New Institution" to create your first one.</p>
      )}

      {!loading && institutions.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Tier</th>
              <th style={{ padding: 10 }}>Institution Code</th>
              <th style={{ padding: 10 }}>Verification Code</th>
              <th style={{ padding: 10 }}>QR Code</th>
              <th style={{ padding: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map((inst) => (
              <tr key={inst.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>
                  <strong>{inst.name}</strong><br />
                  <small style={{ color: '#666' }}>{inst.contact_email}</small>
                </td>
                <td style={{ padding: 10 }}>
                  <span style={{ color: STATUS_COLORS[inst.status] || '#333', fontWeight: 'bold' }}>
                    {inst.status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: 10 }}>
                  <select value={inst.subscription_tier} onChange={(e) => changeTier(inst, e.target.value)}>
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </td>
                <td style={{ padding: 10, fontFamily: 'monospace' }}>{inst.institution_code}</td>
                <td style={{ padding: 10, fontFamily: 'monospace' }}>
                  {inst.verification_code_used ? (
                    <span style={{ color: '#999' }}>used</span>
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
                  <button onClick={() => toggleStatus(inst)} style={{ marginRight: 8 }}>
                    {inst.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                  </button>
                  <button onClick={() => deleteInstitution(inst)} style={{ color: 'red' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
