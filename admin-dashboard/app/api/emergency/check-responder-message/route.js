// app/api/emergency/check-responder-message/route.js
//
// Every responder chat message goes through here BEFORE it reaches
// the user. If it looks unsafe, dangerous, or clearly wrong, it is
// never delivered — instead the responder gets the reason plus a
// corrected version of what to say, and can resend. Safe messages
// are inserted here (server-side) and reach the user normally.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { canAccessEmergency, getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout'

const SYSTEM_PROMPT = `You are a safety reviewer for RESQ, an emergency dispatch app.
A human responder is about to send a chat message to someone in an active emergency.
Decide if the message contains instructions that are unsafe, dangerous, or clearly wrong
(e.g. telling someone to do something that could worsen a medical situation, contradicting
basic safety practice, or giving confidently wrong information).

Respond with ONLY a JSON object, no other text, in this exact shape:
{"flag": true or false, "reason": "short explanation, under 20 words, empty string if flag is false", "suggestion": "if flag is true, a corrected safe version of the message the responder should send instead; empty string if flag is false"}

Be conservative: only flag genuinely concerning content, not just brief or informal responses.`

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })
    const { emergencyId, message } = await request.json()

    if (!emergencyId || !message?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId or message' }, { status: 400 })
    }

    const { data: emergency } = await supabaseAdmin.from('emergencies').select('institution_id, claimed_by').eq('id', emergencyId).single()
    if (!canAccessEmergency(profile, emergency, ['responder', 'institution_admin', 'super_admin']) || (profile.role === 'responder' && emergency.claimed_by !== profile.id)) {
      return NextResponse.json({ success: false, error: 'Not authorized for this emergency' }, { status: 403 })
    }

    const trimmedMessage = message.trim()
    let flagged = false
    let reason = ''
    let suggestion = ''

    try {
      const aiResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          max_tokens: 200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Responder's message: "${trimmedMessage}"` }
          ]
        })
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        const raw = aiData.choices?.[0]?.message?.content?.trim() || '{"flag": false, "reason": "", "suggestion": ""}'
        const normalizedRaw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
        try {
          const parsed = JSON.parse(normalizedRaw)
          flagged = !!parsed.flag
          reason = parsed.reason || ''
          suggestion = parsed.suggestion || ''
        } catch {
          // Unparseable AI response — fail open, let the message through
        }
      }
      // Non-ok AI response also fails open — don't block chat over an AI hiccup
    } catch (error) {
      console.error('CHECK RESPONDER MESSAGE TIMEOUT/ERROR:', error.message)
      // Fail open
    }

    if (flagged) {
      // Never delivered to the user. Record the flag on the emergency
      // so admins can see it happened, and hand the responder a safe
      // version they can send instead.
      await supabaseAdmin.from('emergencies').update({ ai_flag_to_responder: reason }).eq('id', emergencyId)
      return NextResponse.json({ success: true, blocked: true, reason, suggestion })
    }

    const { error: insertError } = await supabaseAdmin.from('emergency_messages').insert({
      emergency_id: emergencyId,
      sender_id: user.id,
      sender_role: profile.role,
      message: trimmedMessage
    })

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, blocked: false })
  } catch (err) {
    console.error('CHECK RESPONDER MESSAGE ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
