// app/api/emergency/mark-resolved/route.js
//
// Called by the responder app when marking an emergency resolved.
// Does the actual DB update AND sends the resolution email to the
// institution admin — both need to happen server-side since the
// email requires our Resend API key.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { sendResolutionEmailToAdmin } from '../../../../lib/notifyInstitutionAdmin'

export async function POST(request) {
  try {
    const { emergencyId } = await request.json()

    if (!emergencyId) {
      return NextResponse.json({ success: false, error: 'Missing emergencyId' }, { status: 400 })
    }

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
