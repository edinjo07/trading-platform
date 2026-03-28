import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import jwt from 'jsonwebtoken'
import {
  tickSymbol,
  getAllTickers,
  generateOrderBook,
  generateRecentTrades,
  getLiveCandle,
  generateCandles,
  marketEvents,
  SYMBOLS,
} from '../services/mockDataService'
import { tradeEvents } from '../services/tradingEngine'
import { botEvents } from '../services/botEngine'
import { config } from '../config'
import { JWTPayload } from '../types'
import { verifySupabaseToken } from '../middleware/auth'

// ---------------------------------------------------------------------------
// Client registry
// ---------------------------------------------------------------------------
interface Client {
  ws: WebSocket
  subscriptions: Set<string>   // 'ticker', 'orderbook:SYMBOL', 'trades:SYMBOL', 'candle:SYMBOL', 'user:USERID'
  userId?: string
}

const clients = new Set<Client>()

// User channel index for fast lookups (userId → Set<Client>)
const userClients = new Map<string, Set<Client>>()

function registerUserClient(userId: string, client: Client): void {
  if (!userClients.has(userId)) userClients.set(userId, new Set())
  userClients.get(userId)!.add(client)
}

function removeClient(client: Client): void {
  clients.delete(client)
  if (client.userId) userClients.get(client.userId)?.delete(client)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function send(ws: WebSocket, type: string, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }))
  }
}

function broadcast(type: string, payload: unknown, filter?: (c: Client) => boolean): void {
  for (const client of clients) {
    if (!filter || filter(client)) {
      send(client.ws, type, payload)
    }
  }
}

// ---------------------------------------------------------------------------
// Public: push order-fill notification to a specific user
// ---------------------------------------------------------------------------
export function notifyUser(userId: string, type: string, payload: unknown): void {
  const uc = userClients.get(userId)
  if (!uc) return
  for (const client of uc) {
    send(client.ws, type, payload)
  }
}

// ---------------------------------------------------------------------------
// Market event: closed candle broadcast
// ---------------------------------------------------------------------------
marketEvents.on('candle', (symbol: string, candle: unknown) => {
  broadcast('candle_closed', { symbol, candle }, c => c.subscriptions.has(`candle:${symbol}`))
})

// ---------------------------------------------------------------------------
// Trade fill: push to the specific user's WebSocket
// ---------------------------------------------------------------------------
tradeEvents.on('orderFill', (data: { userId: string; [key: string]: unknown }) => {
  notifyUser(data.userId, 'order_fill', data)
})

// Bot update events - push real-time bot state to owner's WebSocket
botEvents.on('botUpdate', (userId: string, _botId: string, bot: unknown) => {
  notifyUser(userId, 'bot_update', bot)
})

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------
export function initWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const client: Client = { ws, subscriptions: new Set() }
    clients.add(client)

    // Resolve auth asynchronously - handles custom HS256 and Supabase ES256 tokens
    ;(async () => {
      try {
        const url = new URL(req.url ?? '', 'http://localhost')
        const token = url.searchParams.get('token')
        if (!token) return
        try {
          // Fast path: custom HS256 token (no network call)
          const decoded = jwt.verify(token, config.jwtSecret) as Record<string, unknown>
          const uid = (decoded.userId ?? decoded.sub) as string | undefined
          if (uid) { client.userId = uid; registerUserClient(uid, client) }
        } catch {
          // Slow path: Supabase ES256 token - verify via Supabase API
          const payload = await verifySupabaseToken(token)
          if (payload?.userId) { client.userId = payload.userId; registerUserClient(payload.userId, client) }
        }
      } catch { /* unauthenticated */ }
    })()

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        const { type, payload } = msg

        if (type === 'subscribe') {
          const channel = payload?.channel as string
          if (!channel) return
          client.subscriptions.add(channel)
          const [topic, symbol] = channel.split(':')

          // Immediate snapshots on subscribe
          if (topic === 'orderbook' && symbol) {
            send(ws, 'orderbook', generateOrderBook(symbol))
          } else if (topic === 'trades' && symbol) {
            send(ws, 'trades', generateRecentTrades(symbol, 50))
          } else if (topic === 'candle' && symbol) {
            // Send 300-bar 1m history + current live candle
            send(ws, 'candle_history', { symbol, candles: generateCandles(symbol, '1m', 300) })
            send(ws, 'candle_update', { symbol, candle: getLiveCandle(symbol) })
          }
        } else if (type === 'unsubscribe') {
          const channel = payload?.channel as string
          if (channel) client.subscriptions.delete(channel)
        } else if (type === 'auth') {
          // Late auth - async to handle Supabase ES256 tokens
          ;(async () => {
            try {
              const token = payload?.token as string
              let uid: string | undefined
              try {
                const decoded = jwt.verify(token, config.jwtSecret) as Record<string, unknown>
                uid = (decoded.userId ?? decoded.sub) as string | undefined
              } catch {
                const sb = await verifySupabaseToken(token)
                uid = sb?.userId
              }
              if (uid) {
                client.userId = uid
                registerUserClient(uid, client)
                send(ws, 'auth_ok', { userId: uid })
              } else {
                send(ws, 'auth_error', { message: 'Invalid token' })
              }
            } catch {
              send(ws, 'auth_error', { message: 'Invalid token' })
            }
          })()
        }
      } catch { /* ignore malformed */ }
    })

    ws.on('close', () => removeClient(client))
    ws.on('error', () => removeClient(client))

    // Initial snapshot
    send(ws, 'tickers', getAllTickers())
  })

  // ---------------------------------------------------------------------------
  // GBM tick loop - every 500 ms, tick all symbols
  // ---------------------------------------------------------------------------
  let tickCount = 0
  setInterval(() => {
    tickCount++
    const allTickers = getAllTickers()
    broadcast('tickers', allTickers)

    // Collect subscribed symbols for detailed feeds
    const obSymbols  = new Set<string>()
    const trdSymbols = new Set<string>()
    const cndSymbols = new Set<string>()

    for (const client of clients) {
      for (const sub of client.subscriptions) {
        const [topic, symbol] = sub.split(':')
        if (!symbol) continue
        if (topic === 'orderbook') obSymbols.add(symbol)
        if (topic === 'trades')    trdSymbols.add(symbol)
        if (topic === 'candle')    cndSymbols.add(symbol)
      }
    }

    // Tick each symbol that anyone is watching (also tick unsubscribed for price continuity)
    const allSymbols = SYMBOLS.map(s => s.symbol)
    for (const symbol of allSymbols) {
      try {
        const { trade, candleUpdate, isNewCandle } = tickSymbol(symbol)

        // Push trade to subscribed clients
        if (trdSymbols.has(symbol)) {
          broadcast('trade', trade, c => c.subscriptions.has(`trades:${symbol}`))
        }

        // Push candle update every tick (live candle streaming)
        if (cndSymbols.has(symbol)) {
          broadcast('candle_update', { symbol, candle: candleUpdate, isNewCandle },
            c => c.subscriptions.has(`candle:${symbol}`))
        }
      } catch { /* skip on error */ }
    }

    // Order book updates every 1s (2 ticks at 500ms)
    if (tickCount % 2 === 0) {
      for (const symbol of obSymbols) {
        broadcast('orderbook', generateOrderBook(symbol), c => c.subscriptions.has(`orderbook:${symbol}`))
      }
    }
  }, 500)

  return wss
}

