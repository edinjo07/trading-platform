import React, { useState } from 'react'

const IMPACT_LEVELS = [
  { value: 'all',    label: 'All',    color: '#94a3b8' },
  { value: 'high',   label: 'High',   color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low',    label: 'Low',    color: '#3b82f6' },
]

const CURRENCIES = ['All', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']

/* Static upcoming events — representative data based on the IC Markets economic calendar */
const EVENTS = [
  { id: 1,  time: '08:30', currency: 'USD', impact: 'high',   event: 'Non-Farm Payrolls',                  forecast: '200K',    previous: '151K',    actual: null },
  { id: 2,  time: '08:30', currency: 'USD', impact: 'high',   event: 'Unemployment Rate',                  forecast: '4.1%',    previous: '4.1%',    actual: null },
  { id: 3,  time: '10:00', currency: 'USD', impact: 'medium', event: 'ISM Manufacturing PMI',               forecast: '49.5',    previous: '50.3',    actual: null },
  { id: 4,  time: '12:30', currency: 'EUR', impact: 'medium', event: 'ECB Monetary Policy Meeting Minutes', forecast: '—',       previous: '—',       actual: null },
  { id: 5,  time: '14:00', currency: 'GBP', impact: 'low',    event: 'Consumer Confidence',                 forecast: '-21',     previous: '-20',     actual: null },
  { id: 6,  time: '14:30', currency: 'CAD', impact: 'high',   event: 'Employment Change',                   forecast: '15.0K',   previous: '1.1K',    actual: null },
  { id: 7,  time: '15:00', currency: 'USD', impact: 'medium', event: 'Factory Orders m/m',                  forecast: '0.5%',    previous: '-0.5%',   actual: null },
  { id: 8,  time: '15:30', currency: 'JPY', impact: 'low',    event: 'Household Spending y/y',              forecast: '-0.4%',   previous: '-2.4%',   actual: null },
  { id: 9,  time: '17:00', currency: 'AUD', impact: 'medium', event: 'RBA Governor Speech',                 forecast: '—',       previous: '—',       actual: null },
  { id: 10, time: '18:00', currency: 'EUR', impact: 'high',   event: 'CPI Flash Estimate y/y',              forecast: '2.2%',    previous: '2.3%',    actual: null },
  { id: 11, time: '20:00', currency: 'USD', impact: 'high',   event: 'FOMC Member Speech',                  forecast: '—',       previous: '—',       actual: null },
  { id: 12, time: '22:00', currency: 'NZD', impact: 'low',    event: 'ANZ Business Confidence',             forecast: '5.1',     previous: '4.2',     actual: null },
]

const IMPACT_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  high:   { bg: 'rgba(239,68,68,0.1)',   text: '#f87171', dot: '#ef4444' },
  medium: { bg: 'rgba(245,158,11,0.1)',  text: '#fbbf24', dot: '#f59e0b' },
  low:    { bg: 'rgba(59,130,246,0.1)',  text: '#93c5fd', dot: '#3b82f6' },
}

const CURRENCY_FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿',
}

export default function EconomicCalendarPage() {
  const [impactFilter, setImpactFilter] = useState('all')
  const [currencyFilter, setCurrencyFilter] = useState('All')

  const filtered = EVENTS.filter(e => {
    const matchImpact = impactFilter === 'all' || e.impact === impactFilter
    const matchCurrency = currencyFilter === 'All' || e.currency === currencyFilter
    return matchImpact && matchCurrency
  })

  const highCount   = EVENTS.filter(e => e.impact === 'high').length
  const mediumCount = EVENTS.filter(e => e.impact === 'medium').length
  const lowCount    = EVENTS.filter(e => e.impact === 'low').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h1 className="text-text-primary text-2xl font-bold">Economic Calendar</h1>
        </div>
        <p className="text-text-muted text-sm">Upcoming economic events and their expected market impact.</p>
      </div>

      {/* Impact summary chips */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'High Impact', count: highCount,   color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Medium',      count: mediumCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Low Impact',  count: lowCount,    color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 text-center"
               style={{ background: item.bg, border: `1px solid ${item.color}22` }}>
            <div className="text-2xl font-bold font-mono" style={{ color: item.color }}>{item.count}</div>
            <div className="text-xs text-text-muted mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Impact filter */}
        <div className="flex gap-1.5">
          {IMPACT_LEVELS.map(lvl => (
            <button
              key={lvl.value}
              onClick={() => setImpactFilter(lvl.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
              style={impactFilter === lvl.value
                ? { background: `${lvl.color}22`, color: lvl.color, border: `1px solid ${lvl.color}44` }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {lvl.value !== 'all' && (
                <span className="w-2 h-2 rounded-full" style={{ background: lvl.color }} />
              )}
              {lvl.label}
            </button>
          ))}
        </div>

        {/* Currency filter */}
        <div className="flex gap-1.5 flex-wrap">
          {CURRENCIES.map(cur => (
            <button
              key={cur}
              onClick={() => setCurrencyFilter(cur)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={currencyFilter === cur
                ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {cur !== 'All' && CURRENCY_FLAG[cur] ? `${CURRENCY_FLAG[cur]} ` : ''}{cur}
            </button>
          ))}
        </div>
      </div>

      {/* Date label */}
      <div className="flex items-center gap-2">
        <span className="text-text-muted text-xs uppercase tracking-wider">Today — March 29, 2026</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-text-muted text-xs">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Events table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Table header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted"
             style={{ background: '#0a1523', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="col-span-1">Time</span>
          <span className="col-span-1">Cur.</span>
          <span className="col-span-1">Impact</span>
          <span className="col-span-4">Event</span>
          <span className="col-span-2 text-right">Forecast</span>
          <span className="col-span-2 text-right">Previous</span>
          <span className="col-span-1 text-right">Actual</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-text-muted text-sm" style={{ background: '#0c1829' }}>
            No events match the current filters.
          </div>
        ) : (
          filtered.map((event, i) => {
            const impact = IMPACT_STYLE[event.impact]
            return (
              <div
                key={event.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors"
                style={{
                  background: i % 2 === 0 ? '#0c1829' : '#0a1523',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(14,165,233,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#0c1829' : '#0a1523')}
              >
                {/* Time */}
                <span className="col-span-1 text-xs font-mono text-text-secondary">{event.time}</span>

                {/* Currency */}
                <div className="col-span-1 flex items-center gap-1">
                  <span className="text-sm">{CURRENCY_FLAG[event.currency] ?? ''}</span>
                  <span className="text-xs font-semibold text-text-primary">{event.currency}</span>
                </div>

                {/* Impact */}
                <div className="col-span-1">
                  <span className="flex items-center gap-1 w-fit text-2xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: impact.bg, color: impact.text }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: impact.dot }} />
                    {event.impact.charAt(0).toUpperCase() + event.impact.slice(1)}
                  </span>
                </div>

                {/* Event name */}
                <span className="col-span-4 text-sm text-text-primary font-medium leading-snug">{event.event}</span>

                {/* Forecast */}
                <span className="col-span-2 text-right text-xs font-mono text-text-secondary">{event.forecast}</span>

                {/* Previous */}
                <span className="col-span-2 text-right text-xs font-mono text-text-muted">{event.previous}</span>

                {/* Actual */}
                <span className="col-span-1 text-right text-xs font-mono">
                  {event.actual
                    ? <span className="font-semibold" style={{ color: '#00c878' }}>{event.actual}</span>
                    : <span className="text-text-muted">—</span>
                  }
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Live widget link */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3.5"
           style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-text-primary text-sm font-semibold">Live Economic Calendar</p>
          <p className="text-text-muted text-xs mt-0.5">View the full real-time calendar powered by Myfxbook</p>
        </div>
        <a
          href="https://www.myfxbook.com/economic-calendar"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
          style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.12)' }}
        >
          Open Live Calendar
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
