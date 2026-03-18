export type AssetClass = 'stock' | 'crypto' | 'forex'
export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY'
export type PositionSide = 'long' | 'short'

export interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  createdAt: string
  balance: number
}

export interface Symbol {
  symbol: string
  name: string
  assetClass: AssetClass
  baseAsset: string
  quoteAsset: string
}

export interface Candle {
  time: number // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Ticker {
  symbol: string
  price: number
  change: number
  changePercent: number
  high24h: number
  low24h: number
  volume24h: number
  timestamp: number
  bid?: number
  ask?: number
  spread?: number
  session?: 'pre' | 'regular' | 'post' | 'closed'
}

export interface OrderBookEntry {
  price: number
  size: number
  total: number
}

export interface OrderBook {
  symbol: string
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  timestamp: number
  spread: number
  midPrice: number
}

export interface Trade {
  id: string
  symbol: string
  price: number
  size: number
  side: OrderSide
  timestamp: number
}

export interface Order {
  id: string
  userId: string
  symbol: string
  side: OrderSide
  type: OrderType
  status: OrderStatus
  quantity: number
  price?: number            // limit price
  stopPrice?: number        // stop trigger
  trailingOffset?: number   // trailing stop offset (as % e.g. 0.02 = 2%)
  trailingHighWater?: number // highest price seen since order placed (server-tracked)
  takeProfit?: number
  stopLoss?: number
  leverage?: number          // 1 = no leverage (default); >1 = margin/leveraged order
  filledQuantity: number
  avgFillPrice?: number
  commission?: number       // commission paid on fill
  slippage?: number         // slippage on fill
  timeInForce: TimeInForce
  notes?: string
  createdAt: string
  updatedAt: string
  filledAt?: string
}

export interface Position {
  userId?: string
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  side: PositionSide
  openedAt: string
  dailyPnl?: number
  dailyPnlPercent?: number
  // Leverage / margin fields
  leverage?: number          // multiplier used to open this position
  margin?: number            // cash locked (notional / leverage)
  notionalValue?: number     // full position exposure (quantity * avgCost)
  liquidationPrice?: number  // price at which 90 % of margin is lost
}

export interface TradeRecord {
  id: string
  userId: string
  orderId: string
  symbol: string
  side: OrderSide
  quantity: number
  entryPrice: number
  exitPrice?: number
  pnl?: number
  pnlPercent?: number
  commission: number
  netPnl?: number
  openedAt: string
  closedAt?: string
  holdingPeriodMs?: number
  assetClass: AssetClass
}

export interface EquityPoint {
  time: number   // unix ms
  equity: number
  cashBalance: number
  unrealizedPnl: number
}

export interface PerformanceStats {
  userId: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number            // 0–1 decimal
  netProfit: number
  totalNetPnl: number
  totalGrossPnl: number
  grossProfit: number
  grossLoss: number
  totalCommissions: number
  avgWin: number
  avgLoss: number
  expectancy: number
  profitFactor: number
  maxDrawdown: number        // dollar value
  maxDrawdownPercent: number // 0–100 raw percent
  sharpeRatio: number
  totalReturn: number        // % return on initial balance
  equityCurve: EquityPoint[]
  bestTrade: number
  worstTrade: number
  avgHoldingPeriodMs: number
  totalVolume: number
  startingBalance: number
  currentEquity: number
}

export interface Portfolio {
  userId: string
  cashBalance: number
  totalMarketValue: number
  totalEquity: number
  unrealizedPnl: number
  realizedPnl: number
  positions: Position[]
  todayPnl?: number
  todayPnlPercent?: number
  peakEquity?: number
  drawdown?: number
  updatedAt?: string   // ISO timestamp — used by client to reject stale serverless responses
}

export interface JWTPayload {
  userId: string
  email: string
}

