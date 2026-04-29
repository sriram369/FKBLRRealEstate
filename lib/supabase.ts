// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Lazy singleton — avoids module-level throws when env vars are absent at build time
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

/** @deprecated use getSupabaseClient() for browser/client code */
export const supabase = {
  get from() { return getSupabaseClient().from.bind(getSupabaseClient()) },
}

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
