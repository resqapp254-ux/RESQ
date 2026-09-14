// lib/rateLimit.js
// A minimal in-memory sliding-window rate limiter for Next.js API
// routes. This is intentionally simple — no Redis, no extra infra —
// because it only needs to blunt obvious abuse (a script hammering a
// webhook or spamming fake emergencies), not survive a distributed
// attack. Each serverless instance keeps its own counters, so under
// heavy traffic across many instances the effective limit is looser
// than the configured number; if RESQ outgrows that, swap this for
// Upstash Redis (works natively on Vercel) without changing callers.

const buckets = new Map()

// Keep the map from growing forever across a long-lived instance.
function sweep(now) {
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => t > now - 5 * 60 * 1000)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}

let lastSweep = 0

/**
 * @param {string} key - identifies who/what is being limited (IP, user id, phone number...)
 * @param {number} limit - max requests allowed in the window
 * @param {number} windowMs - window size in milliseconds
 * @returns {{ allowed: boolean, remaining: number }}
 */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  if (now - lastSweep > 60 * 1000) {
    sweep(now)
    lastSweep = now
  }

  const hits = (buckets.get(key) || []).filter((t) => t > now - windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { allowed: false, remaining: 0 }
  }

  hits.push(now)
  buckets.set(key, hits)
  return { allowed: true, remaining: limit - hits.length }
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
