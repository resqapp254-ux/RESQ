// app/api/emergency/check-responder-message/route.js
//
// Called right after a responder sends a chat message. Asks Groq
// to flag anything that sounds unsafe, contradictory, or clearly
// wrong so the user isn't misled — surfaces as a warning banner
// on both the responder's and user's screens (ai_flag_to_responder).

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

const SYSTEM_PROMPT = `You are a safety reviewer for RESQ, an emergency dispatch app.
A human responder just sent a chat message to someone in an active emergency.
Decide if the message contains instructions that are unsafe, dangerous, or clearly wrong
(e.g. telling someone to do something that could worsen a medical situation, contradicting
basic safety practice, or giving confidently wrong information).

Respond with ONLY a JSON object, no other text, in this exact shape:
{"flag": true or false, "reason": "short explanation, under 20 words, empty string if flag is false"}

Be conservative — only flag genuinely concerning content, not just brief or informal responses.`

export async function POST(request) {
  try {
    const { emergencyId, message } = await request.json()

    if (!emergencyId || !message) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId or message' }, { status: 400 })
    }

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 100,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Responder's message: "${message}"` }
        ]
      })
    })

    if (!aiResponse.ok) {
      return NextResponse.json({ success: true, flagged: false }) // fail open — don't block chat over an AI hiccup
    }

    const aiData = await aiResponse.json()
    const raw = aiData.choices?.[0]?.message?.content?.trim() || '{"flag": false, "reason": ""}'

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { flag: false, reason: '' }
    }

    if (parsed.flag) {
      await supabaseAdmin
        .from('emergencies')
        .update({ ai_flag_to_responder: parsed.reason })
        .eq('id', emergencyId)
    }

    return NextResponse.json({ success: true, flagged: !!parsed.flag, reason: parsed.reason || '' })
  } catch (err) {
    console.error('CHECK RESPONDER MESSAGE ERROR:', err)
    return NextResponse.json({ success: true, flagged: false }) // fail open
  }
}
