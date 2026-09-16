'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'resq-consent-accepted'

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function accept() {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // ignore — per-session only if storage is unavailable
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie and data notice"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 50,
        maxWidth: 640,
        margin: '0 auto',
        background: 'rgba(11,16,32,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: '#9aa4bf', lineHeight: 1.5 }}>
        RESQ uses essential cookies to keep you signed in, and collects your location and emergency reports solely to
        route help to you and your institution's responders. We never sell your data or use it for advertising. See our{' '}
        <a href="/privacy" style={{ color: '#7fe3f2' }}>Privacy Policy</a> and{' '}
        <a href="/terms" style={{ color: '#7fe3f2' }}>Terms of Service</a>.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="resq-btn-primary" onClick={accept}>
          Got it
        </button>
      </div>
    </div>
  )
}
