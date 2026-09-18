// app/api/institution/update-responder-permission/route.js
//
// Lets an institution admin (any responder in their institution) or a
// unit_admin (a responder linked to their own unit only) flip a
// responder between primary (full) and secondary (view_only). Moved
// server-side (was a direct client update relying on RLS alone) as
// part of locking down profiles.responder_permission from being
// column-grantable to every authenticated user (see day31
// migration) — this is one of the few places in the app that
// legitimately needs to write that column on someone else's row.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'

export async function POST(request) {
  try {
    const { profile: caller, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['institution_admin', 'unit_admin'].includes(caller.role) || !caller.institution_id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    if (!(await rateLimit('update-permission:' + caller.id, 60, 60 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { responderId, permission } = await request.json()
    if (!responderId || !['full', 'view_only'].includes(permission)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid responderId/permission' }, { status: 400 })
    }

    const { data: target, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, institution_id, service_id')
      .eq('id', responderId)
      .single()

    if (fetchError || !target || target.role !== 'responder') {
      return NextResponse.json({ success: false, error: 'Responder not found' }, { status: 404 })
    }

    const authorized =
      (caller.role === 'institution_admin' && target.institution_id === caller.institution_id) ||
      (caller.role === 'unit_admin' && caller.service_id && target.service_id === caller.service_id)

    if (!authorized) {
      return NextResponse.json({ success: false, error: 'That responder is not in your institution/unit' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ responder_permission: permission })
      .eq('id', responderId)

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('UPDATE RESPONDER PERMISSION ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
