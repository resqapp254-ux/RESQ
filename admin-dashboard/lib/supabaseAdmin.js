// lib/supabaseAdmin.js
// SERVER-SIDE ONLY. Never import this in a client component.
// Uses the service_role key, which bypasses RLS — needed to create
// accounts on behalf of super_admin / institution_admin (invite flow).

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
