/**
 * TradingView Charting Library - Custom Datafeed
 *
 * Implements IExternalDatafeed to connect TradingView Advanced Charts to our
 * backend API.  History is loaded via REST; real-time updates flow through a
 * dedicated WebSocket connection.
 *
 * Docs: https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Datafeed.IExternalDatafeed
 */

import api from './client'
import { Candle, MarketSymbol } from '../types'

// ---------------------------------------------------------------------------
// Resolution ↔ interval mapping
// ---------------------------------------------------------------------------
const TV_RES_TO_INTERVAL: Record<string, string> = {
  '1':   '1m',
  '3':   '3m',
  '5':   '5m',
  '15':  '15m',
  '30':  '30m',
  '60':  '1h',
  '120': '2h',
  '240': '4h',
  'D':   '1d',
  '1D':  '1d',
  'W':   '1w',
  '1W':  '1w',
}

export const INTERVAL_TO_TV_RES: Record<string, string> = {
  '1m':  '1',
  '3m':  '3',
  '5m':  '5',
  '15m': '15',
  '30m': '30',
  '1h':  '60',
  '2h':  '120',
  '4h':  '240',
  '1d':  '1D',
  '1w':  '1W',
}

const SUPPORTED_RESOLUTIONS: Charting_Library.ResolutionString[] = [
  '1', '3', '5', '15', '30', '60', '120', '240', '1D', '1W',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns price scale for a given asset class / symbol. */
function getPriceScale(symbol: MarketSymbol): number {
  if (symbol.assetClass === 'crypto') return 100
  if (symbol.assetClass === 'forex') {
    // JPY pairs have 3 decimal places; others have 5
    return symbol.quoteAsset === 'JPY' ? 1000 : 100000
  }
  return 100 // stocks
}

/** Returns trading session string for TV. */
function getSession(symbol: MarketSymbol): string {
  if (symbol.assetClass === 'crypto') return '24x7'
  // Treat all others as 24x7 since our mock data is always available
  return '24x7'
}

/** Derives the WS base-URL using the same logic as useWebSocket. */
function buildWsUrl(token?: string | null): string {
  const explicitWs = (import.meta.env.VITE_WS_URL as string | undefined)
  const apiUrl     = (import.meta.env.VITE_API_URL as string | undefined)

  let base: string
  if (explicitWs) {
    base = explicitWs.replace(/\/+$/, '').replace(/\/ws$/, '') + '/ws'
  } else if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
    base = apiUrl
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://')
      .replace(/\/api\/?$/, '')
      .replace(/\/+$/, '') + '/ws'
  } else {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    base = `${proto}://${window.location.host}/ws`
  }

  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

// ---------------------------------------------------------------------------
// Subscriber registry entry
// ---------------------------------------------------------------------------
interface Subscription {
  symbol: string
  resolution: Charting_Library.ResolutionString
  onTick: Charting_Library.SubscribeBarsCallback
  onResetCache: () => void
}

// ---------------------------------------------------------------------------
// Datafeed class
// ---------------------------------------------------------------------------
export class TVDatafeed implements Charting_Library.IExternalDatafeed {
  // Cached symbol list fetched during onReady
  private symbols: MarketSymbol[] = []
  private symbolsReady = false

  // Per-listenerGuid subscriber map
  private subscribers = new Map<string, Subscription>()
  // Symbols currently subscribed via WS
  private wsSymbols = new Set<string>()

  // Dedicated WebSocket for live bar updates
  private ws: WebSocket | null = null
  private wsReady = false
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null

  // Quote subscriptions (for Watchlist / Details widget in Trading Platform)
  private quoteSubs = new Map<string, { symbols: string[]; fastSymbols: string[]; onTick: Charting_Library.QuotesCallback }>()
  private quoteTimer: ReturnType<typeof setInterval> | null = null

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - onReady
  // ---------------------------------------------------------------------------
  onReady(callback: (cfg: Charting_Library.DatafeedConfiguration) => void): void {
    // Fetch symbol list once
    api.get<MarketSymbol[]>('/markets/symbols')
      .then(({ data }) => { this.symbols = data ; this.symbolsReady = true })
      .catch(() => { this.symbolsReady = true }) // proceed even on error
      .finally(() => {
        // TV requires onReady callback to be called asynchronously
        setTimeout(() => {
          callback({
            supported_resolutions: SUPPORTED_RESOLUTIONS,
            supports_group_request: false,
            supports_marks: true,
            supports_search: true,
            supports_timescale_marks: false,
            exchanges: [
              { value: '',       name: 'All',    desc: '' },
              { value: 'CRYPTO', name: 'Crypto', desc: 'Cryptocurrencies' },
              { value: 'STOCK',  name: 'Stock',  desc: 'Stocks & ETFs' },
              { value: 'FOREX',  name: 'Forex',  desc: 'Foreign Exchange' },
            ],
            symbols_types: [
              { name: 'All',    value: '' },
              { name: 'Crypto', value: 'crypto' },
              { name: 'Stock',  value: 'stock' },
              { name: 'Forex',  value: 'forex' },
            ],
          })
        }, 0)
      })
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - searchSymbols
  // ---------------------------------------------------------------------------
  searchSymbols(
    userInput: string,
    _exchange: string,
    symbolType: string,
    onResult: Charting_Library.SearchSymbolsCallback,
  ): void {
    const query = userInput.toLowerCase()
    const results = this.symbols
      .filter(s => {
        const matchType  = !symbolType || s.assetClass === symbolType
        const matchQuery = s.symbol.toLowerCase().includes(query)
          || s.name.toLowerCase().includes(query)
        return matchType && matchQuery
      })
      .slice(0, 50)
      .map(s => ({
        symbol:      s.symbol,
        full_name:   s.symbol,
        description: s.name,
        exchange:    s.assetClass.toUpperCase(),
        ticker:      s.symbol,
        type:        s.assetClass,
      } satisfies Charting_Library.SearchSymbolResultItem))

    onResult(results)
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - resolveSymbol
  // ---------------------------------------------------------------------------
  resolveSymbol(
    symbolName: string,
    onResolve: Charting_Library.ResolveCallback,
    onError: Charting_Library.ErrorCallback,
  ): void {
    const found = this.symbols.find(
      s => s.symbol === symbolName || s.symbol === symbolName.toUpperCase(),
    )

    if (!found) {
      // Fall back to a generic descriptor when the cache isn't ready yet
      if (!this.symbolsReady) {
        setTimeout(() => this.resolveSymbol(symbolName, onResolve, onError), 100)
        return
      }
      onError(`Symbol ${symbolName} not found`)
      return
    }

    setTimeout(() => {
      onResolve({
        name:          found.symbol,
        full_name:     found.symbol,
        description:   found.name,
        type:          found.assetClass,
        session:       getSession(found),
        exchange:      found.assetClass.toUpperCase(),
        listed_exchange: found.assetClass.toUpperCase(),
        timezone:      'Etc/UTC',
        format:        'price',
        pricescale:    getPriceScale(found),
        minmov:        1,
        has_intraday:  true,
        has_daily:     true,
        has_weekly_and_monthly: true,
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 2,
        data_status:   'streaming',
      })
    }, 0)
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - getBars
  // ---------------------------------------------------------------------------
  async getBars(
    symbolInfo: Charting_Library.LibrarySymbolInfo,
    resolution: Charting_Library.ResolutionString,
    periodParams: Charting_Library.PeriodParams,
    onResult: Charting_Library.HistoryCallback,
    onError: Charting_Library.ErrorCallback,
  ): Promise<void> {
    const interval = TV_RES_TO_INTERVAL[resolution]
    if (!interval) {
      onError(`Unsupported resolution: ${resolution}`)
      return
    }

    // On non-first requests we've already loaded all available bars; signal end.
    if (!periodParams.firstDataRequest) {
      onResult([], { noData: true })
      return
    }

    const limit = Math.min(1000, Math.max(periodParams.countBack + 100, 300))

    try {
      const { data } = await api.get<Candle[]>(
        `/markets/candles/${encodeURIComponent(symbolInfo.name)}`,
        { params: { interval, limit } },
      )

      if (!Array.isArray(data) || data.length === 0) {
        onResult([], { noData: true })
        return
      }

      // Filter to the requested range (from inclusive, to exclusive)
      const bars = data
        .filter(c => c.time >= periodParams.from && c.time < periodParams.to)
        .map(c => ({
          time:   c.time * 1000,   // Candle.time is Unix seconds; TV Bar.time must be ms
          open:   c.open,
          high:   c.high,
          low:    c.low,
          close:  c.close,
          volume: c.volume,
        } satisfies Charting_Library.Bar))

      // If no bars match the window but we do have data, TV is asking for a
      // range before our history starts - signal noData so it stops paging.
      onResult(bars, { noData: bars.length === 0 })
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - subscribeBars
  // ---------------------------------------------------------------------------
  subscribeBars(
    symbolInfo: Charting_Library.LibrarySymbolInfo,
    resolution: Charting_Library.ResolutionString,
    onTick: Charting_Library.SubscribeBarsCallback,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void,
  ): void {
    this.subscribers.set(listenerGuid, {
      symbol:     symbolInfo.name,
      resolution,
      onTick,
      onResetCache: onResetCacheNeededCallback,
    })

    if (!this.wsSymbols.has(symbolInfo.name)) {
      this.wsSymbols.add(symbolInfo.name)
      this.ensureWsConnected()
        .then(() => this.wsSubscribe(symbolInfo.name))
        .catch(() => {/* ws connection failed, subscription skipped */})
    }
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - unsubscribeBars
  // ---------------------------------------------------------------------------
  unsubscribeBars(listenerGuid: string): void {
    const sub = this.subscribers.get(listenerGuid)
    if (!sub) return
    this.subscribers.delete(listenerGuid)

    // Only unsubscribe from WS if no other listeners watch this symbol
    const stillNeeded = [...this.subscribers.values()].some(s => s.symbol === sub.symbol)
    if (!stillNeeded) {
      this.wsSymbols.delete(sub.symbol)
      if (this.wsReady && this.ws) {
        this.ws.send(JSON.stringify({
          type:    'unsubscribe',
          payload: { channel: `candle:${sub.symbol}` },
        }))
      }
    }

    if (this.subscribers.size === 0) {
      this.destroyWs()
    }
  }

  // ---------------------------------------------------------------------------
  // WebSocket management
  // ---------------------------------------------------------------------------
  private ensureWsConnected(): Promise<void> {
    if (this.wsReady && this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        // Already connecting - wait for it
        this.ws.addEventListener('open',  () => resolve(), { once: true })
        this.ws.addEventListener('error', () => reject(new Error('WS connection failed')), { once: true })
        return
      }
      this.createWs(resolve, reject)
    })
  }

  private createWs(onOpen?: () => void, onError?: (e: Error) => void): void {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer)
      this.wsReconnectTimer = null
    }

    const url = buildWsUrl(localStorage.getItem('token'))
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.wsReady = true
      // Re-subscribe all previously subscribed symbols
      for (const symbol of this.wsSymbols) {
        this.wsSubscribe(symbol)
      }
      onOpen?.()
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; payload: unknown }
        if (msg.type === 'candle_closed' || msg.type === 'candle_update') {
          const { symbol, candle } = msg.payload as { symbol: string; candle: Candle }
          this.dispatch(symbol, candle)
        }
      } catch { /* malformed message */ }
    }

    ws.onerror = () => {
      onError?.(new Error('WS error'))
    }

    ws.onclose = () => {
      this.wsReady = false
      // Reconnect automatically when there are still active subscribers
      if (this.subscribers.size > 0) {
        this.wsReconnectTimer = setTimeout(() => {
          if (this.subscribers.size > 0) this.createWs()
        }, 3000)
      }
    }
  }

  private wsSubscribe(symbol: string): void {
    if (this.wsReady && this.ws) {
      this.ws.send(JSON.stringify({
        type:    'subscribe',
        payload: { channel: `candle:${symbol}` },
      }))
    }
  }

  private destroyWs(): void {
    if (this.wsReconnectTimer) { clearTimeout(this.wsReconnectTimer); this.wsReconnectTimer = null }
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null }
    this.wsReady = false
  }

  /** Forward a candle update to all matching subscribers. */
  private dispatch(symbol: string, candle: Candle): void {
    for (const sub of this.subscribers.values()) {
      if (sub.symbol === symbol) {
        sub.onTick({
          time:   candle.time * 1000,   // Candle.time is Unix seconds; TV requires milliseconds
          open:   candle.open,
          high:   candle.high,
          low:    candle.low,
          close:  candle.close,
          volume: candle.volume,
        })
      }
    }
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - getServerTime  (optional)
  // ---------------------------------------------------------------------------
  getServerTime(callback: Charting_Library.ServerTimeCallback): void {
    setTimeout(() => callback(Math.floor(Date.now() / 1000)), 0)
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - calculateHistoryDepth  (optional)
  // Gives TV paging hints so it doesn't request data beyond our history depth.
  // ---------------------------------------------------------------------------
  calculateHistoryDepth(
    resolution: Charting_Library.ResolutionString,
    _resolutionBack: string,
    _intervalBack: number,
  ): { resolutionBack: string; intervalBack: number } | undefined {
    if (resolution === '1')   return { resolutionBack: 'D', intervalBack: 30 }
    if (resolution === '5')   return { resolutionBack: 'D', intervalBack: 60 }
    if (resolution === '15')  return { resolutionBack: 'M', intervalBack: 3 }
    if (resolution === '60')  return { resolutionBack: 'M', intervalBack: 12 }
    return undefined
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - getMarks  (optional)
  // Renders colored buy/sell markers on bars from the trade journal.
  // Mark.time is in Unix **seconds** (unlike Bar.time which is ms).
  // ---------------------------------------------------------------------------
  getMarks(
    symbolInfo: Charting_Library.LibrarySymbolInfo,
    from: number,
    to: number,
    onDataCallback: Charting_Library.GetMarksCallback<Charting_Library.Mark>,
    _resolution: Charting_Library.ResolutionString,
  ): void {
    api.get<import('../types').TradeRecord[]>('/analytics/trades')
      .then(({ data }) => {
        const marks = data.reduce<Charting_Library.Mark[]>((acc, t) => {
          if (t.symbol !== symbolInfo.name || !t.closedAt) return acc
          const ts = Math.floor(new Date(t.closedAt).getTime() / 1000)
          if (ts < from || ts > to) return acc
          const profit = (t.netPnl ?? 0) >= 0
          acc.push({
            id:      t.id,
            time:    ts,
            color:   profit ? 'green' : 'red',
            label:   profit ? 'P' : 'L',
            text:    `${t.side.toUpperCase()} ${t.quantity}@${t.entryPrice}  P&L: ${(t.netPnl ?? 0).toFixed(2)}`,
            minSize: 14,
          })
          return acc
        }, [])
        setTimeout(() => onDataCallback(marks), 0)
      })
      .catch(() => setTimeout(() => onDataCallback([]), 0))
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - getQuotes  (optional, powers Watchlist last-price column)
  // ---------------------------------------------------------------------------
  getQuotes(
    symbols: string[],
    onDataCallback: Charting_Library.QuotesCallback,
    _onErrorCallback: Charting_Library.QuotesErrorCallback,
  ): void {
    api.get<import('../types').Ticker[]>('/markets/tickers')
      .then(({ data }) => {
        const map = new Map(data.map(t => [t.symbol, t]))
        const quotes: Charting_Library.QuoteData[] = symbols.map(sym => {
          const t = map.get(sym)
          if (!t) return { n: sym, s: 'error' as const, v: { error: 'not found' } }
          return {
            n: sym,
            s: 'ok' as const,
            v: {
              ch:               t.change,
              chp:              t.changePercent,
              lp:               t.price,
              ask:              t.ask  ?? t.price,
              bid:              t.bid  ?? t.price,
              open_price:       t.price - t.change,
              high_price:       t.high24h,
              low_price:        t.low24h,
              volume:           t.volume24h,
              prev_close_price: t.price - t.change,
            } satisfies Charting_Library.QuoteValues,
          }
        })
        setTimeout(() => onDataCallback(quotes), 0)
      })
      .catch(() => {
        const errQuotes: Charting_Library.QuoteData[] = symbols.map(s => ({ n: s, s: 'error' as const, v: { error: 'fetch failed' } }))
        setTimeout(() => onDataCallback(errQuotes), 0)
      })
  }

  // ---------------------------------------------------------------------------
  // IExternalDatafeed - subscribeQuotes / unsubscribeQuotes  (optional)
  // Drives the Watchlist real-time price column via polling every 1.5 s.
  // ---------------------------------------------------------------------------
  subscribeQuotes(
    symbols: string[],
    fastSymbols: string[],
    onRealtimeCallback: Charting_Library.QuotesCallback,
    listenerGUID: string,
  ): void {
    this.quoteSubs.set(listenerGUID, { symbols, fastSymbols, onTick: onRealtimeCallback })
    if (!this.quoteTimer) {
      this.quoteTimer = setInterval(() => this.broadcastQuotes(), 1500)
    }
  }

  unsubscribeQuotes(listenerGUID: string): void {
    this.quoteSubs.delete(listenerGUID)
    if (this.quoteSubs.size === 0 && this.quoteTimer) {
      clearInterval(this.quoteTimer)
      this.quoteTimer = null
    }
  }

  private broadcastQuotes(): void {
    if (this.quoteSubs.size === 0) return
    api.get<import('../types').Ticker[]>('/markets/tickers')
      .then(({ data }) => {
        const map = new Map(data.map(t => [t.symbol, t]))
        for (const sub of this.quoteSubs.values()) {
          const toUpdate = [...new Set([...sub.symbols, ...sub.fastSymbols])]
          const quotes: Charting_Library.QuoteData[] = toUpdate.map(sym => {
            const t = map.get(sym)
            if (!t) return { n: sym, s: 'error' as const, v: { error: 'not found' } }
            return {
              n: sym,
              s: 'ok' as const,
              v: {
                ch:               t.change,
                chp:              t.changePercent,
                lp:               t.price,
                ask:              t.ask  ?? t.price,
                bid:              t.bid  ?? t.price,
                high_price:       t.high24h,
                low_price:        t.low24h,
                volume:           t.volume24h,
                open_price:       t.price - t.change,
                prev_close_price: t.price - t.change,
              } satisfies Charting_Library.QuoteValues,
            }
          })
          sub.onTick(quotes)
        }
      })
      .catch(() => {}) // silent - next poll will retry
  }
}

/** Singleton datafeed instance - one WS connection for all TV chart instances. */
export const tvDatafeed = new TVDatafeed()
