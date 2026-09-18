// app/api/emergency/mark-resolved/route.js
//
// Called by the responder app when marking an emergency resolved.
// Does the actual DB update AND sends the resolution email to the
// institution admin — both need to happen server-side since the
// email requires our Resend API key.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { sendResolutionEmailToAdmin } from '../../../../lib/notifyInstitutionAdmin'
import { canAccessEmergency, getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'

export async function POST(request) {
  try {
    const { profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!rateLimit('resolve:' + profile.id, 30, 5 * 60 * 1000).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

    const { data: existingEmergency } = await supabaseAdmin.from('emergencies').select('institution_id, claimed_by').eq('id', emergencyId).single()
    if (!canAccessEmergency(profile, existingEmergency, ['responder', 'institution_admin', 'unit_admin', 'super_admin']) || (profile.role === 'responder' && existingEmergency.claimed_by !== profile.id)) {
      return NextResponse.json({ success: false, error: 'Not authorized for this emergency' }, { status: 403 })
    }
    // institution_admin and unit_admin can resolve ANY of their
    // institution's emergencies, claimed or not — an escape hatch for
    // when the responder who claimed it (or should have) is
    // unresponsive and a case would otherwise be stuck forever.

    const { data: emergency, error: updateError } = await supabaseAdmin
      .from('emergencies')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', emergencyId)
      .select('id, institution_id, institutions(name)')
      .single()

    if (updateError || !emergency) {
      return NextResponse.json({ success: false, error: updateError?.message || 'Emergency not found' }, { status: 500 })
    }

    const institutionName = emergency.institutions?.name || 'the institution'

    sendResolutionEmailToAdmin(emergencyId, emergency.institution_id, institutionName).catch((err) =>
      console.error('Resolution email failed:', err.message)
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('MARK RESOLVED ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
