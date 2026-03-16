import https from 'https'
import fs from 'fs'
import { config } from './config'
import app from './app'
import { initWebSocket } from './websocket/wsServer'
import { loadFromDB } from './services/dbSync'
import { users, orders, portfolios, tradeJournal, equityCurve } from './services/tradingEngine'

// Use HTTPS when SSL cert/key are provided via environment variables.
// In production, TLS is terminated by the hosting platform (Vercel/Railway)
// and this file is not used — HTTPS here is for self-hosted / staging deployments.
const sslKeyPath  = process.env.SSL_KEY_FILE
const sslCertPath = process.env.SSL_CERT_FILE

let server: https.Server
if (sslKeyPath && sslCertPath) {
  const sslOptions = {
    key:  fs.readFileSync(sslKeyPath),
    cert: fs.readFileSync(sslCertPath),
  }
  server = https.createServer(sslOptions, app)
} else {
  throw new Error(
    'SSL_KEY_FILE and SSL_CERT_FILE must be set. ' +
    'For local development, generate a self-signed certificate. ' +
    'On Vercel/Railway, TLS is platform-terminated and this entry point is not used.',
  )
}
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
