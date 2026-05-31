import api from './client'

export interface EconomicEvent {
  id:          string
  title:       string
  currency:    string
  date:        string
  time:        string
  impact:      'high' | 'medium' | 'low' | 'holiday'
  forecast:    string
  previous:    string
  actual:      string | null
  description: string
  url:         string
}

export interface MacroNews {
  id:          string
  title:       string
  url:         string
  source:      string
  publishedAt: string
  sentiment:   number
  label:       'bullish' | 'bearish' | 'neutral'
  category:    string
}

export const fetchEconomicCalendar = (): Promise<EconomicEvent[]> =>
  api.get<EconomicEvent[]>('/news/economic-calendar').then(r => r.data)

export const fetchMacroNews = (): Promise<MacroNews[]> =>
  api.get<MacroNews[]>('/news/macro').then(r => r.data)
