// app/api/institution/create-responder/route.js
//
// SERVER-SIDE ROUTE. Called by an institution_admin (any responder
// for their institution, optionally linked to any of its units) or a
// unit_admin (a responder for their own unit only — service_id and
// institution_id are always forced to the unit_admin's own values,
// never taken from the request body).

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { rateLimit } from '../../../../lib/rateLimit'
import { friendlyAuthError, isEmailAlreadyExistsError } from '../../../../lib/authErrors'

async function getCallerProfile(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) return null

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, institution_id, service_id')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) return null
  return profile
}

export async function POST(request) {
  try {
    const caller = await getCallerProfile(request)
    if (!caller || !['institution_admin', 'unit_admin'].includes(caller.role) || !caller.institution_id) {
      return NextResponse.json({ success: false, error: 'Not authorized. Institution admin login required.' }, { status: 403 })
    }
    if (caller.role === 'unit_admin' && !caller.service_id) {
      return NextResponse.json({ success: false, error: 'Your account is not linked to a unit' }, { status: 403 })
    }

    if (!rateLimit('create-responder:' + caller.id, 30, 60 * 60 * 1000).allowed) {
      return NextResponse.json({ success: false, error: 'Too many accounts created recently. Please wait before adding more.' }, { status: 429 })
    }

    // Confirm the institution is actually active before letting them add staff
    const { data: institution, error: instError } = await supabaseAdmin
      .from('institutions')
      .select('status')
      .eq('id', caller.institution_id)
      .single()

    if (instError || !institution || institution.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Institution is not active yet. Enter your verification code first.' }, { status: 400 })
    }

    const body = await request.json()
    const { fullName, email, phone, tempPassword, permission, emergencyTypes } = body
    // A unit_admin can only ever create responders for their own
    // unit — ignore whatever serviceId the request body claims.
    const serviceId = caller.role === 'unit_admin' ? caller.service_id : body.serviceId

    if (!fullName || !email || !tempPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // If a partner-unit link was picked (or forced, for a unit_admin),
    // make sure it actually belongs to the caller's own institution.
    if (serviceId) {
      const { data: service } = await supabaseAdmin
        .from('institution_services')
        .select('id')
        .eq('id', serviceId)
        .eq('institution_id', caller.institution_id)
        .maybeSingle()
      if (!service) {
        return NextResponse.json({ success: false, error: 'Selected unit was not found for your institution' }, { status: 400 })
      }
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'responder',
        institution_id: caller.institution_id,
        full_name: fullName,
        phone: phone || ''
      }
    })

    if (authError) {
      console.error('RESPONDER CREATE ERROR:', JSON.stringify(authError, null, 2))
      return NextResponse.json(
        { success: false, error: friendlyAuthError(authError, 'Could not create the responder account right now. Please try again in a moment.'), emailExists: isEmailAlreadyExistsError(authError) },
        { status: isEmailAlreadyExistsError(authError) ? 409 : 500 }
      )
    }

    if (serviceId || permission === 'view_only' || emergencyTypes?.length > 0) {
      const { error: assignError } = await supabaseAdmin
        .from('profiles')
        .update({
          service_id: serviceId || null,
          responder_permission: permission === 'view_only' ? 'view_only' : 'full',
          responder_emergency_types: emergencyTypes?.length > 0 ? emergencyTypes : null
        })
        .eq('id', authUser.user.id)
      if (assignError) {
        console.error('RESPONDER SETTINGS ASSIGN ERROR:', assignError.message)
      }
    }

    return NextResponse.json({ success: true, responderId: authUser.user.id })
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
