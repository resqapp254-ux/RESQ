// app/api/institution/alert-team/route.js
//
// A responder (typically a secondary/view-only one watching the feed
// without claim rights) can flag the team chat with an urgent alert,
// e.g. "unclaimed emergency needs attention". Posts the message with
// is_alert=true and pushes a notification to every other responder
// and the institution admin so it isn't just sitting unread in chat.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['responder', 'institution_admin'].includes(profile.role) || !profile.institution_id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    // An urgent, attention-grabbing push to the whole team — meant to
    // be rare, so a tight limit here only blocks abuse/alert fatigue.
    if (!(await rateLimit('alert-team:' + user.id, 5, 10 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many alerts sent recently. Please wait before sending another.' }, { status: 429 })
    }

    const { message } = await request.json()
    const trimmed = (message || '').trim().slice(0, 300) || 'Needs attention: please check the emergency queue.'

    const { data: chatMessage, error: insertError } = await supabaseAdmin
      .from('institution_chat_messages')
      .insert({
        institution_id: profile.institution_id,
        sender_id: user.id,
        message: trimmed,
        is_alert: true
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    const { data: recipients } = await supabaseAdmin
      .from('profiles')
      .select('push_token')
      .eq('institution_id', profile.institution_id)
      .neq('id', user.id)
      .not('push_token', 'is', null)

    if (recipients?.length) {
      const messages = recipients.map((r) => ({
        to: r.push_token,
        title: '🚨 Team alert',
        body: trimmed,
        priority: 'high',
        channelId: 'resq-emergency-alerts',
        sound: 'siren.wav',
        data: { institutionAlert: true }
      }))

      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages)
      }).catch((err) => console.error('Team alert push failed:', err.message))
    }

    return NextResponse.json({ success: true, message: chatMessage })
  } catch (err) {
    console.error('ALERT TEAM ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
