// sentry.server.config.js
// Runs on the Node.js server — captures errors/traces from API routes
// and server components.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://8d77a4b207ade3ee2dea53688c29b0a8@o4512097028014080.ingest.us.sentry.io/4512097037451264',
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Next.js throws this internally on every route that reads
    // request.headers/cookies to bail from static rendering into
    // per-request rendering — it's swallowed by Next.js itself and
    // the request completes normally. Sentry's route-handler wrapper
    // catches it before Next.js does, so without this filter every
    // authenticated API call (all of them read the auth header) would
    // get reported as a false-positive error.
    if (hint?.originalException?.digest === 'DYNAMIC_SERVER_USAGE') return null
    return event
  },
})
