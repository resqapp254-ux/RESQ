// app/api/admin/create-institution/route.js
//
// SERVER-SIDE ROUTE. Called by the super_admin dashboard.
// Creates the institution row AND the first institution_admin
// account for it in one step, using the secret service_role key.
//
// TODO (Day 3): wrap this route in a check that confirms the
// caller is actually logged in as super_admin before allowing it.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

function generateCode(prefix, length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${code}`
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      institutionName,
      contactEmail,
      contactPhone,
      adminFullName,
      adminEmail,
      adminTempPassword
    } = body

    if (!institutionName || !contactEmail || !adminEmail || !adminTempPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
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
        status: 'pending_verification'
      })
      .select()
      .single()

    if (instError) {
      return NextResponse.json({ success: false, error: instError.message }, { status: 500 })
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
      // Roll back the institution if admin creation fails
      await supabaseAdmin.from('institutions').delete().eq('id', institution.id)
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      institution,
      adminUserId: authUser.user.id,
      // Return these so YOU (super admin) can send them to the institution
      institutionCode,
      verificationCode
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
