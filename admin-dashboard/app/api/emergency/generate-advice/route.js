// app/api/emergency/generate-advice/route.js
//
// SERVER-SIDE ROUTE. Called by the mobile app right after a user
// triggers an emergency. Generates brief, calm safety guidance via
// Groq's free API, saves it to the emergency record, and returns
// it so the mobile app can show it immediately.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { canAccessEmergency, getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { fetchWithTimeout } from '../../../../lib/fetchWithTimeout'

const SYSTEM_PROMPT = `You are an emergency first-response assistant embedded in RESQ, an emergency dispatch app.
A user has just triggered an emergency alert. Human responders are already being notified and are on their way.

Give brief, calm, practical safety guidance for the next few minutes while they wait for help.
Rules:
- Under 70 words.
- Calm, plain, reassuring tone. No medical diagnosis. No legal advice.
- Give generic safety steps (e.g. move somewhere visible/safe, stay on the line, keep phone charged/visible) rather than assuming a specific emergency type unless one is stated.
- Always mention that help is on the way.
- Do not ask questions. This is a one-way message the person will read in a stressful moment.`
const FALLBACK_ADVICE = 'Stay calm. Help is on the way. Move somewhere safe and visible if you can, keep your phone nearby, and follow instructions from responders.'

export async function POST(request) {
  try {
    const { profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })
    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const { data: emergency, error: fetchError } = await supabaseAdmin
      .from('emergencies')
      .select('id, lat, lng, triggered_via, institution_id, triggered_by')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }
    if (!canAccessEmergency(profile, emergency, ['user', 'responder', 'institution_admin', 'super_admin']) || (profile.role === 'user' && emergency.triggered_by !== profile.id)) {
      return NextResponse.json({ success: false, error: 'Not authorized for this emergency' }, { status: 403 })
    }

    const userMessage = `A user just triggered an emergency alert via the ${emergency.triggered_via} channel. Give them immediate safety guidance.`

    let adviceText = FALLBACK_ADVICE
    let usedFallback = true

    try {
      const aiResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ]
      })
      })

      if (aiResponse.ok) {
        const aiData = await aiResponse.json()
        adviceText = aiData.choices?.[0]?.message?.content?.trim() || FALLBACK_ADVICE
        usedFallback = adviceText === FALLBACK_ADVICE
      } else {
        console.error('GROQ API ERROR:', await aiResponse.text())
      }
    } catch (error) {
      console.error('GROQ API TIMEOUT/ERROR:', error.message)
    }

    const { error: updateError } = await supabaseAdmin
      .from('emergencies')
      .update({ ai_advice_to_user: adviceText })
      .eq('id', emergencyId)

    if (updateError) {
      console.error('UPDATE ERROR:', updateError)
    }

    return NextResponse.json({ success: true, advice: adviceText, fallback: usedFallback })
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
