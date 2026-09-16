// app/api/cron/escalate/route.js
//
// Triggered on a schedule (see vercel.json) to escalate any emergency
// that's stayed unclaimed too long — SMS, then a call. Not something a
// user or the app itself calls directly.
//
// Protected by CRON_SECRET: Vercel's own Cron Jobs send it
// automatically as `Authorization: Bearer <CRON_SECRET>` when the env
// var is set. If you're pinging this from an external service instead
// (e.g. because your Vercel plan only allows daily native crons), add
// the same header there. Unset CRON_SECRET and this runs unguarded —
// fine for local testing, not for production.

import { NextResponse } from 'next/server'
import { escalateStaleEmergencies } from '../../../../lib/escalateEmergency'

// Must run live on every hit, not be cached as a static response —
// without this, Next.js can prerender it at build time when
// CRON_SECRET happens to be unset locally, baking in one fixed
// response instead of actually escalating anything.
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const provided = (request.headers.get('authorization') || '').replace('Bearer ', '')
    if (provided !== expected) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await escalateStaleEmergencies()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('ESCALATION CRON ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
