import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  createOrder,
  cancelOrder,
  getOrdersByUser,
  executeOrder,
  orders,
} from '../services/tradingEngine'
import { OrderSide, OrderType, TimeInForce } from '../types'

const router = Router()
router.use(authenticate)

// GET /api/orders
router.get('/', (req: AuthRequest, res: Response) => {
  const { status } = req.query
  let orders = getOrdersByUser(req.user!.userId)
  if (status) orders = orders.filter(o => o.status === status)
  return res.json(orders)
})

// POST /api/orders
router.post('/', (req: AuthRequest, res: Response) => {
  try {
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
      req.user!.userId,
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

    // On Vercel serverless: execute market orders synchronously before responding.
    // The container may be frozen immediately after the response is sent, so
    // a deferred setTimeout callback would never fire on a different invocation.
    if (order.type === 'market' && process.env.VERCEL) {
      executeOrder(order.id)
      const filled = orders.get(order.id)
      return res.status(201).json(filled ?? order)
    }

    return res.status(201).json(order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create order'
    return res.status(400).json({ error: message })
  }
})

// DELETE /api/orders/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const order = cancelOrder(req.params.id, req.user!.userId)
    return res.json(order)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel order'
    return res.status(400).json({ error: message })
  }
})

export default router
