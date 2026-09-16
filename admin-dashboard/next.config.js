// next.config.js
// Baseline security headers — there was no next.config.js at all
// before this, so none of these were being sent.

// Every external origin the browser actually needs, confirmed by
// grepping the codebase rather than guessed — anything server-side
// (Groq, Resend, Africa's Talking, Expo push) runs in API routes,
// never in the browser, so it doesn't belong in a browser CSP.
const supabaseOrigin = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseWs = supabaseOrigin.replace(/^http/, 'ws')

const csp = [
  "default-src 'self'",
  // Next.js injects its own hydration/runtime scripts inline; a
  // stricter nonce-based policy is possible later but needs
  // middleware changes beyond this pass.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: https://api.qrserver.com ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp }
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ]
  }
}

module.exports = nextConfig
