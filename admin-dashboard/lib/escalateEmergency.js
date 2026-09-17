// lib/escalateEmergency.js
//
// Omnichannel escalation: a push notification goes out the moment an
// emergency is triggered (lib/notifyResponders.js). If nobody claims
// it, this raises the volume — SMS after a few minutes, then a voice
// call if it's still unclaimed. Called on a schedule (see
// app/api/cron/escalate/route.js) rather than from any user action.

import { supabaseAdmin } from './supabaseAdmin'

const LEVEL_1_SMS_AFTER_MS = 3 * 60 * 1000 // unclaimed this long → SMS every responder
const LEVEL_2_CALL_AFTER_MS = 8 * 60 * 1000 // unclaimed this long → call one responder

async function sendSms(to, message) {
  if (!process.env.AFRICASTALKING_API_KEY) return false
  try {
    const body = new URLSearchParams({
      username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
      to,
      message
    })
    const response = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { apiKey: process.env.AFRICASTALKING_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body
    })
    return response.ok
  } catch (error) {
    console.error('Escalation SMS failed:', error.message)
    return false
  }
}

async function placeCall(to) {
  // Requires a voice-enabled Africa's Talking number
  // (AFRICASTALKING_VOICE_NUMBER) with its Voice Callback URL set to
  // /api/voice/callback in the Africa's Talking dashboard — until
  // that's provisioned, this is a no-op so escalation still runs (SMS
  // still goes out) rather than failing.
  if (!process.env.AFRICASTALKING_API_KEY || !process.env.AFRICASTALKING_VOICE_NUMBER) return false
  try {
    const body = new URLSearchParams({
      username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
      from: process.env.AFRICASTALKING_VOICE_NUMBER,
      to
    })
    const response = await fetch('https://voice.africastalking.com/call', {
      method: 'POST',
      headers: { apiKey: process.env.AFRICASTALKING_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body
    })
    return response.ok
  } catch (error) {
    console.error('Escalation call failed:', error.message)
    return false
  }
}

export async function escalateStaleEmergencies() {
  const { data: stale, error } = await supabaseAdmin
    .from('emergencies')
    .select('id, institution_id, emergency_type, created_at, escalation_level, institutions(name)')
    .eq('status', 'triggered')
    .lt('escalation_level', 2)

  if (error || !stale?.length) return { escalated: 0 }

  const now = Date.now()
  let escalated = 0

  for (const emergency of stale) {
    const ageMs = now - new Date(emergency.created_at).getTime()
    const targetLevel = ageMs >= LEVEL_2_CALL_AFTER_MS ? 2 : ageMs >= LEVEL_1_SMS_AFTER_MS ? 1 : 0
    if (targetLevel <= emergency.escalation_level) continue

    const { data: responders } = await supabaseAdmin
      .from('profiles')
      .select('id, phone')
      .eq('institution_id', emergency.institution_id)
      .eq('role', 'responder')
      .not('phone', 'is', null)

    if (!responders?.length) continue

    const institutionName = emergency.institutions?.name || 'your institution'
    const message = `RESQ ALERT: An unclaimed ${emergency.emergency_type} emergency at ${institutionName} needs a responder now. Open the app to claim it.`

    // Each step only advances the recorded level if it actually got
    // through, and only fires once per step (guarded by newLevel, not
    // just targetLevel) — otherwise a voice call that never succeeds
    // (e.g. AFRICASTALKING_VOICE_NUMBER not configured, the documented
    // default) would block the SMS step from ever being recorded too,
    // and the same SMS would resend on every single cron tick forever.
    let newLevel = emergency.escalation_level

    if (targetLevel >= 1 && newLevel < 1) {
      const results = await Promise.all(responders.map((r) => sendSms(r.phone, message)))
      if (results.some(Boolean)) newLevel = 1
    }

    if (targetLevel >= 2 && newLevel >= 1) {
      const callSucceeded = await placeCall(responders[0].phone)
      if (callSucceeded) newLevel = 2
    }

    if (newLevel === emergency.escalation_level) continue

    // Guard the update on the level we just read, so two overlapping
    // cron runs can't both escalate (and both SMS/call) the same
    // emergency at once.
    await supabaseAdmin
      .from('emergencies')
      .update({ escalation_level: newLevel, last_escalated_at: new Date().toISOString() })
      .eq('id', emergency.id)
      .eq('escalation_level', emergency.escalation_level)

    escalated += 1
  }

  return { escalated }
}
