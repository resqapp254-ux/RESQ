// app/api/institution/create-responder/route.js
//
// SERVER-SIDE ROUTE. Called by an institution_admin.
// Creates a responder account tied to the CALLER's own institution —
// the caller cannot specify a different institution_id; it's always
// pulled from their own verified profile.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

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
    const { fullName, email, phone, tempPassword } = body

    if (!fullName || !email || !tempPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
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
      return NextResponse.json({ success: false, error: authError.message || 'Failed to create responder account' }, { status: 500 })
    }

    return NextResponse.json({ success: true, responderId: authUser.user.id })
  } catch (err) {
    console.error('UNEXPECTED ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
