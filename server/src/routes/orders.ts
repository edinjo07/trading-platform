import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  createOrder,
  cancelOrder,
  getOrdersByUser,
  executeOrder,
  orders,
  portfolios,
  tradeJournal,
} from '../services/tradingEngine'
import { dbLoadOrders, dbLoadPortfolio, dbSaveOrder, dbSavePortfolio, dbSaveTradeRecord, dbEnsureUser } from '../services/dbSync'
import { OrderSide, OrderType, TimeInForce } from '../types'

const router = Router()
router.use(authenticate)

// GET /api/orders
// ─── Design rule ────────────────────────────────────────────────────────────
// Always read from DB (Supabase is the single source of truth).
// The in-memory map is updated after load so other in-process calls
// (e.g. executeOrder) can see the latest state within the same request.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status } = req.query
  const userId = req.user!.userId
  try {
    let dbOrders = await dbLoadOrders(userId)

    // DB returned nothing but in-memory has orders for this user.
    // This happens when the schema was created AFTER orders were already placed
    // (orders lived only in-memory). Backfill them to DB now so they survive
    // future restarts, then serve from memory.
    if (dbOrders.length === 0) {
      const memOrders = getOrdersByUser(userId)
      if (memOrders.length > 0) {
        console.log(`[Orders] Backfilling ${memOrders.length} in-memory order(s) to DB for ${userId}`)
        for (const o of memOrders) {
          dbSaveOrder(o).catch((e: unknown) => console.error('[Orders] backfill save failed:', e))
        }
        dbOrders = memOrders
      }
    }

    // Sync into in-memory map so the watcher system stays consistent
    for (const o of dbOrders) orders.set(o.id, o)
    const result = status
      ? dbOrders.filter(o => o.status === (status as string))
      : dbOrders
    return res.json(result)
  } catch (err) {
    // DB unavailable (e.g. missing env vars) — serve in-memory orders so the
    // client is usable rather than permanently broken.  On a cold start with
    // no DB, this returns an empty list which is correct for a new user.
    console.error('[Orders] DB read failed — serving in-memory fallback:', err)
    const memOrders = getOrdersByUser(userId)
    const result2 = status ? memOrders.filter(o => o.status === (status as string)) : memOrders
    return res.json(result2)
  }
})

// POST /api/orders
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId

    // Step 1: ensure user row exists in public.users (FK guard).
    // Best-effort — if DB is unavailable (e.g. missing env var) we still allow
    // the order to execute in-memory rather than permanently blocking the user.
    try {
      await dbEnsureUser(userId, req.user!.email)
    } catch (e) {
      console.warn('[Orders] dbEnsureUser failed — continuing in-memory only:', e)
    }

    // Step 2: reload the portfolio from DB so the balance check uses the real
    // balance. Best-effort — if DB is unavailable fall back to the in-memory
    // value (correct on this container; may be stale across cold starts).
    try {
      const dbPort = await dbLoadPortfolio(userId)
      if (dbPort) portfolios.set(userId, dbPort)
    } catch (e) {
      console.warn('[Orders] Failed to load portfolio from DB — using in-memory balance:', e)
    }

    const {
      symbol, side, type, quantity, price, stopPrice,
      timeInForce, takeProfit, stopLoss, trailingOffset, notes, leverage,
    } = req.body

    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({ error: 'symbol, side, type, and quantity are required' })
    }
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'side must be buy or sell' })
    }
    if (!['market', 'limit', 'stop', 'stop_limit', 'trailing_stop'].includes(type)) {
      return res.status(400).json({ error: 'type must be market, limit, stop, stop_limit, or trailing_stop' })
    }
    if (type === 'limit' && !price) {
      return res.status(400).json({ error: 'price is required for limit orders' })
    }
    if (type === 'stop' && !stopPrice) {
      return res.status(400).json({ error: 'stopPrice is required for stop orders' })
    }
    if (type === 'stop_limit' && (!price || !stopPrice)) {
      return res.status(400).json({ error: 'price and stopPrice are required for stop_limit orders' })
    }
    if (type === 'trailing_stop' && !trailingOffset) {
      return res.status(400).json({ error: 'trailingOffset is required for trailing_stop orders' })
    }

    const parsedLeverage = leverage ? parseFloat(leverage) : 1

    const order = createOrder(
      userId,
      symbol,
      side as OrderSide,
      type as OrderType,
      parseFloat(quantity),
      price ? parseFloat(price) : undefined,
      stopPrice ? parseFloat(stopPrice) : undefined,
      (timeInForce as TimeInForce) || 'GTC',
      takeProfit ? parseFloat(takeProfit) : undefined,
      stopLoss ? parseFloat(stopLoss) : undefined,
      trailingOffset ? parseFloat(trailingOffset) : undefined,
      notes as string | undefined,
      parsedLeverage,
    )

    // Step 3: execute market orders and persist to DB synchronously.
    // This must happen BEFORE res.json() because:
    //   - On Vercel, the container is frozen immediately after the response,
    //     so any fire-and-forget promises would never run.
    //   - On Railway/local, synchronous persistence ensures the next
    //     GET /orders request (triggered 1.5s later by the client) always
    //     finds the order in DB even if that request lands on a fresh process.
    if (order.type === 'market') {
      executeOrder(order.id)
    }

    const filled    = orders.get(order.id)
    const portfolio = portfolios.get(userId)

    const dbSaves: Promise<void>[] = [
      dbSaveOrder(filled ?? order).catch((e: unknown) => {
        console.warn('[DB] Failed to save order:', e)
      }),
    ]
    if (portfolio) {
      dbSaves.push(
        dbSavePortfolio(userId, portfolio).catch((e: unknown) => {
          console.warn('[DB] Failed to save portfolio:', e)
        }),
      )
    }

    // Persist any trade journal entry created/updated by executeOrder.
    // A market buy that opens a long pushes a record with orderId === order.id.
    const filledOrderId = (filled ?? order).id
    const newJournalEntry = (tradeJournal.get(userId) ?? []).find(t => t.orderId === filledOrderId)
    if (newJournalEntry) {
      dbSaves.push(
        dbSaveTradeRecord(newJournalEntry).catch((e: unknown) => {
          console.warn('[DB] Failed to save trade record:', e)
        }),
      )
    }

    try {
      await Promise.all(dbSaves)
    } catch (err) {
      // DB persistence failed (e.g. missing SUPABASE_SERVICE_ROLE_KEY).
      // Log the failure but still return 201 — the order is live in-memory on
      // this container. Once the env var is added it will persist correctly.
      console.warn('[Orders] DB persistence failed — order executed in-memory only:', err)
    }

    return res.status(201).json(filled ?? order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create order'
    return res.status(400).json({ error: message })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = cancelOrder(req.params.id, req.user!.userId)
    // Await the DB write — fire-and-forget would leave the order as 'open' in DB
    // if the container is frozen before the promise resolves (Vercel behaviour).
    try {
      await dbSaveOrder(order)
    } catch (e) {
      console.error('[DB] Failed to save cancelled order:', e)
      // Non-fatal: in-memory state is already cancelled; DB will sync on next poll
    }
    return res.json(order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel order'
    return res.status(400).json({ error: message })
  }
})

export default router
