/**
 * Trading Pairs Service
 * Manages all tradeable instruments - their parameters, status, and settings.
 * In production this would be backed by a database; here we use an in-memory store
 * seeded from the mockDataService SYMBOLS list.
 */

import { v4 as uuidv4 } from 'uuid'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PairCategory = 'forex' | 'crypto' | 'stock' | 'commodity' | 'index'

export interface TradingPair {
  id:           string
  symbol:       string       // e.g. 'EUR/USD'
  name:         string       // e.g. 'Euro / US Dollar'
  category:     PairCategory
  baseAsset:    string
  quoteAsset:   string
  // Pricing
  spread:       number       // fixed spread in price units
  spreadType:   'fixed' | 'variable'
  commission:   number       // per-lot commission
  // Precision
  digits:       number       // decimal places for display
  tickSize:     number       // minimum price increment
  // Lot settings
  minLot:       number
  maxLot:       number
  stepLot:      number
  // Risk
  leverage:     number       // e.g. 100 means 1:100
  marginPct:    number       // margin % calculated from leverage
  swapLong:     number       // overnight swap rate (long)
  swapShort:    number       // overnight swap rate (short)
  // Meta
  enabled:      boolean
  description:  string
  createdAt:    string
  updatedAt:    string
}

export interface CreatePairDto {
  symbol:     string
  name:       string
  category:   PairCategory
  baseAsset:  string
  quoteAsset: string
  spread?:    number
  spreadType?:'fixed' | 'variable'
  commission?:number
  digits?:    number
  tickSize?:  number
  minLot?:    number
  maxLot?:    number
  stepLot?:   number
  leverage?:  number
  swapLong?:  number
  swapShort?: number
  description?:string
}

export interface UpdatePairDto extends Partial<CreatePairDto> {
  enabled?: boolean
}

// ─── Seed data ────────────────────────────────────────────────────────────────

interface SeedEntry {
  symbol: string; name: string; category: PairCategory
  baseAsset: string; quoteAsset: string
  spread: number; digits: number; tickSize: number
  minLot: number; maxLot: number; stepLot: number
  leverage: number; commission: number; swapLong: number; swapShort: number
  description: string
}

const SEED: SeedEntry[] = [
  // ── Forex ──────────────────────────────────────────────────────────────────
  {
    symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'forex',
    baseAsset: 'EUR', quoteAsset: 'USD',
    spread: 0.00010, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.52, swapShort: 0.18,
    description: 'Most traded currency pair in the world',
  },
  {
    symbol: 'GBP/USD', name: 'British Pound / US Dollar', category: 'forex',
    baseAsset: 'GBP', quoteAsset: 'USD',
    spread: 0.00014, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.48, swapShort: 0.14,
    description: 'Cable - highly liquid major pair',
  },
  {
    symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', category: 'forex',
    baseAsset: 'USD', quoteAsset: 'JPY',
    spread: 0.010, digits: 3, tickSize: 0.001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: 0.62, swapShort: -1.10,
    description: 'Yen pair driven by BoJ policy divergence',
  },
  {
    symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', category: 'forex',
    baseAsset: 'USD', quoteAsset: 'CHF',
    spread: 0.00014, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.30, swapShort: -0.05,
    description: 'Safe-haven Swiss franc pair',
  },
  {
    symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', category: 'forex',
    baseAsset: 'AUD', quoteAsset: 'USD',
    spread: 0.00014, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.45, swapShort: 0.12,
    description: 'Commodity-linked Aussie dollar pair',
  },
  {
    symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', category: 'forex',
    baseAsset: 'USD', quoteAsset: 'CAD',
    spread: 0.00018, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.38, swapShort: -0.08,
    description: 'Loonie pair correlated with oil prices',
  },
  {
    symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', category: 'forex',
    baseAsset: 'NZD', quoteAsset: 'USD',
    spread: 0.00018, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.42, swapShort: 0.10,
    description: 'Kiwi dollar, correlated with dairy prices',
  },
  {
    symbol: 'EUR/GBP', name: 'Euro / British Pound', category: 'forex',
    baseAsset: 'EUR', quoteAsset: 'GBP',
    spread: 0.00014, digits: 5, tickSize: 0.00001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: -0.28, swapShort: -0.10,
    description: 'Major European cross pair',
  },
  {
    symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', category: 'forex',
    baseAsset: 'EUR', quoteAsset: 'JPY',
    spread: 0.018, digits: 3, tickSize: 0.001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: 0.32, swapShort: -0.90,
    description: 'Euro Yen cross, volatile carry pair',
  },
  {
    symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', category: 'forex',
    baseAsset: 'GBP', quoteAsset: 'JPY',
    spread: 0.022, digits: 3, tickSize: 0.001,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 500, commission: 0, swapLong: 0.28, swapShort: -1.05,
    description: 'GBP/JPY - high volatility cross pair',
  },
  // ── Crypto ─────────────────────────────────────────────────────────────────
  {
    symbol: 'BTC/USDT', name: 'Bitcoin / Tether', category: 'crypto',
    baseAsset: 'BTC', quoteAsset: 'USDT',
    spread: 15.00, digits: 2, tickSize: 0.10,
    minLot: 0.001, maxLot: 10, stepLot: 0.001,
    leverage: 100, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: "World's leading cryptocurrency by market cap",
  },
  {
    symbol: 'ETH/USDT', name: 'Ethereum / Tether', category: 'crypto',
    baseAsset: 'ETH', quoteAsset: 'USDT',
    spread: 2.50, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 100, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: 'Ethereum - smart contract platform',
  },
  {
    symbol: 'SOL/USDT', name: 'Solana / Tether', category: 'crypto',
    baseAsset: 'SOL', quoteAsset: 'USDT',
    spread: 0.12, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 1000, stepLot: 0.01,
    leverage: 50, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: 'High-throughput L1 blockchain',
  },
  {
    symbol: 'BNB/USDT', name: 'BNB / Tether', category: 'crypto',
    baseAsset: 'BNB', quoteAsset: 'USDT',
    spread: 0.40, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 50, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: 'Binance exchange utility token',
  },
  {
    symbol: 'XRP/USDT', name: 'XRP / Tether', category: 'crypto',
    baseAsset: 'XRP', quoteAsset: 'USDT',
    spread: 0.0005, digits: 4, tickSize: 0.0001,
    minLot: 1, maxLot: 100000, stepLot: 1,
    leverage: 50, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: 'XRP - payment protocol and exchange network',
  },
  {
    symbol: 'DOGE/USDT', name: 'Dogecoin / Tether', category: 'crypto',
    baseAsset: 'DOGE', quoteAsset: 'USDT',
    spread: 0.0002, digits: 4, tickSize: 0.0001,
    minLot: 1, maxLot: 500000, stepLot: 1,
    leverage: 25, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: 'Meme coin with large community',
  },
  {
    symbol: 'ADA/USDT', name: 'Cardano / Tether', category: 'crypto',
    baseAsset: 'ADA', quoteAsset: 'USDT',
    spread: 0.0004, digits: 4, tickSize: 0.0001,
    minLot: 1, maxLot: 200000, stepLot: 1,
    leverage: 25, commission: 0.05, swapLong: -0.01, swapShort: -0.01,
    description: 'Proof-of-stake blockchain platform',
  },
  // ── Stocks ─────────────────────────────────────────────────────────────────
  {
    symbol: 'AAPL', name: 'Apple Inc.', category: 'stock',
    baseAsset: 'AAPL', quoteAsset: 'USD',
    spread: 0.05, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 1000, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'Consumer tech giant, iPhone & services',
  },
  {
    symbol: 'TSLA', name: 'Tesla Inc.', category: 'stock',
    baseAsset: 'TSLA', quoteAsset: 'USD',
    spread: 0.10, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 1000, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'Electric vehicle and clean energy company',
  },
  {
    symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'stock',
    baseAsset: 'NVDA', quoteAsset: 'USD',
    spread: 0.12, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'GPU and AI semiconductor leader',
  },
  {
    symbol: 'MSFT', name: 'Microsoft Corp.', category: 'stock',
    baseAsset: 'MSFT', quoteAsset: 'USD',
    spread: 0.06, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 1000, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'Cloud computing and software giant',
  },
  {
    symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'stock',
    baseAsset: 'GOOGL', quoteAsset: 'USD',
    spread: 0.08, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'Search, ads, and cloud parent company',
  },
  {
    symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'stock',
    baseAsset: 'AMZN', quoteAsset: 'USD',
    spread: 0.08, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'E-commerce and AWS cloud platform',
  },
  {
    symbol: 'META', name: 'Meta Platforms', category: 'stock',
    baseAsset: 'META', quoteAsset: 'USD',
    spread: 0.10, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 20, commission: 0, swapLong: -0.025, swapShort: -0.025,
    description: 'Social media and metaverse company',
  },
  // ── Commodities ────────────────────────────────────────────────────────────
  {
    symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'commodity',
    baseAsset: 'XAU', quoteAsset: 'USD',
    spread: 0.28, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 200, commission: 0, swapLong: -0.42, swapShort: -0.12,
    description: 'Gold spot - premier safe-haven commodity',
  },
  {
    symbol: 'XAG/USD', name: 'Silver / US Dollar', category: 'commodity',
    baseAsset: 'XAG', quoteAsset: 'USD',
    spread: 0.035, digits: 3, tickSize: 0.001,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 100, commission: 0, swapLong: -0.30, swapShort: -0.10,
    description: 'Silver spot - industrial and monetary metal',
  },
  {
    symbol: 'OIL/USD', name: 'WTI Crude Oil / USD', category: 'commodity',
    baseAsset: 'OIL', quoteAsset: 'USD',
    spread: 0.04, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 100, commission: 0, swapLong: -0.20, swapShort: -0.15,
    description: 'WTI crude oil futures CFD',
  },
  {
    symbol: 'BRENT/USD', name: 'Brent Crude Oil / USD', category: 'commodity',
    baseAsset: 'BRENT', quoteAsset: 'USD',
    spread: 0.04, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 100, commission: 0, swapLong: -0.18, swapShort: -0.14,
    description: 'Brent crude oil benchmark CFD',
  },
  {
    symbol: 'NAT.GAS', name: 'Natural Gas / USD', category: 'commodity',
    baseAsset: 'NATGAS', quoteAsset: 'USD',
    spread: 0.006, digits: 3, tickSize: 0.001,
    minLot: 0.01, maxLot: 500, stepLot: 0.01,
    leverage: 100, commission: 0, swapLong: -0.15, swapShort: -0.12,
    description: 'Natural gas futures CFD',
  },
  // ── Indices ────────────────────────────────────────────────────────────────
  {
    symbol: 'US500', name: 'S&P 500 Index', category: 'index',
    baseAsset: 'US500', quoteAsset: 'USD',
    spread: 0.50, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 200, commission: 0, swapLong: -0.28, swapShort: -0.08,
    description: 'S&P 500 - 500 largest US companies',
  },
  {
    symbol: 'US30', name: 'Dow Jones Industrial Average', category: 'index',
    baseAsset: 'US30', quoteAsset: 'USD',
    spread: 2.50, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 200, commission: 0, swapLong: -0.25, swapShort: -0.06,
    description: 'Dow Jones - 30 blue-chip US stocks',
  },
  {
    symbol: 'NAS100', name: 'NASDAQ 100 Index', category: 'index',
    baseAsset: 'NAS100', quoteAsset: 'USD',
    spread: 1.00, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 200, commission: 0, swapLong: -0.32, swapShort: -0.10,
    description: 'NASDAQ 100 - top tech companies',
  },
  {
    symbol: 'GER40', name: 'DAX 40 - Germany', category: 'index',
    baseAsset: 'GER40', quoteAsset: 'EUR',
    spread: 1.20, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 200, commission: 0, swapLong: -0.22, swapShort: -0.05,
    description: 'Germany DAX 40 blue-chip index',
  },
  {
    symbol: 'UK100', name: 'FTSE 100 - UK', category: 'index',
    baseAsset: 'UK100', quoteAsset: 'GBP',
    spread: 1.00, digits: 2, tickSize: 0.01,
    minLot: 0.01, maxLot: 100, stepLot: 0.01,
    leverage: 200, commission: 0, swapLong: -0.20, swapShort: -0.05,
    description: 'London FTSE 100 index',
  },
]

// ─── In-memory store ──────────────────────────────────────────────────────────

let pairsStore: TradingPair[] = SEED.map(s => ({
  id:          uuidv4(),
  symbol:      s.symbol,
  name:        s.name,
  category:    s.category,
  baseAsset:   s.baseAsset,
  quoteAsset:  s.quoteAsset,
  spread:      s.spread,
  spreadType:  'fixed' as const,
  commission:  s.commission,
  digits:      s.digits,
  tickSize:    s.tickSize,
  minLot:      s.minLot,
  maxLot:      s.maxLot,
  stepLot:     s.stepLot,
  leverage:    s.leverage,
  marginPct:   parseFloat((100 / s.leverage).toFixed(4)),
  swapLong:    s.swapLong,
  swapShort:   s.swapShort,
  enabled:     true,
  description: s.description,
  createdAt:   new Date().toISOString(),
  updatedAt:   new Date().toISOString(),
}))

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAllPairs(category?: PairCategory): TradingPair[] {
  return category ? pairsStore.filter(p => p.category === category) : [...pairsStore]
}

export function getPairById(id: string): TradingPair | undefined {
  return pairsStore.find(p => p.id === id)
}

export function getPairBySymbol(symbol: string): TradingPair | undefined {
  return pairsStore.find(p => p.symbol.toLowerCase() === symbol.toLowerCase())
}

export function createPair(dto: CreatePairDto): TradingPair {
  const exists = getPairBySymbol(dto.symbol)
  if (exists) throw new Error(`Pair ${dto.symbol} already exists`)

  const leverage = dto.leverage ?? 100
  const pair: TradingPair = {
    id:          uuidv4(),
    symbol:      dto.symbol.toUpperCase(),
    name:        dto.name,
    category:    dto.category,
    baseAsset:   dto.baseAsset.toUpperCase(),
    quoteAsset:  dto.quoteAsset.toUpperCase(),
    spread:      dto.spread      ?? 0,
    spreadType:  dto.spreadType  ?? 'fixed',
    commission:  dto.commission  ?? 0,
    digits:      dto.digits      ?? 5,
    tickSize:    dto.tickSize    ?? 0.00001,
    minLot:      dto.minLot      ?? 0.01,
    maxLot:      dto.maxLot      ?? 100,
    stepLot:     dto.stepLot     ?? 0.01,
    leverage,
    marginPct:   parseFloat((100 / leverage).toFixed(4)),
    swapLong:    dto.swapLong    ?? 0,
    swapShort:   dto.swapShort   ?? 0,
    enabled:     true,
    description: dto.description ?? '',
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  }
  pairsStore.push(pair)
  return pair
}

export function updatePair(id: string, dto: UpdatePairDto): TradingPair {
  const idx = pairsStore.findIndex(p => p.id === id)
  if (idx === -1) throw new Error(`Pair ${id} not found`)

  const existing = pairsStore[idx]
  const leverage = dto.leverage ?? existing.leverage
  const updated: TradingPair = {
    ...existing,
    ...dto,
    leverage,
    marginPct:   parseFloat((100 / leverage).toFixed(4)),
    updatedAt:   new Date().toISOString(),
  }
  pairsStore[idx] = updated
  return updated
}

export function deletePair(id: string): void {
  const idx = pairsStore.findIndex(p => p.id === id)
  if (idx === -1) throw new Error(`Pair ${id} not found`)
  pairsStore.splice(idx, 1)
}

export function togglePair(id: string): TradingPair {
  const idx = pairsStore.findIndex(p => p.id === id)
  if (idx === -1) throw new Error(`Pair ${id} not found`)
  pairsStore[idx] = {
    ...pairsStore[idx],
    enabled:   !pairsStore[idx].enabled,
    updatedAt: new Date().toISOString(),
  }
  return pairsStore[idx]
}

export function getPairStats() {
  const total    = pairsStore.length
  const enabled  = pairsStore.filter(p => p.enabled).length
  const byCategory: Record<string, number> = {}
  pairsStore.forEach(p => { byCategory[p.category] = (byCategory[p.category] ?? 0) + 1 })
  return { total, enabled, disabled: total - enabled, byCategory }
}
