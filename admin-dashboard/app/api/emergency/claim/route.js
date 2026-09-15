import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { canAccessEmergency, getAuthenticatedUser } from '../../../../lib/authorizeRequest'

export async function POST(request) {
  try {
    const { profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    const { emergencyId } = await request.json()
    if (!emergencyId) return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })

    const { data: emergency, error: fetchError } = await supabaseAdmin
      .from('emergencies')
      .select('id, institution_id, claimed_by')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }

    // Same institution-scoping rule used everywhere else (claim,
    // resolve, chat): only super_admin can act across institutions.
    if (!canAccessEmergency(profile, emergency, ['responder', 'institution_admin', 'super_admin'])) {
      return NextResponse.json({ success: false, error: 'Not authorized for this institution' }, { status: 403 })
    }

    if (profile.role === 'responder' && profile.responder_permission === 'view_only') {
      return NextResponse.json({ success: false, error: 'Your account is set to view-only and cannot claim emergencies. Ask your institution admin to change this.' }, { status: 403 })
    }

    // Admins can reassign a stuck claim; a plain responder can't
    // steal another responder's case.
    if (profile.role === 'responder' && emergency.claimed_by && emergency.claimed_by !== profile.id) {
      return NextResponse.json({ success: false, error: 'Already claimed by another responder' }, { status: 409 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('emergencies')
      .update({ claimed_by: profile.id, claimed_at: new Date().toISOString(), status: 'in_progress' })
      .eq('id', emergencyId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('CLAIM EMERGENCY ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
