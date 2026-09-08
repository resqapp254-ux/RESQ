import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'

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

    if (!['responder', 'institution_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ success: false, error: 'Not authorized to claim emergencies' }, { status: 403 })
    }

    if (profile.role === 'responder' && profile.institution_id !== emergency.institution_id) {
      return NextResponse.json({ success: false, error: 'Not authorized for this institution' }, { status: 403 })
    }

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
