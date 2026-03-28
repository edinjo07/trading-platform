// ---------------------------------------------------------------------------
// Primitive enums / unions
// ---------------------------------------------------------------------------
export type AssetClass = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'bond'
export type AccountType = 'raw_spread' | 'ctrader' | 'standard'
export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY'
export type PositionSide = 'long' | 'short'
export type MarketSession = 'pre' | 'regular' | 'post' | 'closed'

export interface MarketSymbol {
  symbol: string
  name: string
  assetClass: AssetClass
  baseAsset: string
  quoteAsset: string
}

export interface Candle {
  time: number
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
  isOpen?: boolean
  session?: MarketSession
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
  spread?: number
  midPrice?: number
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
  price?: number
  stopPrice?: number
  takeProfit?: number
  stopLoss?: number
  leverage?: number          // 1 = no leverage; >1 = margin trade
  filledQuantity: number
  avgFillPrice?: number
  timeInForce: TimeInForce
  createdAt: string
  updatedAt: string
  filledAt?: string
  commission?: number
  slippage?: number
  trailingOffset?: number
  trailingHighWater?: number
  notes?: string
}

export interface Position {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  side: PositionSide
  openedAt?: string
  dailyPnl?: number
  dailyPnlPercent?: number
  // Leverage / margin
  leverage?: number
  margin?: number
  notionalValue?: number
  liquidationPrice?: number
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
  updatedAt?: string   // ISO timestamp - used to reject stale cold-start container responses
}

// ---------------------------------------------------------------------------
// Analytics / Trade Journal
// ---------------------------------------------------------------------------
export interface TradeRecord {
  id: string
  userId: string
  orderId: string
  symbol: string
  assetClass: AssetClass
  side: OrderSide
  entryPrice: number
  exitPrice?: number
  quantity: number
  pnl?: number
  pnlPercent?: number
  commission: number
  netPnl?: number
  openedAt: string
  closedAt?: string
  holdingPeriodMs?: number
  notes?: string
}

export interface EquityPoint {
  time: string
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
  totalReturn: number
  equityCurve: EquityPoint[]
  bestTrade: number
  worstTrade: number
  avgHoldingPeriodMs: number
  totalVolume: number
  startingBalance: number
  currentEquity: number
}

export interface User {
  id: string
  email: string
  username: string
  balance: number
  accountType: AccountType
}
