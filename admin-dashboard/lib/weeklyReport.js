// lib/weeklyReport.js
//
// Runs weekly (see app/api/cron/weekly-report/route.js): for every
// active institution, builds the same detailed report available for
// manual download (app/institution-admin/case-reports/page.js) for
// whatever's been resolved since the last run, emails it as an
// attachment to the institution admin, then prunes the chat message
// text for those cases from our database — the institution admin now
// has their own permanent copy in their inbox/downloads, so RESQ's
// servers don't need to keep the bulky per-message history forever.
//
// Deliberately conservative about what gets deleted: only
// emergency_messages rows. The emergency record itself (type, who
// triggered/handled it, every timestamp, rating, photo/video URLs)
// is kept indefinitely as the institution's permanent case history —
// only the raw chat transcript, already captured in the emailed
// report, is cleared.

import { supabaseAdmin } from './supabaseAdmin'
import { buildWeeklyReportHtml } from './buildEmergencyReport'

const CASE_SELECT = `
  id, emergency_type, status, created_at, claimed_at, resolved_at, lat, lng,
  triggered_by_phone, triggered_via, photo_url, video_url, rating, rating_comment,
  reporter:profiles!emergencies_triggered_by_fkey(full_name, phone, email),
  claimant:profiles!emergencies_claimed_by_fkey(full_name, email)
`

async function getRecipientEmail(institution) {
  const { data: admin } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('institution_id', institution.id)
    .eq('role', 'institution_admin')
    .limit(1)
    .maybeSingle()
  return admin?.email || institution.contact_email || null
}

async function sendReportEmail(toEmail, institutionName, rangeLabel, html) {
  if (!process.env.RESEND_API_KEY) {
    console.log('WEEKLY REPORT EMAIL SKIPPED: RESEND_API_KEY not set')
    return false
  }

  // Resend's shared onboarding@resend.dev address only delivers to the
  // account owner's own verified email — every other recipient is
  // silently rejected until a real domain is verified in the Resend
  // dashboard and set here. Institution admins are almost certainly
  // not receiving these reports right now if RESEND_FROM_EMAIL isn't set.
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'RESQ <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromAddress,
      to: [toEmail],
      subject: `RESQ Weekly Report: ${institutionName} (${rangeLabel})`,
      html:
        `<p>Attached is ${institutionName}'s RESQ case report for ${rangeLabel}.</p>` +
        `<p>Please save this for your own records. Per RESQ's data retention policy, the chat message ` +
        `history for these resolved cases is cleared from our servers once this report has been sent ` +
        `(the case records themselves, including type, timestamps, and ratings, are kept).</p>` +
        `<hr style="border:none;border-top:1px solid #e2e2e2;margin:20px 0" />` +
        `<p style="font-size:12px;color:#888">You're receiving this because you're the registered admin ` +
        `for ${institutionName} on RESQ. This is an operational report tied to your institution's case ` +
        `history, not a marketing email — contact your RESQ super admin if you believe you're receiving ` +
        `it in error.</p>`,
      attachments: [
        {
          filename: `resq-weekly-report-${new Date().toISOString().slice(0, 10)}.html`,
          content: Buffer.from(html).toString('base64')
        }
      ]
    })
  })

  if (!res.ok) {
    console.error('WEEKLY REPORT EMAIL FAILED:', await res.text())
  }
  return res.ok
}

export async function sendWeeklyReportsToAllInstitutions() {
  const { data: institutions, error: fetchError } = await supabaseAdmin
    .from('institutions')
    .select('id, name, status, contact_email, last_weekly_report_sent_at')
    .eq('status', 'active')

  if (fetchError) throw fetchError

  const summary = { institutionsChecked: institutions?.length || 0, emailsSent: 0, casesArchived: 0, skipped: [] }

  for (const institution of institutions || []) {
    const windowEnd = new Date()
    const windowStart = institution.last_weekly_report_sent_at
      ? new Date(institution.last_weekly_report_sent_at)
      : new Date(windowEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data: cases, error: casesError } = await supabaseAdmin
      .from('emergencies')
      .select(CASE_SELECT)
      .eq('institution_id', institution.id)
      .eq('status', 'resolved')
      .gte('resolved_at', windowStart.toISOString())
      .lte('resolved_at', windowEnd.toISOString())
      .order('resolved_at', { ascending: false })

    if (casesError) {
      summary.skipped.push({ institution: institution.name, reason: casesError.message })
      continue
    }

    if (!cases || cases.length === 0) {
      // Nothing to report — still advance the window so next week
      // doesn't re-scan an empty range, but don't send an empty email.
      await supabaseAdmin.from('institutions').update({ last_weekly_report_sent_at: windowEnd.toISOString() }).eq('id', institution.id)
      continue
    }

    const recipientEmail = await getRecipientEmail(institution)
    if (!recipientEmail) {
      summary.skipped.push({ institution: institution.name, reason: 'No admin/contact email on file' })
      continue
    }

    const withMessages = []
    for (const emergency of cases) {
      const { data: messages } = await supabaseAdmin
        .from('emergency_messages')
        .select('sender_role, message, media_url, media_type, is_ai_generated, created_at')
        .eq('emergency_id', emergency.id)
        .order('created_at', { ascending: true })
      withMessages.push({ emergency, messages: messages || [] })
    }

    const rangeLabel = `${windowStart.toLocaleDateString()} to ${windowEnd.toLocaleDateString()}`
    const html = buildWeeklyReportHtml({ institutionName: institution.name, cases: withMessages, rangeLabel })

    const sent = await sendReportEmail(recipientEmail, institution.name, rangeLabel, html)
    if (!sent) {
      summary.skipped.push({ institution: institution.name, reason: 'Email send failed, window not advanced, will retry next run' })
      continue
    }

    const caseIds = cases.map((c) => c.id)
    await supabaseAdmin.from('emergency_messages').delete().in('emergency_id', caseIds)
    await supabaseAdmin.from('institutions').update({ last_weekly_report_sent_at: windowEnd.toISOString() }).eq('id', institution.id)

    summary.emailsSent += 1
    summary.casesArchived += cases.length
  }

  return summary
}
