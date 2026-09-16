// next.config.js
// Baseline security headers — there was no next.config.js at all
// before this, so none of these were being sent.
//
// Deliberately NOT adding Content-Security-Policy here: RESQ loads
// Google Fonts, QR code images from api.qrserver.com, and calls
// Supabase directly from the browser. A wrong CSP silently breaks
// those instead of erroring loudly, so it needs to be added and
// tested deliberately rather than as a drive-by addition.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self)' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
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
