'use client'

import { useEffect, useRef, useState } from 'react'

// Synthesizes a loud, wailing two-tone siren with the Web Audio API
// (no audio file needed) while `active` is true, unless muted.
//
// Important limitation: a browser tab cannot override a device's
// hardware mute switch, silent mode, or OS-level Do Not Disturb —
// no website can do that, only native apps with special "critical
// alert" platform permissions (which the RESQ mobile app could
// eventually request). What this CAN do: play at maximum safe
// volume, keep playing while the tab is open (including in a
// background tab — browsers throttle timers there but the audio
// itself keeps running), and make sure it's the loudest, harshest
// thing this tab can produce.
//
// Browsers also block audio until a user gesture, so this only
// starts once the visitor has interacted with the page at least
// once (a click/tap anywhere), which is normal by the time a
// responder is looking at a live queue.
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

      // A limiter lets us push the oscillator hard without the
      // output clipping into ugly digital distortion.
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -6
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.002
      limiter.release.value = 0.1
      limiter.connect(ctx.destination)

      // Two oscillators (a fifth apart) read as a louder, richer
      // "alarm" than a single tone at the same peak level.
      const gain = ctx.createGain()
      gain.gain.value = 0.9
      gain.connect(limiter)

      const oscA = ctx.createOscillator()
      oscA.type = 'sawtooth'
      oscA.connect(gain)

      const oscB = ctx.createOscillator()
      oscB.type = 'square'
      oscB.connect(gain)

      const sweep = () => {
        const t = ctx.currentTime
        oscA.frequency.cancelScheduledValues(t)
        oscB.frequency.cancelScheduledValues(t)
        oscA.frequency.setValueAtTime(oscA.frequency.value, t)
        oscB.frequency.setValueAtTime(oscB.frequency.value, t)
        oscA.frequency.linearRampToValueAtTime(1200, t + 0.5)
        oscB.frequency.linearRampToValueAtTime(1200 * 1.5, t + 0.5)
        oscA.frequency.linearRampToValueAtTime(500, t + 1.0)
        oscB.frequency.linearRampToValueAtTime(500 * 1.5, t + 1.0)
      }
      oscA.frequency.setValueAtTime(500, ctx.currentTime)
      oscB.frequency.setValueAtTime(750, ctx.currentTime)
      sweep()
      const interval = setInterval(sweep, 1000)
      oscA.start()
      oscB.start()

      nodesRef.current = { oscA, oscB, gain, limiter, interval }
    }

    if (!shouldPlay && nodesRef.current) {
      const { oscA, oscB, interval } = nodesRef.current
      clearInterval(interval)
      try { oscA.stop() } catch { /* already stopped */ }
      try { oscB.stop() } catch { /* already stopped */ }
      nodesRef.current = null
    }

    return () => {
      if (!active && nodesRef.current) {
        const { oscA, oscB, interval } = nodesRef.current
        clearInterval(interval)
        try { oscA.stop() } catch { /* already stopped */ }
        try { oscB.stop() } catch { /* already stopped */ }
        nodesRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, muted, unlocked])

  useEffect(() => {
    return () => {
      if (nodesRef.current) {
        clearInterval(nodesRef.current.interval)
        try { nodesRef.current.oscA.stop() } catch { /* already stopped */ }
        try { nodesRef.current.oscB.stop() } catch { /* already stopped */ }
      }
      if (ctxRef.current) ctxRef.current.close()
    }
  }, [])

  return { muted, setMuted }
}
