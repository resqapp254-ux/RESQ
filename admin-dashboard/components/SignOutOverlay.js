'use client'

import { useEffect, useState } from 'react'
import GoodbyeShield from './GoodbyeShield'

// A different edge/position every time — "come from anywhere, not a
// single point" per spec — so signing out never feels mechanically
// identical twice.
function randomStart() {
  const edge = Math.floor(Math.random() * 4)
  const along = 15 + Math.random() * 70
  if (edge === 0) return { top: '-15%', left: `${along}%` }
  if (edge === 1) return { top: `${along}%`, left: '112%' }
  if (edge === 2) return { top: '115%', left: `${along}%` }
  return { top: `${along}%`, left: '-15%' }
}

// Shown while signing out of any page: a plain smiling shield (no
// limbs at all, so it can never read as a devil/horned figure) glides
// in from a random edge, arrives center-screen, and rocks gently side
// to side like a nod goodbye, then the caller's onComplete actually
// performs the sign-out + redirect. Deliberately short (~2.4s total)
// — signing IN stays fast and un-fussy; this is the one place a
// little ceremony fits.
export default function SignOutOverlay({ onComplete }) {
  const [start] = useState(randomStart)
  const [arrived, setArrived] = useState(false)
  const [waved, setWaved] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setArrived(true))
    const t1 = setTimeout(() => setWaved(true), 950)
    const t2 = setTimeout(() => onComplete?.(), 2500)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posStyle = arrived
    ? { top: '46%', left: '50%' }
    : { top: start.top, left: start.left }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(5,7,13,0.92)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        overflow: 'hidden'
      }}
      role="status"
      aria-live="polite"
    >
      <div
        style={{
          position: 'absolute',
          ...posStyle,
          transform: 'translate(-50%, -50%)',
          transition: 'top 0.9s cubic-bezier(0.2,0.8,0.2,1), left 0.9s cubic-bezier(0.2,0.8,0.2,1)'
        }}
      >
        <GoodbyeShield size={110} rocking={waved} />
      </div>
      {waved && (
        <div
          className="resq-fade-in"
          style={{ position: 'absolute', top: '68%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: '100%', color: '#f4f6fb' }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>See you soon 👋</p>
          <p className="resq-subtle" style={{ marginTop: 4 }}>Signing you out…</p>
        </div>
      )}
    </div>
  )
}
