// sentry.edge.config.js
// Runs in the Edge runtime (e.g. middleware) — kept minimal since RESQ
// has no edge middleware today, but this covers it if one is added.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://8d77a4b207ade3ee2dea53688c29b0a8@o4512097028014080.ingest.us.sentry.io/4512097037451264',
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // See sentry.server.config.js — same false-positive from Next.js's
    // internal static-to-dynamic rendering bailout.
    if (hint?.originalException?.digest === 'DYNAMIC_SERVER_USAGE') return null
    return event
  },
})
