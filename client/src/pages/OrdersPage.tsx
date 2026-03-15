import React, { useEffect, useState } from 'react'
import { useTradingStore } from '../store/tradingStore'
import { formatDate, formatPrice, formatCurrency } from '../utils/formatters'
import { OrderStatus } from '../types'

function exportOrdersToCSV(orders: ReturnType<typeof useTradingStore.getState>['orders']) {
  const headers = ['ID','Symbol','Type','Side','Quantity','Price','Filled Qty','Avg Fill Price','Status','Created']
  const rows = orders.map(o => [
    o.id, o.symbol, o.type, o.side, o.quantity,
    o.price ?? '', o.filledQuantity, o.avgFillPrice ?? '',
    o.status, formatDate(o.createdAt),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `tradex-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_STYLES: Record<OrderStatus, { bg: string; color: string }> = {
  pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
  open:    { bg: 'rgba(14,165,233,0.15)',  color: '#38bdf8' },
  filled:  { bg: 'rgba(0,200,120,0.15)',   color: '#00c878' },
  cancelled:{ bg: 'rgba(107,128,153,0.15)', color: '#6b8099' },
  rejected: { bg: 'rgba(255,48,71,0.15)',  color: '#ff3047' },
}

const FILTERS = ['all', 'open', 'pending', 'filled', 'cancelled'] as const

export default function OrdersPage() {
  const { orders, cancelOrder, loadOrders } = useTradingStore()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  useEffect(() => { loadOrders() }, [loadOrders])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-text-primary text-2xl font-bold">Orders</h1>
          <p className="text-text-muted text-sm mt-1">{orders.length} total orders</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export CSV */}
          <button onClick={() => exportOrdersToCSV(orders)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)', color: '#00c878' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,120,0.14)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,200,120,0.08)'}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>

          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {FILTERS.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all"
              style={filter === s
                ? { background: 'rgba(14,165,233,0.18)', color: '#38bdf8' }
                : { color: '#6b8099' }}>
              {s}
              {s !== 'all' && (
                <span className="ml-1.5 text-[10px] tabular"
                  style={{ color: filter === s ? '#38bdf8' : '#3b5070' }}>
                  {orders.filter(o => o.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3">
          <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-text-muted text-sm font-medium">No orders found</p>
          <p className="text-text-muted text-xs">Orders you place will appear here</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                {['Symbol', 'Type', 'Side', 'Qty', 'Price', 'Filled', 'Avg Fill', 'Status', 'Created', ''].map((h, i) => (
                  <th key={i} className={`py-3 px-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted ${i >= 3 && i <= 6 ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const ss = STATUS_STYLES[order.status]
                return (
                  <tr key={order.id} className="transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td className="px-4 py-3 font-bold text-text-primary">{order.symbol}</td>
                    <td className="px-4 py-3 text-text-muted capitalize">{order.type}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold"
                        style={{ color: order.side === 'buy' ? '#00c878' : '#ff3047' }}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular">{order.quantity}</td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular">
                      {order.price ? formatPrice(order.price, order.symbol) : <span className="text-text-muted">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular">{order.filledQuantity}</td>
                    <td className="px-4 py-3 text-right text-text-secondary tabular">
                      {order.avgFillPrice ? formatPrice(order.avgFillPrice, order.symbol) : <span className="text-text-muted">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{ background: ss.bg, color: ss.color }}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {(order.status === 'open' || order.status === 'pending') && (
                        <button onClick={() => cancelOrder(order.id)}
                          className="text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
                          style={{ border: '1px solid rgba(255,48,71,0.3)', color: '#ff7080' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,48,71,0.1)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
