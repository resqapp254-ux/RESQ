// lib/safeCompare.js
//
// Plain `!==` on a secret leaks its length/prefix through response
// timing (an attacker measuring thousands of requests can narrow down
// a shared secret byte by byte). crypto.timingSafeEqual takes
// constant time regardless of where the strings first differ — but it
// throws if the two buffers aren't the same length, so lengths are
// equalized first (a length mismatch alone is safe to leak; it's the
// content match that must run in constant time).

import { timingSafeEqual } from 'crypto'

export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
