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

// Atomically moves an emergency from `fromLevel` to `toLevel` — gated
// on `fromLevel` still being the current value, so if two cron runs
// read the same stale row at once, only one of them gets a row back
// from this update and is allowed to actually send anything. This has
// to happen BEFORE sending SMS/placing the call, not after — guarding
// only the final write (the previous version of this function) still
// lets two concurrent runs both send before either commits.
async function claimLevel(emergencyId, fromLevel, toLevel) {
  const { data, error } = await supabaseAdmin
    .from('emergencies')
    .update({ escalation_level: toLevel, last_escalated_at: new Date().toISOString() })
    .eq('id', emergencyId)
    .eq('escalation_level', fromLevel)
    .select('id')
    .maybeSingle()
  return !error && Boolean(data)
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
    let level = emergency.escalation_level
    let didSomething = false

    // Step 1 → SMS. Claimed independently of the call step below, so a
    // voice call that's never configured (the documented default)
    // doesn't stop this step from ever being marked done.
    if (targetLevel >= 1 && level < 1 && (await claimLevel(emergency.id, level, 1))) {
      level = 1
      didSomething = true
      await Promise.all(responders.map((r) => sendSms(r.phone, message)))
    }

    // Step 2 → call. Only reachable once step 1 is actually claimed
    // (by this run or a previous one), same atomic pattern.
    if (targetLevel >= 2 && level === 1 && (await claimLevel(emergency.id, level, 2))) {
      level = 2
      didSomething = true
      await placeCall(responders[0].phone)
    }

    if (didSomething) escalated += 1
  }

  return { escalated }
}
