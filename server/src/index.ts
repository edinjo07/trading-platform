import http from 'http'
import { config } from './config'
import app from './app'
import { initWebSocket } from './websocket/wsServer'
import { loadFromDB } from './services/dbSync'
import { users, orders, portfolios, tradeJournal, equityCurve } from './services/tradingEngine'

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
