// lib/logActivity.js
// Fire-and-forget event logging for the super-admin Terminal view.
// Never awaited by callers, never throws — a logging failure must
// never break the actual request it's describing.

import { supabaseAdmin } from './supabaseAdmin'

export function logActivity({ eventType, detail, userId, institutionId, ip }) {
  supabaseAdmin
    .from('activity_log')
    .insert({
      event_type: eventType,
      detail: detail || null,
      user_id: userId || null,
      institution_id: institutionId || null,
      ip: ip || null
    })
    .then(() => {})
    .catch((err) => console.error('activity_log insert failed:', err?.message))
}
