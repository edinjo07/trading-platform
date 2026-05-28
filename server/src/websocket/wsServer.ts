/**
 * wsServer.ts
 *
 * Broadcasts live price ticks to all connected clients every second.
 * Uses the same mockDataService price state that the order engine reads,
 * so prices displayed in the UI are always consistent with fill prices.
 */

import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { tickSymbol, getAllTickers, SYMBOLS } from '../services/mockDataService'

let wss: WebSocketServer | null = null

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket) => {
    // Immediately send current prices on connect so the UI doesn't wait 1 s
    try {
      ws.send(JSON.stringify({ type: 'tickers', payload: getAllTickers() }))
    } catch { /* ignore */ }

    ws.on('error', () => { /* prevent uncaught error crashes */ })
  })

  // Tick all symbols and broadcast every second
  setInterval(() => {
    if (!wss || wss.clients.size === 0) return

    for (const sym of SYMBOLS) {
      try { tickSymbol(sym.symbol) } catch { /* unknown symbol — skip */ }
    }

    const message = JSON.stringify({ type: 'tickers', payload: getAllTickers() })
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }, 1_000)

  console.log('[WS] WebSocket server initialized')
}

/** Push an arbitrary event to all connected clients (e.g. SL/TP triggered). */
export function broadcast(event: string, data: unknown): void {
  if (!wss) return
  const message = JSON.stringify({ type: event, payload: data })
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try { client.send(message) } catch { /* ignore */ }
    }
  }
}
