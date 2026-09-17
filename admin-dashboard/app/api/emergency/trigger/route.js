import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'

const VALID_EMERGENCY_TYPES = ['medical', 'fire', 'accident', 'security', 'gbv', 'mental_health', 'property_damage', 'other']

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['user', 'responder'].includes(profile.role)) {
      return NextResponse.json({ success: false, error: 'Only users and responders can trigger emergencies from here' }, { status: 403 })
    }

    // A real repeat emergency from the same account within a few
    // minutes is rare; this only stops accidental double-taps and
    // scripted abuse of a valid session, not genuine use.
    const { allowed } = rateLimit('trigger:' + user.id, 5, 10 * 60 * 1000)
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many emergencies triggered from this account recently. If this is urgent, call local emergency services directly.' }, { status: 429 })
    }

    const body = await request.json()
    const emergencyType = VALID_EMERGENCY_TYPES.includes(body.emergencyType) ? body.emergencyType : 'other'
    const lat = typeof body.lat === 'number' ? body.lat : null
    const lng = typeof body.lng === 'number' ? body.lng : null

    if (profile.role === 'user' && !profile.institution_id) {
      return NextResponse.json({ success: false, error: 'Enter your institution code first' }, { status: 400 })
    }

    // One open emergency per account at a time — a second SOS while
    // the first is still triggered/claimed/in_progress would just
    // fragment the same situation across two records instead of
    // helping. Resolve or cancel the current one first.
    const { data: existingOpen } = await supabaseAdmin
      .from('emergencies')
      .select('id')
      .eq('triggered_by', user.id)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .limit(1)
      .maybeSingle()

    if (existingOpen) {
      return NextResponse.json(
        { success: false, error: 'You already have an active emergency. It must be resolved before you can send a new one.', existingEmergencyId: existingOpen.id },
        { status: 409 }
      )
    }

    const { data: emergency, error: insertError } = await supabaseAdmin
      .from('emergencies')
      .insert({
        institution_id: profile.institution_id,
        triggered_by: user.id,
        lat,
        lng,
        triggered_via: 'app',
        emergency_type: emergencyType
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, emergency })
  } catch (err) {
    console.error('TRIGGER EMERGENCY ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
