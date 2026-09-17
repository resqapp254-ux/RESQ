'use client'

// Shown once, the first time a user or responder lands on the
// dashboard, if their institution requires an admission/work-ID
// number and/or (for responders) a one-time profile picture that
// they haven't provided yet. Saved to profiles and never asked again.

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function IdentityPrompt({ userId, role, needsAdmissionNumber, needsPhoto, onDone }) {
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (needsAdmissionNumber && !admissionNumber.trim()) {
      setError('Enter your admission/work ID number to continue.')
      return
    }
    if (needsPhoto && !photoFile) {
      setError('Upload a profile picture to continue.')
      return
    }

    setSaving(true)
    try {
      const updates = {}
      if (needsAdmissionNumber) updates.admission_number = admissionNumber.trim()

      if (needsPhoto && photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const path = `${userId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        updates.avatar_url = publicUrlData.publicUrl
      }

      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (updateError) throw updateError

      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,7,13,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 420 }}>
        <h2 style={{ marginTop: 0 }}>One more thing</h2>
        <p className="resq-subtle" style={{ marginBottom: 16 }}>
          Your institution asks for the following before you continue. This is only requested once.
        </p>
        <form onSubmit={handleSubmit}>
          {needsAdmissionNumber && (
            <>
              <label>Admission / work ID / reference number</label>
              <input
                className="resq-input"
                style={{ marginTop: 4, marginBottom: 14 }}
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                required
              />
            </>
          )}
          {needsPhoto && (
            <>
              <label>{role === 'responder' ? 'Responder profile picture' : 'Profile picture'}</label>
              <input
                type="file"
                accept="image/*"
                style={{ marginTop: 4, marginBottom: 14, display: 'block' }}
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                required
              />
            </>
          )}
          {error && <p style={{ color: '#ff8080' }}>{error}</p>}
          <button className="resq-btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={saving}>
            {saving ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
