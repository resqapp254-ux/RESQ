// app/api/emergency/rate/route.js
//
// Lets the responder who resolved a case leave a star rating (and an
// optional comment) on it afterwards. Only the claimant, and only
// once the case is actually resolved, so this can't be used to rate
// a case still in progress or one someone else handled.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'

export async function POST(request) {
  try {
    const { profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    const { emergencyId, rating, comment } = await request.json()
    const ratingValue = Number(rating)

    if (!emergencyId || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json({ success: false, error: 'A rating from 1 to 5 is required' }, { status: 400 })
    }

    const { data: emergency, error: fetchError } = await supabaseAdmin
      .from('emergencies')
      .select('id, claimed_by, status')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !emergency) {
      return NextResponse.json({ success: false, error: 'Emergency not found' }, { status: 404 })
    }

    if (emergency.claimed_by !== profile.id) {
      return NextResponse.json({ success: false, error: 'Only the responder who handled this case can rate it' }, { status: 403 })
    }

    if (emergency.status !== 'resolved') {
      return NextResponse.json({ success: false, error: 'The case must be resolved before it can be rated' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('emergencies')
      .update({ rating: ratingValue, rating_comment: (comment || '').slice(0, 500) || null })
      .eq('id', emergencyId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('RATE EMERGENCY ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
