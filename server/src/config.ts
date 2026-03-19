import dotenv from 'dotenv'
dotenv.config()

// CORS_ORIGIN may be a comma-separated list of allowed origins
const rawOrigins = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173,https://trading-platform-client.vercel.app'
export const corsOrigins = rawOrigins.split(',').map(o => o.trim()).filter(Boolean)

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: corsOrigins,
  isProd: process.env.NODE_ENV === 'production',
  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || '',
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
}
