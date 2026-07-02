// lib/supabaseClient.js
// Browser-side client — uses the public anon/publishable key.
// Safe to use in any client component. RLS policies protect the data.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
