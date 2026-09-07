import { supabaseAdmin } from './supabaseAdmin'

export async function notifyGuardians(userId, institutionName) {
  if (!process.env.AFRICASTALKING_API_KEY) return { notified: 0, skipped: true }

  const { data: guardians, error } = await supabaseAdmin.from('guardians').select('guardian_name, guardian_phone').eq('user_id', userId)
  if (error || !guardians?.length) return { notified: 0 }

  const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', userId).single()
  const triggeringName = profile?.full_name || 'Someone you know'
  let notified = 0

  for (const guardian of guardians) {
    try {
      const body = new URLSearchParams({
        username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
        to: guardian.guardian_phone,
        message: `RESQ: ${triggeringName} just triggered an emergency at ${institutionName}. They have been connected with responders.`
      })
      const response = await fetch('https://api.sandbox.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: { apiKey: process.env.AFRICASTALKING_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body
      })
      if (response.ok) notified += 1
      else console.error(`Guardian SMS failed for ${guardian.guardian_phone}: ${response.status}`)
    } catch (error) {
      console.error(`Guardian SMS failed for ${guardian.guardian_phone}:`, error.message)
    }
  }
  return { notified }
}