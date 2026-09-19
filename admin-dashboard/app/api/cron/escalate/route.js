// app/api/cron/escalate/route.js
//
// Triggered on a schedule (see docs/deployment-readiness.md — an
// external pinger like cron-job.org or UptimeRobot, not a native
// Vercel Cron) to escalate any emergency that's stayed unclaimed too
// long — SMS, then a call. Not something a user or the app itself
// calls directly.
//
// Protected by CRON_SECRET: your pinger should send it as
// `Authorization: Bearer <CRON_SECRET>`. Unset CRON_SECRET and this
// runs unguarded except for the rate limit below — fine for local
// testing, not for production; set it before relying on this feature.

import { NextResponse } from 'next/server'
import { escalateStaleEmergencies } from '../../../../lib/escalateEmergency'
import { getClientIp, rateLimit } from '../../../../lib/rateLimit'
import { safeEqual } from '../../../../lib/safeCompare'

// Must run live on every hit, not be cached as a static response —
// without this, Next.js can prerender it at build time when
// CRON_SECRET happens to be unset locally, baking in one fixed
// response instead of actually escalating anything.
export const dynamic = 'force-dynamic'

export async function GET(request) {
  // Belt-and-braces even when CRON_SECRET is set — and the only real
  // protection while it isn't, so this can't be hammered to run up an
  // Africa's Talking bill or spam responders with premature escalation.
  const { allowed } = await rateLimit('cron-escalate:' + getClientIp(request), 6, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
  }

  const expected = process.env.CRON_SECRET
  if (expected) {
    const provided = (request.headers.get('authorization') || '').replace('Bearer ', '')
    if (!safeEqual(provided, expected)) {
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
