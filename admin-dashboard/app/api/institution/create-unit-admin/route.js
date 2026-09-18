// app/api/institution/create-unit-admin/route.js
//
// Creates a login for a partner unit (institution_services row) — a
// unit_admin account, scoped to that one unit, that can sign in to
// its own cut-down dashboard (/unit-admin) and set up its own
// location/coordinates, contact details, and responders from there,
// instead of the institution admin doing all of it centrally.
//
// SERVER-SIDE ROUTE. Called by an institution_admin. Either creates a
// brand-new unit and its login together (no serviceId passed, service
// fields required), or attaches a login to an existing unit that
// doesn't have one yet (serviceId passed).

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { rateLimit } from '../../../../lib/rateLimit'
import { friendlyAuthError, isEmailAlreadyExistsError } from '../../../../lib/authErrors'
import { logActivity } from '../../../../lib/logActivity'

async function getCallerProfile(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return null

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) return null

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, institution_id')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) return null
  return profile
}

export async function POST(request) {
  try {
    const caller = await getCallerProfile(request)
    if (!caller || caller.role !== 'institution_admin' || !caller.institution_id) {
      return NextResponse.json({ success: false, error: 'Not authorized. Institution admin login required.' }, { status: 403 })
    }

    if (!(await rateLimit('create-unit-admin:' + caller.id, 30, 60 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many accounts created recently. Please wait before adding more.' }, { status: 429 })
    }

    const body = await request.json()
    const { email, tempPassword } = body
    let serviceId = body.serviceId

    if (!email || !tempPassword) {
      return NextResponse.json({ success: false, error: 'Missing email or temporary password' }, { status: 400 })
    }

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

      const { data: existingAdmin } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('service_id', serviceId)
        .eq('role', 'unit_admin')
        .maybeSingle()
      if (existingAdmin) {
        return NextResponse.json({ success: false, error: 'This unit already has a dashboard login' }, { status: 400 })
      }
    } else {
      const { name, serviceType, lat, lng, contactPhone, contactEmail, handlesTypes } = body
      if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
        return NextResponse.json({ success: false, error: 'Name and a valid location are required to create a new unit' }, { status: 400 })
      }

      const { data: newService, error: serviceError } = await supabaseAdmin
        .from('institution_services')
        .insert({
          institution_id: caller.institution_id,
          service_type: serviceType || 'other',
          name,
          lat,
          lng,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
          handles_emergency_types: handlesTypes || [],
          created_by: caller.id
        })
        .select('id')
        .single()

      if (serviceError) {
        return NextResponse.json({ success: false, error: serviceError.message }, { status: 500 })
      }
      serviceId = newService.id
    }

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'unit_admin',
        institution_id: caller.institution_id,
        full_name: `Unit admin`
      }
    })

    if (authError) {
      console.error('UNIT ADMIN CREATE ERROR:', JSON.stringify(authError, null, 2))
      return NextResponse.json(
        { success: false, error: friendlyAuthError(authError, 'Could not create the unit login right now. Please try again in a moment.'), emailExists: isEmailAlreadyExistsError(authError) },
        { status: isEmailAlreadyExistsError(authError) ? 409 : 500 }
      )
    }

    const { error: assignError } = await supabaseAdmin
      .from('profiles')
      .update({ service_id: serviceId })
      .eq('id', authUser.user.id)

    if (assignError) {
      console.error('UNIT ADMIN SERVICE ASSIGN ERROR:', assignError.message)
    }

    logActivity({ eventType: 'unit_admin_created', detail: email, userId: authUser.user.id, institutionId: caller.institution_id })

    return NextResponse.json({ success: true, serviceId, unitAdminId: authUser.user.id })
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
