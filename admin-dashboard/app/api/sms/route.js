// app/api/sms/route.js
//
// Webhook called by Africa's Talking whenever someone sends an SMS
// to RESQ's shortcode. Expected format: "SOS <institution_code>"
// e.g. "SOS RESQ-3TKGB2" — case-insensitive, extra spaces tolerated.
//
// Africa's Talking sends form-encoded POST data with:
//   from, to, text, date, id, linkId

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { notifyResponders } from '../../../lib/notifyResponders'
import { verifyWebhookSecret } from '../../../lib/verifyWebhookSecret'
import { getClientIp, rateLimit } from '../../../lib/rateLimit'

export async function POST(request) {
  try {
    if (!verifyWebhookSecret(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { allowed } = rateLimit('sms:' + getClientIp(request), 20, 60 * 1000)
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }

    const formData = await request.formData()
    const from = formData.get('from')
    const text = (formData.get('text') || '').toString().trim()

    const parts = text.split(/\s+/)
    const keyword = (parts[0] || '').toUpperCase()
    const code = (parts[1] || '').toUpperCase()

    if (keyword !== 'SOS' || !code) {
      // Not a recognized emergency SMS — acknowledge silently, don't create anything
      return NextResponse.json({ success: true, note: 'Not an emergency-format message, ignored.' })
    }

    // A phone number can't be allowed to fire unlimited emergencies —
    // real repeat emergencies are rare enough that a tight limit here
    // only blocks abuse, not genuine use.
    const perPhone = rateLimit('sms-phone:' + from, 3, 10 * 60 * 1000)
    if (!perPhone.allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests from this number' }, { status: 429 })
    }

    const { data: institution } = await supabaseAdmin
      .from('institutions')
      .select('id, name, status')
      .eq('institution_code', code)
      .single()

    if (!institution || institution.status !== 'active') {
      // We can't reply via this webhook alone without Africa's Talking's send-SMS API,
      // which is a separate paid step, for now we just log it server-side.
      console.log(`SMS emergency attempt with invalid/inactive code: ${code} from ${from}`)
      return NextResponse.json({ success: false, error: 'Invalid or inactive institution code' })
    }

    // One open emergency per phone number at a time, same rule as the app.
    const { data: existingOpen } = await supabaseAdmin
      .from('emergencies')
      .select('id')
      .eq('triggered_by_phone', from)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .limit(1)
      .maybeSingle()

    if (existingOpen) {
      return NextResponse.json({ success: false, error: 'This number already has an active emergency; it must be resolved first.' })
    }

    const { data: emergency, error: insertError } = await supabaseAdmin
      .from('emergencies')
      .insert({
        institution_id: institution.id,
        triggered_by: null,
        triggered_by_phone: from,
        lat: null,
        lng: null,
        triggered_via: 'sms'
      })
      .select()
      .single()

    if (insertError) {
      console.error('SMS EMERGENCY INSERT ERROR:', insertError)
      return NextResponse.json({ success: false, error: insertError.message })
    }

    await notifyResponders(emergency.id)

    return NextResponse.json({ success: true, emergencyId: emergency.id })
  } catch (err) {
    console.error('SMS HANDLER ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' })
  }
}
