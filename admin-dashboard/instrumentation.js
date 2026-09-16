// instrumentation.js
// Next.js calls this once per runtime on boot; it loads the matching
// Sentry init file so both the Node server and Edge runtime report errors.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config.js')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config.js')
  }
}
