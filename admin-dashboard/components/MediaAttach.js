'use client'

import { useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Lets a reporting user attach a photo or video to their active
// emergency straight from the browser (camera or file picker on
// mobile browsers, file picker on desktop). Voice notes are handled
// natively on the mobile app instead, where in-browser recording
// isn't reliable across devices.
const MAX_SIZE_MB = { photo: 10, video: 50 }

export default function MediaAttach({ emergencyId, onUploaded }) {
  const photoInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function handleFile(file, kind) {
    if (!file || !emergencyId) return
    setError('')

    const maxBytes = MAX_SIZE_MB[kind] * 1024 * 1024
    if (file.size > maxBytes) {
      setError(`That file is too large — ${kind} attachments are limited to ${MAX_SIZE_MB[kind]}MB.`)
      return
    }

    setBusy(kind)

    try {
      const ext = file.name.split('.').pop() || (kind === 'photo' ? 'jpg' : 'mp4')
      const path = `${emergencyId}-${kind}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(path, file, { contentType: file.type, upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('emergency-photos').getPublicUrl(path)
      const column = kind === 'photo' ? 'photo_url' : 'video_url'

      const { error: updateError } = await supabase
        .from('emergencies')
        .update({ [column]: urlData.publicUrl })
        .eq('id', emergencyId)

      if (updateError) throw updateError

      onUploaded?.(kind)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setBusy('')
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Attach evidence</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="resq-btn-secondary"
          onClick={() => photoInputRef.current?.click()}
          disabled={busy === 'photo'}
        >
          {busy === 'photo' ? 'Uploading…' : '📷 Add photo'}
        </button>
        <button
          type="button"
          className="resq-btn-secondary"
          onClick={() => videoInputRef.current?.click()}
          disabled={busy === 'video'}
        >
          {busy === 'video' ? 'Uploading…' : '🎥 Add video'}
        </button>
      </div>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0], 'photo')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0], 'video')}
      />
      {error && <p style={{ color: '#ff8080', marginTop: 8 }}>{error}</p>}
    </div>
  )
}
