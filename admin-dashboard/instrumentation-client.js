// instrumentation-client.js
// Runs in the browser — captures unhandled errors and performance
// traces for the RESQ web dashboard.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://8d77a4b207ade3ee2dea53688c29b0a8@o4512097028014080.ingest.us.sentry.io/4512097037451264',
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  environment: process.env.NODE_ENV,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
