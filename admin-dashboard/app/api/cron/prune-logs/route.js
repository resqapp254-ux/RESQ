// app/api/cron/prune-logs/route.js
//
// Triggered on a daily schedule (same external-pinger approach as
// /api/cron/escalate — see docs/deployment-readiness.md). Deletes
// activity_log rows older than 90 days — sign-ins, failed auth,
// blocked triggers, account deletions, etc. shown in the Super Admin
// Terminal. That table is an operational audit trail, not a
// permanent record like the emergencies themselves; keeping it
// bounded stops it growing forever for no benefit anyone's asked for.
//
// Protected by CRON_SECRET, same as the other cron routes.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getClientIp, rateLimit } from '../../../../lib/rateLimit'
import { safeEqual } from '../../../../lib/safeCompare'

export const dynamic = 'force-dynamic'

const RETENTION_DAYS = 90

export async function GET(request) {
  const { allowed } = await rateLimit('cron-prune-logs:' + getClientIp(request), 3, 60 * 1000)
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
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const { error, count } = await supabaseAdmin
      .from('activity_log')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: count ?? 0, cutoff })
  } catch (err) {
    console.error('PRUNE LOGS CRON ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
