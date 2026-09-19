// app/api/admin/delete-institution/route.js
//
// Deleting an institution used to be a plain client-side
// `supabase.from('institutions').delete()`. profiles.institution_id
// cascade-deletes when the institution row goes, but that only
// removes the profiles ROW — it does NOT delete the corresponding
// auth.users account (profiles.id -> auth.users.id cascades the other
// direction: deleting the auth user removes the profile, not the
// reverse). Every institution_admin, unit_admin, responder, and user
// under that institution kept a live, functional login with no
// profile left to authorize anything — an orphaned account, not a
// deleted one.
//
// This does the full cleanup server-side, in dependency order:
// chat/messages -> emergencies -> services -> each member's actual
// auth.users account (which cascades their profile) -> the
// institution row itself.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'
import { logActivity } from '../../../../lib/logActivity'

export async function POST(request) {
  try {
    const { profile: caller, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (caller.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    if (!(await rateLimit('delete-institution:' + caller.id, 10, 60 * 60 * 1000)).allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { institutionId } = await request.json()
    if (!institutionId) {
      return NextResponse.json({ success: false, error: 'Missing institutionId' }, { status: 400 })
    }

    const { data: institution } = await supabaseAdmin
      .from('institutions')
      .select('id, name')
      .eq('id', institutionId)
      .maybeSingle()

    if (!institution) {
      return NextResponse.json({ success: false, error: 'Institution not found' }, { status: 404 })
    }

    const { data: emergencies } = await supabaseAdmin
      .from('emergencies')
      .select('id')
      .eq('institution_id', institutionId)
    const emergencyIds = (emergencies || []).map((e) => e.id)

    if (emergencyIds.length > 0) {
      await supabaseAdmin.from('emergency_messages').delete().in('emergency_id', emergencyIds)
    }
    await supabaseAdmin.from('institution_chat_messages').delete().eq('institution_id', institutionId)
    await supabaseAdmin.from('emergencies').delete().eq('institution_id', institutionId)
    await supabaseAdmin.from('institution_services').delete().eq('institution_id', institutionId)

    const { data: members } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('institution_id', institutionId)

    let accountsDeleted = 0
    let accountsFailed = 0
    for (const member of members || []) {
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(member.id)
      if (deleteUserError) {
        accountsFailed++
        console.error(`DELETE INSTITUTION: could not delete auth user ${member.id}:`, deleteUserError.message)
      } else {
        accountsDeleted++
      }
    }

    const { error: deleteInstError } = await supabaseAdmin
      .from('institutions')
      .delete()
      .eq('id', institutionId)

    if (deleteInstError) {
      return NextResponse.json({ success: false, error: deleteInstError.message }, { status: 500 })
    }

    logActivity({
      eventType: 'institution_deleted',
      detail: `name=${institution.name} · accounts_deleted=${accountsDeleted} · accounts_failed=${accountsFailed}`,
      userId: caller.id
    })

    return NextResponse.json({ success: true, accountsDeleted, accountsFailed })
  } catch (err) {
    console.error('DELETE INSTITUTION ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
