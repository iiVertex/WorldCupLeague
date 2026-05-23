import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Build-time diagnostic: prints whether each var was inlined into the bundle.
console.info('[supabase] env check — url:', url ? 'set' : 'MISSING', '| anonKey:', anonKey ? 'set' : 'MISSING')

if (!url || !anonKey || anonKey.startsWith('REPLACE_')) {
  // Surfaced clearly in the console so a missing .env.local is obvious.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env.local and fill in the anon public key.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'wcl-auth',
  },
})

// Usernames are mapped to a synthetic email so players only ever type a username.
export const EMAIL_DOMAIN = 'wcl.local'
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`
