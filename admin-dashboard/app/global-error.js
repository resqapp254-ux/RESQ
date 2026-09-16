'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ fontFamily: 'sans-serif', textAlign: 'center', padding: '80px 24px' }}>
        <h1>Something went wrong</h1>
        <p>Our team has been notified. Please try again.</p>
        <button onClick={() => reset()} style={{ marginTop: 16, padding: '10px 20px', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  )
}
