import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { getAuthenticatedUser } from '../../../../lib/authorizeRequest'
import { rateLimit } from '../../../../lib/rateLimit'
import { pickPublicInstitution } from '../../../../lib/publicInstitutionRouting'
import { hasAvailableResponder } from '../../../../lib/checkResponderAvailability'
import { logActivity } from '../../../../lib/logActivity'

const VALID_EMERGENCY_TYPES = ['medical', 'fire', 'accident', 'security', 'gbv', 'mental_health', 'property_damage', 'other']

export async function POST(request) {
  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(request)
    if (authError) return NextResponse.json({ success: false, error: authError }, { status: 401 })

    if (!['user', 'responder'].includes(profile.role)) {
      return NextResponse.json({ success: false, error: 'Only users and responders can trigger emergencies from here' }, { status: 403 })
    }

    // A real repeat emergency from the same account within a few
    // minutes is rare; this only stops accidental double-taps and
    // scripted abuse of a valid session, not genuine use.
    const { allowed } = rateLimit('trigger:' + user.id, 5, 10 * 60 * 1000)
    if (!allowed) {
      logActivity({ eventType: 'rate_limited', detail: 'emergency/trigger', userId: user.id })
      return NextResponse.json({ success: false, error: 'Too many emergencies triggered from this account recently. If this is urgent, call local emergency services directly.' }, { status: 429 })
    }

    const body = await request.json()
    const emergencyType = VALID_EMERGENCY_TYPES.includes(body.emergencyType) ? body.emergencyType : 'other'
    const lat = typeof body.lat === 'number' ? body.lat : null
    const lng = typeof body.lng === 'number' ? body.lng : null

    const isPublicUser = profile.role === 'user' && profile.account_mode === 'public'

    if (profile.role === 'user' && !isPublicUser && !profile.institution_id) {
      return NextResponse.json({ success: false, error: 'Enter your institution code first' }, { status: 400 })
    }

    // Public accounts aren't tied to one institution's code — route to
    // the nearest active public institution that handles this type,
    // same nearest-match idea used for institution_services. Only
    // institutions/companies that actually have a responder able to
    // take this specific emergency (type + location) are considered —
    // an emergency should never be filed to a public institution that
    // exists but has nobody who would ever see it.
    let institutionId = profile.institution_id
    if (isPublicUser) {
      const { data: publicInstitutions } = await supabaseAdmin
        .from('institutions')
        .select('id, status, visibility, lat, lng, enabled_emergency_types')
        .eq('visibility', 'public')
        .eq('status', 'active')

      const availabilityChecks = await Promise.all(
        (publicInstitutions || []).map(async (inst) => ({
          inst,
          available: await hasAvailableResponder(supabaseAdmin, inst.id, { emergencyType, lat, lng })
        }))
      )
      const availablePublicInstitutions = availabilityChecks.filter((c) => c.available).map((c) => c.inst)

      const match = pickPublicInstitution(availablePublicInstitutions, { emergencyType, lat, lng })
      if (!match) {
        logActivity({ eventType: 'trigger_blocked_no_responder', detail: `Public · type=${emergencyType}`, userId: user.id })
        return NextResponse.json({ success: false, error: 'No public responder, company, or service is currently available to receive this emergency. If this is urgent, call local emergency services directly.' }, { status: 503 })
      }
      institutionId = match.id
    } else if (institutionId) {
      // Private (code-connected) account — same guarantee: don't file
      // a report into an institution with nobody who would receive it.
      const available = await hasAvailableResponder(supabaseAdmin, institutionId, { emergencyType, lat, lng })
      if (!available) {
        logActivity({ eventType: 'trigger_blocked_no_responder', detail: `Private · type=${emergencyType}`, userId: user.id, institutionId })
        return NextResponse.json({ success: false, error: 'Your institution has no responder currently available to receive this emergency. Please contact them directly, or call local emergency services if this is urgent.' }, { status: 503 })
      }
    }

    // One open emergency per account at a time — a second SOS while
    // the first is still triggered/claimed/in_progress would just
    // fragment the same situation across two records instead of
    // helping. Resolve or cancel the current one first.
    const { data: existingOpen } = await supabaseAdmin
      .from('emergencies')
      .select('id')
      .eq('triggered_by', user.id)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .limit(1)
      .maybeSingle()

    if (existingOpen) {
      return NextResponse.json(
        { success: false, error: 'You already have an active emergency. It must be resolved before you can send a new one.', existingEmergencyId: existingOpen.id },
        { status: 409 }
      )
    }

    const { data: emergency, error: insertError } = await supabaseAdmin
      .from('emergencies')
      .insert({
        institution_id: institutionId,
        triggered_by: user.id,
        lat,
        lng,
        triggered_via: 'app',
        emergency_type: emergencyType
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    logActivity({ eventType: 'emergency_triggered', detail: `type=${emergencyType} · via=app`, userId: user.id, institutionId })

    // Tell the user who they were routed to — especially important for
    // public accounts, which have no fixed institution and might
    // otherwise have no idea who is coming.
    const { data: routedInstitution } = await supabaseAdmin
      .from('institutions')
      .select('name, logo_url')
      .eq('id', institutionId)
      .maybeSingle()

    return NextResponse.json({ success: true, emergency, routedInstitution })
  } catch (err) {
    console.error('TRIGGER EMERGENCY ERROR:', err)
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 })
  }
}
