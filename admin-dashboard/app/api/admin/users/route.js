// app/api/admin/users/route.js
//
// SERVER-SIDE ROUTE. Powers the super-admin Terminal's user/session
// list — every account's signup date, last sign-in, email
// confirmation, and ban status, straight from Supabase Auth (the
// client SDK has no access to auth.users directly, only the admin API
// does, which needs the service-role key).
//
// Note: this shows the LATEST sign-in per account, which is what
// Supabase Auth exposes. A full history of every sign-in (and any
// failed attempts) lives in Supabase's own Logs Explorer in the
// Dashboard, not in a table this API can read.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

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

export async function GET(request) {
  try {
    const isSuperAdmin = await verifySuperAdmin(request)
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized. Super admin login required.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const perPage = 200

    const { data: authData, error: authListError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (authListError) {
      return NextResponse.json({ success: false, error: authListError.message }, { status: 500 })
    }

    const ids = authData.users.map((u) => u.id)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, institution_id, is_active, institutions(name)')
      .in('id', ids)

    const profileById = {}
    for (const p of profiles || []) profileById[p.id] = p

    const users = authData.users.map((u) => {
      const profile = profileById[u.id]
      return {
        id: u.id,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        banned_until: u.banned_until,
        role: profile?.role || null,
        full_name: profile?.full_name || null,
        institution_name: profile?.institutions?.name || null,
        is_active: profile?.is_active ?? true
      }
    })

    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    return NextResponse.json({
      success: true,
      users,
      page,
      perPage,
      total: authData.total ?? null
    })
  } catch (err) {
    console.error('ADMIN USERS LIST ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
