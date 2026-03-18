import http from 'http'
import https from 'https'
import fs from 'fs'
import { config } from './config'
import app from './app'
import { initWebSocket } from './websocket/wsServer'
import { loadFromDB } from './services/dbSync'
import { users, orders, portfolios, tradeJournal, equityCurve } from './services/tradingEngine'

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
// Two modes:
//   1. SSL certs provided (SSL_KEY_FILE + SSL_CERT_FILE) → HTTPS (self-hosted)
//   2. No certs → plain HTTP.  On Railway/Render/Fly, TLS is terminated at the
//      platform's edge proxy so the app always sees plain HTTP internally.
//      The external URL is still https:// / wss://.
// ---------------------------------------------------------------------------
const sslKeyPath  = process.env.SSL_KEY_FILE
const sslCertPath = process.env.SSL_CERT_FILE

function createServer() {
  if (sslKeyPath && sslCertPath) {
    console.log('[Server] SSL certs found — starting HTTPS server')
    return https.createServer(
      { key: fs.readFileSync(sslKeyPath), cert: fs.readFileSync(sslCertPath) },
      app,
    )
  }
  if (config.isProd) {
    console.log('[Server] No SSL certs — starting HTTP server (TLS terminated by platform proxy)')
  } else {
    console.warn('[Server] No SSL certs — starting plain HTTP server (local dev)')
  }
  return http.createServer(app)
}

const server = createServer()
initWebSocket(server)

loadFromDB({ users, orders, portfolios, tradeJournal, equityCurve })
  .catch(e => console.error('[DB] Bootstrap failed:', e))
  .finally(() => {
    server.listen(config.port, () => {
      const proto   = (sslKeyPath && sslCertPath) ? 'https' : 'http'
      const wsProto = (sslKeyPath && sslCertPath) ? 'wss'   : 'ws'
      console.log(`\n🚀  TradeX Server running on ${proto}://localhost:${config.port}`)
      console.log(`📡  WebSocket ready at ${wsProto}://localhost:${config.port}/ws`)
      console.log(`🌍  Environment: ${config.nodeEnv}\n`)
    })
  })

export default app
