'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'resq-consent-accepted'

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [agreed, setAgreed] = useState(false)

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
    // Deliberately NOT position:fixed — a floating overlay covered the
    // bottom of long pages like /privacy and /terms while scrolling.
    // Rendered in normal flow (see app/layout.js), it now appears once
    // right after the page's own content, wherever that ends.
    <div
      role="dialog"
      aria-label="Cookie and data notice"
      style={{
        maxWidth: 640,
        marginTop: 24,
        marginBottom: 24,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: 'calc(100% - 32px)',
        background: 'rgba(11,16,32,0.97)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14,
        padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)'
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: '#9aa4bf', lineHeight: 1.5 }}>
        RESQ uses essential cookies to keep you signed in, and collects your location and emergency reports solely to
        route help to you and your institution's responders. We never sell your data or use it for advertising. See our{' '}
        <a href="/terms" style={{ color: '#7fe3f2' }}>Terms</a>,{' '}
        <a href="/privacy" style={{ color: '#7fe3f2' }}>Privacy Policy</a> and{' '}
        <a href="/data-protection" style={{ color: '#7fe3f2' }}>Data Protection Agreement</a>.
      </p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, fontSize: 13, color: '#f4f6fb', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 2 }}
        />
        I agree to the use of essential cookies and to the Terms, Privacy Policy, and Data Protection Agreement.
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button
          className="resq-btn-primary"
          onClick={accept}
          disabled={!agreed}
          style={{ opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
