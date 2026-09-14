'use client'

import { useEffect, useRef, useState } from 'react'

// Synthesizes a two-tone wailing siren with the Web Audio API (no
// audio file needed) while `active` is true, unless muted. Browsers
// block audio until a user gesture, so this only starts once the
// visitor has interacted with the page at least once (a click/tap
// anywhere), which is normal by the time a responder is looking at
// a live queue.
export function useEmergencySiren(active) {
  const [muted, setMuted] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const ctxRef = useRef(null)
  const nodesRef = useRef(null)

  useEffect(() => {
    function unlock() {
      setUnlocked(true)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    const shouldPlay = active && !muted && unlocked

    if (shouldPlay && !nodesRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = ctxRef.current || new AudioCtx()
      ctxRef.current = ctx
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      gain.gain.value = 0.05
      osc.connect(gain)
      gain.connect(ctx.destination)

      const now = ctx.currentTime
      osc.frequency.setValueAtTime(650, now)
      const sweep = () => {
        const t = ctx.currentTime
        osc.frequency.linearRampToValueAtTime(950, t + 0.6)
        osc.frequency.linearRampToValueAtTime(650, t + 1.2)
      }
      sweep()
      const interval = setInterval(sweep, 1200)
      osc.start()

      nodesRef.current = { osc, gain, interval }
    }

    if (!shouldPlay && nodesRef.current) {
      const { osc, interval } = nodesRef.current
      clearInterval(interval)
      try { osc.stop() } catch { /* already stopped */ }
      nodesRef.current = null
    }

    return () => {
      if (!active && nodesRef.current) {
        const { osc, interval } = nodesRef.current
        clearInterval(interval)
        try { osc.stop() } catch { /* already stopped */ }
        nodesRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, muted, unlocked])

  useEffect(() => {
    return () => {
      if (nodesRef.current) {
        clearInterval(nodesRef.current.interval)
        try { nodesRef.current.osc.stop() } catch { /* already stopped */ }
      }
      if (ctxRef.current) ctxRef.current.close()
    }
  }, [])

  return { muted, setMuted }
}
