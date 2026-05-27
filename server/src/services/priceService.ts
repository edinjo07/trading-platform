/**
 * priceService.ts
 *
 * Thin wrapper around mockDataService's live price state.
 * The mockDataService maintains an in-memory price cache that is updated:
 *   - Every second by the WS server (tickSymbol advances the GBM simulation)
 *   - In real-time by Binance/TwelveData feeds when available
 *
 * Every other service (orderEngine, slMonitor, portfolio route) reads
 * current prices through getPrice() — no DB round-trip needed.
 */

import { generateTicker, SYMBOLS } from './mockDataService'
import { AssetClass } from '../types'

const ASSET_CLASS_MAP: Record<string, AssetClass> = {}
for (const s of SYMBOLS) {
  ASSET_CLASS_MAP[s.symbol] = s.assetClass
}

/** Returns the current simulated/live price for a symbol, or null if unknown. */
export function getPrice(symbol: string): number | null {
  try {
    const price = generateTicker(symbol).price
    return price > 0 ? price : null
  } catch {
    return null
  }
}

/** Returns the asset class for a symbol ('crypto', 'stock', 'forex', …). */
export function getAssetClass(symbol: string): AssetClass {
  return ASSET_CLASS_MAP[symbol] ?? 'crypto'
}

/** Returns true if the symbol is in the supported symbol list. */
export function isKnownSymbol(symbol: string): boolean {
  return symbol in ASSET_CLASS_MAP
}

/** Per-asset-class maximum leverage allowed. Must match client getLeverageOptions(). */
export const MAX_LEVERAGE: Record<AssetClass, number> = {
  crypto:    10,
  forex:     1000,
  stock:     20,
  commodity: 500,
  index:     200,
  bond:      100,
}
