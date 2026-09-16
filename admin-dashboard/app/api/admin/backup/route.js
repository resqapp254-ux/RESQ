// app/api/admin/backup/route.js
//
// SERVER-SIDE ROUTE. Self-serve disaster-recovery export for the
// super_admin dashboard — a JSON snapshot of every core table, taken
// on demand, independent of Supabase's own plan-tier backups/PITR.
//
// Protected: verifies the caller's access token belongs to an
// actual super_admin before reading anything.

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

const TABLES = [
  'institutions',
  'profiles',
  'emergencies',
  'institution_services',
  'guardians',
  'responder_reports',
  'institution_chat_messages'
]

export async function GET(request) {
  try {
    const isSuperAdmin = await verifySuperAdmin(request)
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized. Super admin login required.' }, { status: 403 })
    }

    const snapshot = { generatedAt: new Date().toISOString(), tables: {} }

    for (const table of TABLES) {
      const { data, error } = await supabaseAdmin.from(table).select('*')
      // A table that doesn't exist on an older schema shouldn't fail the
      // whole export — record the failure inline and keep going.
      snapshot.tables[table] = error ? { error: error.message } : data
    }

    return NextResponse.json(snapshot, {
      headers: {
        'Content-Disposition': `attachment; filename="resq-backup-${Date.now()}.json"`
      }
    })
  } catch (err) {
    console.error('BACKUP EXPORT ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
