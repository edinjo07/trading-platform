import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config, corsOrigins } from './config'
import authRoutes from './routes/auth'
import marketsRoutes from './routes/markets'
import ordersRoutes from './routes/orders'
import portfolioRoutes from './routes/portfolio'
import analyticsRoutes from './routes/analytics'
import positionsRoutes from './routes/positions'
import adminRoutes from './routes/admin'
import leaderboardRoutes from './routes/leaderboard'
import botsRoutes from './routes/bots'
import newsRoutes from './routes/news'

const app = express()

// Middleware
app.use(helmet())
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Disable HTTP caching for all API responses so polls always get fresh data.
// Without this, browsers return 304 Not Modified and serve stale order/portfolio
// state from their cache, causing orders to appear to disappear after placement.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/markets', marketsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/portfolio', portfolioRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/positions', positionsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/bots', botsRoutes)
app.use('/api/news', newsRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.nodeEnv })
})

// 404 handler - includes received path for server-side diagnostics
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found', receivedPath: _req.url })
})

export default app
