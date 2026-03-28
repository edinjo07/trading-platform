/**
 * _setup.ts - must be the FIRST import in api/[...path].ts
 * Applies non-sensitive defaults and bridges Vercel's auto-injected Supabase
 * variable names to the names our app expects.
 * Secrets are never hardcoded - they come from Vercel Environment Variables.
 */

// ── Non-sensitive defaults ────────────────────────────────────────────────
const NON_SECRET_DEFAULTS: Record<string, string> = {
  NODE_ENV: 'production',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'https://trading-platform-client.vercel.app',
  // Public project URL - not a secret
  SUPABASE_URL: 'https://tkplwifmstnkecevgbyi.supabase.co',
}
for (const [k, v] of Object.entries(NON_SECRET_DEFAULTS)) {
  if (!process.env[k]) process.env[k] = v
}

// ── Bridge Vercel-injected names → app-expected names ────────────────────
// Vercel's Supabase integration injects variables with NEXT_PUBLIC_ prefixes
// and uses SUPABASE_JWT_SECRET / POSTGRES_URL naming. Map them here so our
// Express config.ts works without modification.
const ALIASES: Record<string, string> = {
  // Our name                 : Vercel-injected name (first match wins)
  SUPABASE_ANON_KEY:          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  SUPABASE_URL:               'NEXT_PUBLIC_SUPABASE_URL',
  JWT_SECRET:                 'SUPABASE_JWT_SECRET',
  DATABASE_URL:               'POSTGRES_URL',
}
for (const [appKey, vercelKey] of Object.entries(ALIASES)) {
  if (!process.env[appKey] && process.env[vercelKey]) {
    process.env[appKey] = process.env[vercelKey]
  }
}

// ── Validate required secrets are present ────────────────────────────────
const REQUIRED = ['JWT_SECRET', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL']
const missing = REQUIRED.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error(
    `[config] WARNING: Missing environment variables: ${missing.join(', ')}. ` +
    'Set these in the Vercel dashboard under Project → Settings → Environment Variables.',
  )
}
