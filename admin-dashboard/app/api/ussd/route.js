// app/api/ussd/route.js
//
// Webhook called by Africa's Talking whenever someone interacts
// with RESQ's USSD code (e.g. dialing *384*XXXX#). No app, no
// login, no GPS — just a phone keypad menu.
//
// Africa's Talking sends form-encoded POST data (not JSON) with:
//   sessionId, phoneNumber, networkCode, serviceCode, text
// `text` accumulates every input the person has typed so far,
// separated by "*". Response must be plain text starting with
// "CON " (menu continues) or "END " (session finishes).

import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { notifyResponders } from '../../../lib/notifyResponders'
import { verifyWebhookSecret } from '../../../lib/verifyWebhookSecret'
import { getClientIp, rateLimit } from '../../../lib/rateLimit'

function ussdResponse(text) {
  return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain' } })
}

export async function POST(request) {
  if (!verifyWebhookSecret(request)) {
    return ussdResponse('END Unauthorized.')
  }

  const { allowed } = rateLimit('ussd:' + getClientIp(request), 30, 60 * 1000)
  if (!allowed) {
    return ussdResponse('END Too many requests. Try again shortly.')
  }

  const formData = await request.formData()
  const phoneNumber = formData.get('phoneNumber')
  const text = (formData.get('text') || '').toString()

  const inputs = text.split('*').filter(Boolean)
  let response = ''

  try {
    if (inputs.length === 0) {
      // First screen
      response = 'CON Welcome to RESQ\n1. Trigger Emergency'
    } else if (inputs.length === 1 && inputs[0] === '1') {
      response = 'CON Enter your institution code:'
    } else if (inputs.length === 2) {
      const code = inputs[1].trim().toUpperCase()
      const { data: institution } = await supabaseAdmin
        .from('institutions')
        .select('id, name, status')
        .eq('institution_code', code)
        .single()

      if (!institution || institution.status !== 'active') {
        response = 'END Invalid or inactive institution code. Please check and try again.'
      } else {
        response = `CON Confirm emergency for ${institution.name}?\n1. Yes, send now\n2. Cancel`
      }
    } else if (inputs.length === 3) {
      const code = inputs[1].trim().toUpperCase()
      const confirm = inputs[2]

      if (confirm !== '1') {
        response = 'END Emergency cancelled.'
      } else {
        const { data: institution } = await supabaseAdmin
          .from('institutions')
          .select('id, name, status')
          .eq('institution_code', code)
          .single()

        if (!institution || institution.status !== 'active') {
          response = 'END Invalid or inactive institution code.'
        } else if (!rateLimit('ussd-phone:' + phoneNumber, 3, 10 * 60 * 1000).allowed) {
          response = 'END Too many requests from this number. Please wait before trying again.'
        } else if (
          await supabaseAdmin
            .from('emergencies')
            .select('id')
            .eq('triggered_by_phone', phoneNumber)
            .in('status', ['triggered', 'claimed', 'in_progress'])
            .limit(1)
            .maybeSingle()
            .then(({ data }) => Boolean(data))
        ) {
          response = 'END This number already has an active emergency. It must be resolved first.'
        } else {
          const { data: emergency, error: insertError } = await supabaseAdmin
            .from('emergencies')
            .insert({
              institution_id: institution.id,
              triggered_by: null,
              triggered_by_phone: phoneNumber,
              lat: null,
              lng: null,
              triggered_via: 'ussd'
            })
            .select()
            .single()

          if (insertError) {
            console.error('USSD EMERGENCY INSERT ERROR:', insertError)
            response = 'END Something went wrong. Please try again or call for help directly.'
          } else {
            await notifyResponders(emergency.id)
            response = `END Your emergency has been sent to ${institution.name}. Help is on the way. You may be contacted at this number.`
          }
        }
      }
    } else {
      response = 'END Session ended.'
    }
  } catch (err) {
    console.error('USSD HANDLER ERROR:', err)
    response = 'END Something went wrong. Please try again.'
  }

  return new Response(response, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  })
}
