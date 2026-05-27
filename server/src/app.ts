import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config, corsOrigins } from './config'
import authRoutes      from './routes/auth'
import marketsRoutes   from './routes/markets'
import ordersRoutes    from './routes/orders'
import portfolioRoutes from './routes/portfolio'
import positionsRoutes from './routes/positions'
import analyticsRoutes from './routes/analytics'
import newsRoutes      from './routes/news'
import accountsRoutes  from './routes/accounts'

const app = express()

app.use(helmet())
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Disable HTTP caching so polls always get fresh data
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

app.use('/api/auth',      authRoutes)
app.use('/api/markets',   marketsRoutes)
app.use('/api/orders',    ordersRoutes)
app.use('/api/portfolio', portfolioRoutes)
app.use('/api/positions', positionsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/news',      newsRoutes)
app.use('/api/accounts',  accountsRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: config.nodeEnv })
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

export default app
