import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config'
import { initWebSocket } from './websocket/wsServer'
import { loadFromDB } from './services/dbSync'
import { users, orders, portfolios, tradeJournal, equityCurve } from './services/tradingEngine'
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
app.use(cors({ origin: config.corsOrigin, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Create HTTP server and attach WebSocket
const server = http.createServer(app)
initWebSocket(server)

// Load persisted data from Supabase, then start listening
loadFromDB({ users, orders, portfolios, tradeJournal, equityCurve })
  .catch(e => console.error('[DB] Bootstrap failed:', e))
  .finally(() => {
    server.listen(config.port, () => {
      console.log(`\n🚀  TradeX Server running on http://localhost:${config.port}`)
      console.log(`📡  WebSocket ready at ws://localhost:${config.port}/ws`)
      console.log(`🌍  Environment: ${config.nodeEnv}\n`)
    })
  })

export default app
