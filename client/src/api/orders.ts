import api from './client'
import { Order, OrderSide } from '../types'

export interface PlaceOrderParams {
  symbol:          string
  side:            OrderSide
  quantity:        number
  leverage?:       number
  takeProfit?:     number
  stopLoss?:       number
  // Legacy / UI-only fields ignored by backend (market-only engine)
  type?:           string
  price?:          number
  stopPrice?:      number
  trailingOffset?: number
}

export interface PlaceOrderResult {
  id:         string
  symbol:     string
  side:       OrderSide
  quantity:   number
  fillPrice:  number
  leverage:   number
  margin:     number
  commission: number
  totalCost:  number
  takeProfit: number | undefined
  stopLoss:   number | undefined
  createdAt:  string
}

export const getOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>('/orders')
  return data
}

export const placeOrder = async (params: PlaceOrderParams): Promise<PlaceOrderResult> => {
  const { data } = await api.post<PlaceOrderResult>('/orders', params)
  return data
}
