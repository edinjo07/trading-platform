import { createClient } from '@supabase/supabase-js'
import { config } from './config'

if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
  console.warn('[DB] Supabase env vars missing - running without database persistence')
}

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
)
