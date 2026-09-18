// app/api/admin/create-institution/route.js
//
// SERVER-SIDE ROUTE. Called by the super_admin dashboard.
// Creates the institution row AND the first institution_admin
// account for it in one step, using the secret service_role key.
//
// Protected: verifies the caller's access token belongs to an
// actual super_admin before doing anything.

import { NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getClientIp, rateLimit } from '../../../../lib/rateLimit'
import { friendlyAuthError, isEmailAlreadyExistsError } from '../../../../lib/authErrors'
import { logActivity } from '../../../../lib/logActivity'

async function verifySuperAdmin(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')

  if (!token) return false

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData.user) return false

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || !profile) return false

  return profile.role === 'super_admin'
}

function generateCode(prefix, length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
  let code = ''
  for (let i = 0; i < length; i++) {
    // crypto.randomInt, not Math.random — this code gates institution
    // activation, so it shouldn't be generated with a predictable PRNG.
    code += chars[randomInt(chars.length)]
  }
  return `${prefix}-${code}`
}

export async function POST(request) {
  try {
    const isSuperAdmin = await verifySuperAdmin(request)
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized. Super admin login required.' }, { status: 403 })
    }

    if (!(await rateLimit('create-institution:' + getClientIp(request), 20, 60 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many institutions created recently. Please wait before adding more.' }, { status: 429 })
    }

    const body = await request.json()
    const {
      institutionName,
      contactEmail,
      contactPhone,
      adminFullName,
      adminEmail,
      adminTempPassword,
      visibility,
      publicType,
      lat,
      lng
    } = body

    if (!institutionName || !contactEmail || !adminEmail || !adminTempPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const isPublic = visibility === 'public'
    if (isPublic && !['single_service', 'company'].includes(publicType)) {
      return NextResponse.json({ success: false, error: 'Choose whether this public institution is a single service or a company' }, { status: 400 })
    }

    const institutionCode = generateCode('RESQ')
    const verificationCode = generateCode('VERIFY')

    // 1. Create the institution row
    const { data: institution, error: instError } = await supabaseAdmin
      .from('institutions')
      .insert({
        name: institutionName,
        institution_code: institutionCode,
        verification_code: verificationCode,
        contact_email: contactEmail,
        contact_phone: contactPhone || null,
        status: 'pending_verification',
        visibility: isPublic ? 'public' : 'private',
        public_type: isPublic ? publicType : null,
        lat: isPublic && typeof lat === 'number' ? lat : null,
        lng: isPublic && typeof lng === 'number' ? lng : null
      })
      .select()
      .single()

    if (instError) {
      console.error('INSTITUTION INSERT ERROR:', JSON.stringify(instError, null, 2))
      return NextResponse.json({ success: false, error: instError.message || JSON.stringify(instError) }, { status: 500 })
    }

    // 2. Create the institution_admin auth account, pre-linked to this institution
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminTempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'institution_admin',
        institution_id: institution.id,
        full_name: adminFullName || ''
      }
    })

    if (authError) {
      console.error('AUTH USER CREATE ERROR:', JSON.stringify(authError, null, 2))
      // Roll back the institution if admin creation fails
      await supabaseAdmin.from('institutions').delete().eq('id', institution.id)
      return NextResponse.json(
        { success: false, error: friendlyAuthError(authError, 'Could not create the institution admin account right now. Please try again in a moment.'), emailExists: isEmailAlreadyExistsError(authError) },
        { status: isEmailAlreadyExistsError(authError) ? 409 : 500 }
      )
    }

    logActivity({ eventType: 'institution_created', detail: institutionName, userId: authUser.user.id, institutionId: institution.id })

    return NextResponse.json({
      success: true,
      institution,
      adminUserId: authUser.user.id,
      // Return these so YOU (super admin) can send them to the institution
      institutionCode,
      verificationCode
    })
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err)
    console.error('ERROR NAME:', err.name)
    console.error('ERROR MESSAGE:', err.message)
    console.error('ERROR STACK:', err.stack)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error', errorName: err.name || 'Unknown' }, { status: 500 })
  }
}
