import { supabaseAdmin } from './supabaseAdmin'
import { logActivity } from './logActivity'

export async function getAuthenticatedUser(request) {
  const authorization = request.headers.get('authorization') || ''
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!token) {
    logActivity({ eventType: 'auth_failed', detail: `No token · ${new URL(request.url).pathname}` })
    return { user: null, profile: null, error: 'Authentication required' }
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    logActivity({ eventType: 'auth_failed', detail: `Invalid token · ${new URL(request.url).pathname}` })
    return { user: null, profile: null, error: 'Invalid authentication token' }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role, institution_id, service_id, responder_permission, responder_emergency_types, account_mode')
    .eq('id', user.id)
    .single()
  if (profileError || !profile) {
    logActivity({ eventType: 'auth_failed', detail: `No profile for user · ${new URL(request.url).pathname}`, userId: user.id })
    return { user: null, profile: null, error: 'Account profile not found' }
  }
  return { user, profile, error: null }
}

export function canAccessEmergency(profile, emergency, allowedRoles) {
  if (!profile || !emergency) return false
  if (!allowedRoles.includes(profile.role)) return false
  if (profile.role === 'super_admin') return true
  return profile.institution_id === emergency.institution_id
}