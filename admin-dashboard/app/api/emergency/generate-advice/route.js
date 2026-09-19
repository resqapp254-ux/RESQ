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
import { rateLimit } from '../../../../lib/rateLimit'

const TYPE_GUIDANCE = {
  medical: 'This is a medical emergency. Favor guidance like: do not move an injured person unless they are in immediate danger, check breathing and responsiveness, apply pressure to any bleeding, keep the person warm and still.',
  fire: 'This is a fire emergency. Favor guidance like: get low under smoke, get out and stay out, do not use elevators, do not go back inside for belongings, move to a safe distance and stay there.',
  accident: 'This is an accident (e.g. road accident). Favor guidance like: do not move anyone with a suspected neck/back injury, turn on hazard lights, warn oncoming traffic, keep the area clear.',
  security: 'This is a security threat. Favor guidance like: move to a safe, lockable location if possible, stay quiet, do not confront anyone, keep phone on silent.',
  gbv: 'This is a gender-based violence situation. Favor a gentle, non-judgmental tone: prioritize getting to a safe location, avoid confrontation, mention that responders and support are on the way.',
  mental_health: 'This is a mental health crisis. Favor a calm, non-judgmental, reassuring tone: encourage staying somewhere safe, remind them they are not alone and help is coming, avoid clinical or diagnostic language.',
  property_damage: 'This is property damage (no immediate danger to life implied). Favor guidance like: stay at a safe distance from unstable structures, do not touch damaged electrical or gas lines.',
  other: ''
}

const SYSTEM_PROMPT_BASE = `You are an emergency first-response assistant embedded in RESQ, an emergency dispatch app.
A user has just triggered an emergency alert. Human responders are already being notified and are on their way.

Give brief, calm, practical safety guidance for the next few minutes while they wait for help.
Rules:
- Under 70 words.
- Calm, plain, reassuring tone. No medical diagnosis. No legal advice.
- Tailor the guidance to the stated emergency type below, but stay generic and safe if it doesn't fit the exact situation.
- Always mention that help is on the way.
- Do not ask questions. This is a one-way message the person will read in a stressful moment.
- CRITICAL: Never tell the user to call 911, 999, 112, or any other generic emergency hotline number.
  RESQ has already routed this exact report to a specific responding institution (named below, if
  known) and their responders are already on the way — do not suggest calling anyone else instead.
  If a routed institution name is given below, you may reference it by name (e.g. "responders from
  <name> are on their way"). If a contact phone number is given below, you may mention that they can
  call it directly if they need to speak to someone before responders arrive.`
const FALLBACK_ADVICE = 'Stay calm. Help is on the way. Move somewhere safe and visible if you can, keep your phone nearby, and follow instructions from responders.'

export async function POST(request) {
  try {
    const { profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    // This calls a paid/quota-limited external AI API — cap retries
    // per account so a scripted loop can't burn through the quota.
    if (!(await rateLimit('advice:' + profile.id, 10, 5 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const { data: emergency, error: fetchError } = await supabaseAdmin
      .from('emergencies')
      .select('id, lat, lng, triggered_via, institution_id, triggered_by, emergency_type')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }
    if (!canAccessEmergency(profile, emergency, ['user', 'responder', 'institution_admin', 'super_admin']) || (profile.role === 'user' && emergency.triggered_by !== profile.id)) {
      return NextResponse.json({ success: false, error: 'Not authorized for this emergency' }, { status: 403 })
    }

    const { data: routedInstitution } = await supabaseAdmin
      .from('institutions')
      .select('name, contact_phone')
      .eq('id', emergency.institution_id)
      .maybeSingle()

    const typeNote = TYPE_GUIDANCE[emergency.emergency_type] || ''
    const systemPrompt = typeNote ? `${SYSTEM_PROMPT_BASE}\n\n${typeNote}` : SYSTEM_PROMPT_BASE
    const routingNote = routedInstitution?.name
      ? ` This was routed to "${routedInstitution.name}".${routedInstitution.contact_phone ? ` Their direct contact number is ${routedInstitution.contact_phone}.` : ''}`
      : ''
    const userMessage = `A user just triggered a "${emergency.emergency_type || 'other'}" emergency alert via the ${emergency.triggered_via} channel.${routingNote} Give them immediate safety guidance.`

    let adviceText = FALLBACK_ADVICE
    let usedFallback = true

    try {
      const aiResponse = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: "Bearer " + process.env.GROQ_API_KEY,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          max_tokens: 200,
          messages: [
            { role: 'system', content: systemPrompt },
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

