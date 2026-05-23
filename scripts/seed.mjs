// Seed script — creates the admin account, player accounts, profiles, and sample/test matches.
//
// Run ONCE after applying supabase/schema.sql:
//   node scripts/seed.mjs
//
// Requires in .env.local:
//   VITE_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...   (Settings → API → service_role; NEVER commit / ship to client)
//
// Re-running is safe: existing users are reused, profiles are upserted,
// and matches are only inserted if none exist yet.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- tiny .env.local loader (no extra dependency) ---------------------------
function loadEnv() {
  const env = { ...process.env }
  try {
    const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* .env.local optional if vars already in process.env */
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const EMAIL_DOMAIN = 'wcl.local'
const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// --- seed accounts from the original login list ------------------------------
const ADMIN = { username: 'ammar', password: 'ammar14', is_admin: true }

const PLAYERS = [
  { username: 'adam', password: 'adam322008' },
  { username: 'tareq', password: 'tareq01' },
  { username: 'fahad', password: 'fahad02' },
  { username: 'mazen', password: 'mizo03' },
  { username: 'yasin', password: 'killz04' },
  { username: 'hamad', password: 'hamad05' },
  { username: 'salem', password: 'salem06' },
  { username: 'abdo', password: 'abdo07' },
  { username: 'mohsin', password: 'mohsin08' },
  { username: 'ram', password: 'ram09' },
  { username: 'yousef', password: 'yousef10' },
  { username: 'albaraa', password: 'albaraa11' },
  { username: 'shukri', password: 'shukri12' },
  { username: 'muaaz', password: 'mozo13' },
  { username: 'yazan', password: 'zozo15' },
  { username: 'ziad', password: 'zilzal16' },
  { username: 'khalifa', password: 'khalifa17' },
]

const ACCOUNTS = [ADMIN, ...PLAYERS]

async function findUserByEmail(email) {
  // Paginate through users to find an existing match.
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email === email)
    if (hit) return hit
    if (data.users.length < 200) return null
    page += 1
  }
}

async function seedAccount(account) {
  const email = `${account.username}@${EMAIL_DOMAIN}`
  const displayName = cap(account.username)
  const userMetadata = {
    username: account.username,
    display_name: displayName,
    is_admin: !!account.is_admin,
    wc_double: 5,
    wc_late: 5,
    wc_assist: 5,
  }

  let userId

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: account.password,
    email_confirm: true,
    user_metadata: userMetadata,
  })

  if (error) {
    // Most likely already exists — look it up so we can still upsert the profile.
    const existing = await findUserByEmail(email)
    if (!existing) {
      console.error(`  ✗ ${account.username}: ${error.message}`)
      return
    }
    userId = existing.id
    console.log(`  • ${account.username}: account already existed`)
  } else {
    userId = created.user.id
    console.log(`  ✓ ${account.username}: account created`)
  }

  const { error: upErr } = await admin.from('players').upsert(
    {
      id: userId,
      username: account.username,
      display_name: displayName,
      is_admin: !!account.is_admin,
      wc_double: 5,
      wc_late: 5,
      wc_assist: 5,
    },
    { onConflict: 'id' },
  )
  if (upErr) console.error(`  ✗ ${account.username} profile: ${upErr.message}`)
}

async function seedAccounts() {
  console.log('→ Seeding accounts…')
  for (const account of ACCOUNTS) {
    const label = account.is_admin ? 'admin' : 'player'
    console.log(`  · ${label}: ${account.username}`)
    await seedAccount(account)
  }
}

async function seedMatches() {
  const { count, error } = await admin
    .from('matches')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  if ((count ?? 0) > 0) {
    console.log(`→ Matches already present (${count}); skipping match seed.`)
    return
  }

  const inTen = new Date(Date.now() + 15 * 60 * 1000).toISOString() // test match ~15 min out
  const matches = [
    // 🧪 Test match first so it's easy to find and exercise the full flow.
    { home_team: 'Test United', away_team: 'Sample City', home_flag: '🧪', away_flag: '⚽', kickoff: inTen, is_test: true },
    { home_team: 'Mexico', away_team: 'South Africa', home_flag: '🇲🇽', away_flag: '🇿🇦', kickoff: '2026-06-11T22:00:00Z' },
    { home_team: 'Korea Republic', away_team: 'Czechia', home_flag: '🇰🇷', away_flag: '🇨🇿', kickoff: '2026-06-12T05:00:00Z' },
    { home_team: 'Canada', away_team: 'Bosnia and Herzegovina', home_flag: '🇨🇦', away_flag: '🇧🇦', kickoff: '2026-06-12T22:00:00Z' },
    { home_team: 'USA', away_team: 'Paraguay', home_flag: '🇺🇸', away_flag: '🇵🇾', kickoff: '2026-06-13T04:00:00Z' },
    { home_team: 'Qatar', away_team: 'Switzerland', home_flag: '🇶🇦', away_flag: '🇨🇭', kickoff: '2026-06-13T22:00:00Z' },
  ]
  const { error: insErr } = await admin.from('matches').insert(matches)
  if (insErr) throw insErr
  console.log(`→ Inserted ${matches.length} matches (incl. 🧪 test match).`)
}

try {
  await seedAccounts()
  await seedMatches()
  console.log('\n✅ Seed complete.')
} catch (e) {
  console.error('\n❌ Seed failed:', e.message)
  process.exit(1)
}
