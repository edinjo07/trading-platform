import api from './client'
import { MarketSymbol, Ticker, Candle, OrderBook, Trade } from '../types'

export const getSymbols = async (assetClass?: string): Promise<MarketSymbol[]> => {
  const { data } = await api.get<MarketSymbol[]>('/markets/symbols', {
    params: assetClass ? { assetClass } : {},
  })
  return data
}

export const getTickers = async (): Promise<Ticker[]> => {
  const { data } = await api.get<Ticker[]>('/markets/tickers')
  return data
}

export const getTicker = async (symbol: string): Promise<Ticker> => {
  const { data } = await api.get<Ticker>(`/markets/ticker/${encodeURIComponent(symbol)}`)
  return data
}

export const getCandles = async (symbol: string, interval = '1h', limit = 200): Promise<Candle[]> => {
  const { data } = await api.get<Candle[]>(`/markets/candles/${encodeURIComponent(symbol)}`, {
    params: { interval, limit },
  })
  return data
}

export const getOrderBook = async (symbol: string, depth = 15): Promise<OrderBook> => {
  const { data } = await api.get<OrderBook>(`/markets/orderbook/${encodeURIComponent(symbol)}`, {
    params: { depth },
  })
  return data
}

export const getRecentTrades = async (symbol: string, count = 30): Promise<Trade[]> => {
  const { data } = await api.get<Trade[]>(`/markets/trades/${encodeURIComponent(symbol)}`, {
    params: { count },
  })
  return data
}
