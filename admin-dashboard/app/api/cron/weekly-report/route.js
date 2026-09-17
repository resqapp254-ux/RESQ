// app/api/cron/weekly-report/route.js
//
// Triggered on a weekly schedule (see docs/deployment-readiness.md,
// same external-pinger approach as /api/cron/escalate — point a
// weekly cron-job.org schedule at this URL, not a native Vercel
// Cron). Emails each active institution's admin their case report
// for whatever's resolved since the last run, then prunes the raw
// chat history for those cases (see lib/weeklyReport.js for exactly
// what is and isn't deleted).
//
// Protected by CRON_SECRET, same as the escalate cron.

import { NextResponse } from 'next/server'
import { sendWeeklyReportsToAllInstitutions } from '../../../../lib/weeklyReport'
import { getClientIp, rateLimit } from '../../../../lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { allowed } = rateLimit('cron-weekly-report:' + getClientIp(request), 3, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
  }

  const expected = process.env.CRON_SECRET
  if (expected) {
    const provided = (request.headers.get('authorization') || '').replace('Bearer ', '')
    if (provided !== expected) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const result = await sendWeeklyReportsToAllInstitutions()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('WEEKLY REPORT CRON ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
