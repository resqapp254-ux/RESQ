// lib/rateLimit.js
// Sliding-window rate limiting for Next.js API routes. Uses Upstash
// Redis (works natively on Vercel, shared across every serverless
// instance) when credentials are available; otherwise falls back to
// the original in-memory limiter automatically, so nothing breaks for
// anyone who hasn't set up an Upstash database yet — each serverless
// instance just keeps its own counters again, exactly as before.
//
// Two naming conventions are accepted: UPSTASH_REDIS_REST_URL/TOKEN
// (the raw @upstash SDK names, set directly in .env.local) and
// KV_REST_API_URL/TOKEN (what Vercel's own Upstash-KV marketplace
// integration sets automatically in production) — checking both means
// connecting the integration in Vercel is enough on its own, no
// manual env var duplication required.
//
// Deliberately async either way (even the in-memory path), so every
// call site awaits the same shape and swapping backends never needs a
// second round of caller changes.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
const hasUpstash = !!(redisUrl && redisToken)

const redis = hasUpstash
  ? new Redis({ url: redisUrl, token: redisToken })
  : null

// One Ratelimit instance per distinct (limit, windowMs) pair, cached —
// @upstash/ratelimit's constructor is cheap but there's no reason to
// rebuild it on every call for the same configuration.
const limiterCache = new Map()

function getUpstashLimiter(limit, windowMs) {
  const cacheKey = `${limit}:${windowMs}`
  if (!limiterCache.has(cacheKey)) {
    limiterCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
        analytics: false,
        prefix: 'resq-ratelimit'
      })
    )
  }
  return limiterCache.get(cacheKey)
}

// ---- in-memory fallback (unchanged behavior from the original) ----
const buckets = new Map()

function sweep(now) {
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((t) => t > now - 5 * 60 * 1000)
    if (fresh.length === 0) buckets.delete(key)
    else buckets.set(key, fresh)
  }
}

let lastSweep = 0

function inMemoryRateLimit(key, limit, windowMs) {
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

/**
 * @param {string} key - identifies who/what is being limited (IP, user id, phone number...)
 * @param {number} limit - max requests allowed in the window
 * @param {number} windowMs - window size in milliseconds
 * @returns {Promise<{ allowed: boolean, remaining: number }>}
 */
export async function rateLimit(key, limit, windowMs) {
  if (!hasUpstash) return inMemoryRateLimit(key, limit, windowMs)

  try {
    const limiter = getUpstashLimiter(limit, windowMs)
    const result = await limiter.limit(key)
    return { allowed: result.success, remaining: result.remaining }
  } catch (err) {
    // Upstash hiccup shouldn't take the whole API down — fail open
    // (same posture the AI safety-check routes already use) and fall
    // back to the in-memory limiter for this one call.
    console.error('Upstash rate limit error, falling back to in-memory:', err.message)
    return inMemoryRateLimit(key, limit, windowMs)
  }
}

export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
