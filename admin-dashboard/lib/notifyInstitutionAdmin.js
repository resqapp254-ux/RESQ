// lib/notifyInstitutionAdmin.js
//
// Sends alerts to an institution's admin: an SMS the moment an
// emergency triggers, and an email once it's resolved. Uses
// Africa's Talking (SMS) and Resend (email, free tier).
//
// NOTE: Resend's default sender (onboarding@resend.dev) can only
// deliver to the email address the Resend account itself was
// signed up with, unless you verify your own sending domain.
// That restriction is the most common cause of "failed" here.

import { supabaseAdmin } from './supabaseAdmin'

async function getInstitutionAdmin(institutionId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, phone')
    .eq('institution_id', institutionId)
    .eq('role', 'institution_admin')
    .limit(1)
    .single()
  return data
}

async function logNotification(institutionId, emergencyId, channel, recipient, status, detail) {
  console.log(`NOTIFY LOG [${channel}] to ${recipient}: ${status}${detail ? ' — ' + detail : ''}`)
  await supabaseAdmin.from('notification_log').insert({
    institution_id: institutionId,
    emergency_id: emergencyId,
    channel,
    recipient,
    status: detail ? `${status}: ${detail}`.slice(0, 250) : status
  })
}

export async function sendTriggerSmsToAdmin(emergencyId, institutionId, institutionName) {
  const admin = await getInstitutionAdmin(institutionId)
  if (!admin?.phone) {
    console.log('SMS TO ADMIN SKIPPED: no phone number on institution_admin profile')
    return
  }
  if (!process.env.AFRICASTALKING_API_KEY) {
    console.log('SMS TO ADMIN SKIPPED: AFRICASTALKING_API_KEY not set')
    return
  }

  try {
    const body = new URLSearchParams({
      username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
      to: admin.phone,
      message: `RESQ ALERT: A new emergency was just triggered at ${institutionName}. Open the dashboard for details.`
    })

    const res = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: process.env.AFRICASTALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body
    })

    const resultText = await res.text()

    if (res.ok) {
      await logNotification(institutionId, emergencyId, 'sms', admin.phone, 'sent')
    } else {
      await logNotification(institutionId, emergencyId, 'sms', admin.phone, 'failed', resultText)
    }
  } catch (err) {
    console.error('SMS TO ADMIN FAILED:', err.message)
    await logNotification(institutionId, emergencyId, 'sms', admin?.phone || 'unknown', 'failed', err.message)
  }
}

export async function sendResolutionEmailToAdmin(emergencyId, institutionId, institutionName) {
  const admin = await getInstitutionAdmin(institutionId)
  if (!admin?.email) {
    console.log('EMAIL TO ADMIN SKIPPED: no email on institution_admin profile')
    return
  }
  if (!process.env.RESEND_API_KEY) {
    console.log('EMAIL TO ADMIN SKIPPED: RESEND_API_KEY not set')
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RESQ <onboarding@resend.dev>',
        to: [admin.email],
        subject: `Emergency Resolved — ${institutionName}`,
        html: `<p>An emergency at <strong>${institutionName}</strong> has been marked resolved.</p><p>Emergency ID: ${emergencyId}</p>`
      })
    })

    const resultText = await res.text()

    if (res.ok) {
      await logNotification(institutionId, emergencyId, 'email', admin.email, 'sent')
    } else {
      await logNotification(institutionId, emergencyId, 'email', admin.email, 'failed', resultText)
    }
  } catch (err) {
    console.error('EMAIL TO ADMIN FAILED:', err.message)
    await logNotification(institutionId, emergencyId, 'email', admin?.email || 'unknown', 'failed', err.message)
  }
}