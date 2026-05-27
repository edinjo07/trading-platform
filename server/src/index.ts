import http from 'http'
import https from 'https'
import fs from 'fs'
import { config } from './config'
import app from './app'
import { initWebSocket } from './websocket/wsServer'
import { startSLMonitor } from './services/slMonitor'
import { startLimitMonitor } from './services/limitOrderMonitor'

const sslKeyPath  = process.env.SSL_KEY_FILE
const sslCertPath = process.env.SSL_CERT_FILE

const server = (() => {
  if (sslKeyPath && sslCertPath) {
    console.log('[Server] SSL certs found — starting HTTPS server')
    return https.createServer(
      { key: fs.readFileSync(sslKeyPath), cert: fs.readFileSync(sslCertPath) },
      app
    )
  }
  if (config.isProd) {
    console.log('[Server] No SSL certs — HTTP server (TLS terminated by platform proxy)')
  } else {
    console.warn('[Server] No SSL certs — plain HTTP (local dev)')
  }
  return http.createServer(app)
})()

initWebSocket(server)
startSLMonitor()
startLimitMonitor()

server.listen(config.port, () => {
  const proto   = sslKeyPath && sslCertPath ? 'https' : 'http'
  const wsProto = sslKeyPath && sslCertPath ? 'wss'   : 'ws'
  console.log(`\n[Server] Listening on ${proto}://localhost:${config.port}  (${config.nodeEnv})`)
  console.log(`[WS]     WebSocket ready at ${wsProto}://localhost:${config.port}/ws\n`)
})

export default app
