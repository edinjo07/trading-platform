/**
 * _setup.ts — must be the FIRST import in api/[...path].ts
 * Applies non-sensitive defaults and validates that required secrets are
 * present in the environment (set via Vercel Environment Variables in the
 * dashboard — never committed to source control).
 */

// Non-sensitive defaults only — no secrets here
const NON_SECRET_DEFAULTS: Record<string, string> = {
  NODE_ENV: 'production',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'https://trading-platform-client.vercel.app',
}

for (const [k, v] of Object.entries(NON_SECRET_DEFAULTS)) {
  if (!process.env[k]) process.env[k] = v
}

// Secrets must be supplied via environment variables — never hardcoded
const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
]

const missing = REQUIRED_SECRETS.filter((k) => !process.env[k])
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
    'Set these in the Vercel dashboard under Project → Settings → Environment Variables.',
  )
}
