import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['user', 'responder'].includes(profile.role)) {
      return NextResponse.json({ success: false, error: 'Only users and responders can trigger emergencies from here' }, { status: 403 })
    }

    const body = await request.json()
    const emergencyType = body.emergencyType || 'other'
    const lat = body.lat ?? null
    const lng = body.lng ?? null

    if (profile.role === 'user' && !profile.institution_id) {
      return NextResponse.json({ success: false, error: 'Enter your institution code first' }, { status: 400 })
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
