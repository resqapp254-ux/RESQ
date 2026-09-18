// app/api/emergency/ask-ai/route.js
//
// Lets the reporting user — or any responder/admin watching the case —
// ask a quick question in an emergency's chat while waiting for a
// human response. The AI only ever answers when it's confident it can
// do so briefly and safely; otherwise it stays silent and the
// question is left sitting in the shared chat thread for the primary
// responder to answer once they're on the case. Both the question and
// any AI answer are inserted into the same emergency_messages table
// the human chat already uses, so anyone who can see that case's chat
// (including the responder handling it) sees them automatically —
// no separate relay needed.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { canAccessEmergency, getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout'
import { rateLimit } from '../../../../lib/rateLimit'

const NO_ANSWER = 'NO_ANSWER'

const SYSTEM_PROMPT = `You are RESQ's emergency chat assistant. Someone involved in an ongoing emergency — either
the person who reported it, or a responder handling/watching it — has asked a follow-up question while waiting.

Rules:
- Only answer if you can give a brief, calm, practical, and safe answer you're genuinely confident in.
- If the question needs a medical diagnosis, asks about real-time facts you don't actually know (e.g. "is help
  almost here", "who is coming", exact ETAs, case-specific details), needs legal advice, or you're at all unsure
  it's safe or accurate to answer, reply with EXACTLY this and nothing else: ${NO_ANSWER}
- Otherwise, answer in under 60 words. No questions back. No disclaimers beyond what's necessary.`

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    // Paid/quota-limited AI call — generous enough for real back-and-forth,
    // tight enough to stop a scripted flood.
    if (!rateLimit('ask-ai:' + profile.id, 20, 10 * 60 * 1000).allowed) {
      return NextResponse.json({ success: false, error: 'Too many questions sent too quickly. Please slow down.' }, { status: 429 })
    }

    const { emergencyId, question } = await request.json()
    if (!emergencyId || !question?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId or question' }, { status: 400 })
    }

    const { data: emergency } = await supabaseAdmin
      .from('emergencies')
      .select('institution_id, claimed_by, triggered_by, emergency_type, status')
      .eq('id', emergencyId)
      .single()

    if (!emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }
    if (['resolved', 'cancelled'].includes(emergency.status)) {
      return NextResponse.json({ success: false, error: 'This emergency is already closed.' }, { status: 400 })
    }

    const isTriggeringUser = profile.role === 'user' && emergency.triggered_by === profile.id
    const isInstitutionResponder = ['responder', 'institution_admin', 'unit_admin'].includes(profile.role)
      && canAccessEmergency(profile, emergency, ['responder', 'institution_admin', 'unit_admin'])

    if (!isTriggeringUser && !isInstitutionResponder && profile.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Not authorized for this emergency' }, { status: 403 })
    }

    const trimmedQuestion = question.trim().slice(0, 500)

    // The question itself is always recorded in the shared chat — even
    // when the AI can't answer, it's now sitting there for the primary
    // responder to see and address once they're on the case.
    const { error: questionInsertError } = await supabaseAdmin.from('emergency_messages').insert({
      emergency_id: emergencyId,
      sender_id: user.id,
      sender_role: profile.role,
      message: trimmedQuestion
    })
    if (questionInsertError) {
      return NextResponse.json({ success: false, error: questionInsertError.message }, { status: 500 })
    }

    let answered = false
    let answerText = null

    try {
      const aiResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          max_tokens: 150,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Emergency type: "${emergency.emergency_type || 'other'}". Asked by: ${isTriggeringUser ? 'the person who reported it' : 'a responder'}. Question: "${trimmedQuestion}"` }
          ]
        })
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        const raw = aiData.choices?.[0]?.message?.content?.trim() || NO_ANSWER
        if (raw && !raw.includes(NO_ANSWER)) {
          answerText = raw
          answered = true
        }
      } else {
        console.error('GROQ API ERROR (ask-ai):', await aiResponse.text())
      }
    } catch (error) {
      console.error('GROQ API TIMEOUT/ERROR (ask-ai):', error.message)
      // Fail silent — no answer, the question still stands in the chat.
    }

    if (answered) {
      const { error: answerInsertError } = await supabaseAdmin.from('emergency_messages').insert({
        emergency_id: emergencyId,
        sender_id: user.id,
        sender_role: profile.role,
        message: '🤖 ' + answerText,
        is_ai_generated: true
      })
      if (answerInsertError) {
        console.error('AI ANSWER INSERT ERROR:', answerInsertError.message)
        answered = false
        answerText = null
      }
    }

    return NextResponse.json({ success: true, answered, answer: answerText })
  } catch (err) {
    console.error('ASK AI ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
