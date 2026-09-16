// next.config.js
// Baseline security headers — there was no next.config.js at all
// before this, so none of these were being sent.

// Every external origin the browser actually needs, confirmed by
// grepping the codebase rather than guessed — anything server-side
// (Groq, Resend, Africa's Talking, Expo push) runs in API routes,
// never in the browser, so it doesn't belong in a browser CSP.
const supabaseOrigin = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
const supabaseWs = supabaseOrigin.replace(/^http/, 'ws')
// Sentry's ingest endpoint — error/performance reports are sent here from
// the browser, so it must be explicitly allowed or the CSP silently drops them.
const sentryIngest = 'https://o4512097028014080.ingest.us.sentry.io'

const csp = [
  "default-src 'self'",
  // Next.js injects its own hydration/runtime scripts inline; a
  // stricter nonce-based policy is possible later but needs
  // middleware changes beyond this pass.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: https://api.qrserver.com ${supabaseOrigin}`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} ${sentryIngest}`,
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

const { withSentryConfig } = require('@sentry/nextjs/config')

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: 'resqapp254',
  project: 'resq-dashboard',
  // No auth token is configured, so source-map upload is skipped at build
  // time — errors still report fine, just with un-mapped stack traces
  // until SENTRY_AUTH_TOKEN is added as a manual step.
  widenClientFileUpload: true,
  webpack: {
    removeDebugLogging: true,
    automaticVercelMonitors: true,
  },
})
