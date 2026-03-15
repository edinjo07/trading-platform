/**
 * _setup.ts — must be the FIRST import in api/[...path].ts
 * Sets production env vars before any other module reads process.env.
 * CommonJS require() runs in declaration order, so this runs before app.ts / config.ts.
 */
const DEFAULTS: Record<string, string> = {
  NODE_ENV: 'production',
  JWT_SECRET: 'ZeSEhpkwHrFett5bD2dzp/0bLaPR8YwDCvjjK/Oe4jPQeV0xS19sk+lpExySC/oQHUEN22d7kwmqYfJJBonYmw==',
  JWT_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'https://trading-platform-client.vercel.app',
  SUPABASE_URL: 'https://tkplwifmstnkecevgbyi.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcGx3aWZtc3Rua2VjZXZnYnlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzgwMjAsImV4cCI6MjA4OTExNDAyMH0.6Nr-8Wm2BinIbj_Due97c5jGMGuh2zQH-An-27WP9Lo',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrcGx3aWZtc3Rua2VjZXZnYnlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzUzODAyMCwiZXhwIjoyMDg5MTE0MDIwfQ.U_9Z7xCrjUxjF47lr9Xhje1CLd_-xIahpyD62yjsdag',
  DATABASE_URL: 'postgres://postgres.tkplwifmstnkecevgbyi:Ku0VMyfTcgPtc4tk@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require',
  TWELVE_DATA_API_KEY: '7d377303fc50432eba0d5931422e9ad2',
}
for (const [k, v] of Object.entries(DEFAULTS)) {
  if (!process.env[k]) process.env[k] = v
}
