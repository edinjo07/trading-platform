export function formatPrice(price: number, symbol?: string): string {
  if (!price && price !== 0) return '-'
  // Large indices / high-value crypto (USTEC=18000, BTC=74000, ZA50=74000, etc.)
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  // JPY cross pairs (USDJPY=149.320, GBPJPY=190.200)
  if (symbol?.includes('JPY')) return price.toFixed(3)
  // Extremely small values
  if (price < 0.001) return price.toFixed(6)
  // Forex, small crypto, and low-priced assets (price < 10)
  if (price < 10) return price.toFixed(4)
  // Stocks, gold, oil, indices in mid range (10 – 9999)
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(2)}K`
  return volume.toFixed(2)
}

export function formatCurrency(value: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maxDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value)
}

export function formatPnl(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCurrency(value)}`
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
