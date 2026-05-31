import React, { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ImpactLevel = 'high' | 'medium' | 'low'
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'

interface CalendarEvent {
  id:          number
  dayKey:      DayKey
  time:        string
  currency:    string
  impact:      ImpactLevel
  event:       string
  forecast:    string
  previous:    string
  actual:      string | null
  description: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:       '#050810',
  surface:  '#090d18',
  surface2: '#0d1423',
  border:   'rgba(255,255,255,0.07)',
  border2:  'rgba(255,255,255,0.11)',
  text1:    '#e2e8f0',
  text2:    '#64748b',
  text3:    '#334155',
  high:     '#ef4444',
  highBg:   'rgba(239,68,68,0.1)',
  medium:   '#f59e0b',
  mediumBg: 'rgba(245,158,11,0.1)',
  low:      '#3b82f6',
  lowBg:    'rgba(59,130,246,0.1)',
  blue:     '#0ea5e9',
  green:    '#10b981',
  red:      '#ef4444',
}

const IMPACT: Record<ImpactLevel, { color: string; bg: string; label: string; bars: number }> = {
  high:   { color: C.high,   bg: C.highBg,   label: 'HIGH',   bars: 3 },
  medium: { color: C.medium, bg: C.mediumBg, label: 'MED',    bars: 2 },
  low:    { color: C.low,    bg: C.lowBg,    label: 'LOW',    bars: 1 },
}

// ─── Event data ───────────────────────────────────────────────────────────────

const EVENTS: CalendarEvent[] = [
  // Monday
  { id:1,  dayKey:'mon', time:'02:30', currency:'AUD', impact:'medium', event:'RBA Interest Rate Decision',         forecast:'4.10%',   previous:'4.35%', actual:'4.10%', description:'Reserve Bank of Australia cash rate target' },
  { id:2,  dayKey:'mon', time:'05:00', currency:'JPY', impact:'low',    event:'Consumer Confidence Index',          forecast:'35.5',    previous:'34.1',  actual:null,     description:'Monthly survey of consumer sentiment in Japan' },
  { id:3,  dayKey:'mon', time:'08:30', currency:'USD', impact:'high',   event:'Non-Farm Payrolls',                  forecast:'200K',    previous:'151K',  actual:null,     description:'Monthly change in employed non-farm workers' },
  { id:4,  dayKey:'mon', time:'08:30', currency:'USD', impact:'high',   event:'Unemployment Rate',                  forecast:'4.1%',    previous:'4.1%',  actual:null,     description:'Percentage of total workforce that is unemployed' },
  { id:5,  dayKey:'mon', time:'08:30', currency:'CAD', impact:'high',   event:'Employment Change',                  forecast:'15.0K',   previous:'1.1K',  actual:null,     description:'Change in the number of employed Canadians' },
  { id:6,  dayKey:'mon', time:'10:00', currency:'USD', impact:'medium', event:'ISM Manufacturing PMI',              forecast:'49.5',    previous:'50.3',  actual:null,     description:'Survey of purchasing managers in manufacturing' },
  { id:7,  dayKey:'mon', time:'14:00', currency:'GBP', impact:'low',    event:'Consumer Confidence',                forecast:'-21',     previous:'-20',   actual:null,     description:'GfK consumer confidence survey' },
  { id:8,  dayKey:'mon', time:'18:00', currency:'EUR', impact:'high',   event:'CPI Flash Estimate y/y',             forecast:'2.2%',    previous:'2.3%',  actual:null,     description:'Preliminary estimate of consumer price inflation' },
  { id:9,  dayKey:'mon', time:'20:00', currency:'USD', impact:'high',   event:'FOMC Member Speech',                 forecast:'—',       previous:'—',     actual:null,     description:'Federal Open Market Committee member speech' },

  // Tuesday
  { id:10, dayKey:'tue', time:'00:30', currency:'AUD', impact:'medium', event:'GDP q/q',                            forecast:'0.4%',    previous:'0.3%',  actual:null,     description:'Quarterly change in Australian economic output' },
  { id:11, dayKey:'tue', time:'07:00', currency:'EUR', impact:'high',   event:'German CPI m/m',                     forecast:'0.2%',    previous:'0.4%',  actual:null,     description:'Monthly change in German consumer prices' },
  { id:12, dayKey:'tue', time:'08:30', currency:'USD', impact:'high',   event:'Average Hourly Earnings m/m',        forecast:'0.3%',    previous:'0.3%',  actual:null,     description:'Monthly change in earnings per employed worker' },
  { id:13, dayKey:'tue', time:'09:00', currency:'EUR', impact:'medium', event:'Eurozone PMI Composite',             forecast:'50.5',    previous:'49.7',  actual:null,     description:'Composite survey of purchasing managers in eurozone' },
  { id:14, dayKey:'tue', time:'09:30', currency:'GBP', impact:'high',   event:'Bank of England Rate Decision',      forecast:'4.25%',   previous:'4.50%', actual:null,     description:'BoE Monetary Policy Committee rate announcement' },
  { id:15, dayKey:'tue', time:'10:00', currency:'USD', impact:'medium', event:'JOLTS Job Openings',                 forecast:'7.55M',   previous:'7.48M', actual:null,     description:'Monthly survey of job openings across sectors' },
  { id:16, dayKey:'tue', time:'12:30', currency:'EUR', impact:'medium', event:'ECB Meeting Minutes',                forecast:'—',       previous:'—',     actual:null,     description:'Account of ECB policy discussions at last meeting' },
  { id:17, dayKey:'tue', time:'15:00', currency:'USD', impact:'low',    event:'Consumer Credit m/m',                forecast:'$15.0B',  previous:'$18.1B',actual:null,     description:'Monthly change in outstanding consumer credit' },

  // Wednesday
  { id:18, dayKey:'wed', time:'01:45', currency:'NZD', impact:'high',   event:'RBNZ Rate Decision',                 forecast:'3.25%',   previous:'3.50%', actual:null,     description:'Reserve Bank of New Zealand official cash rate' },
  { id:19, dayKey:'wed', time:'07:00', currency:'EUR', impact:'medium', event:'German Factory Orders m/m',          forecast:'1.0%',    previous:'-0.5%', actual:null,     description:'Change in new purchase orders placed with German manufacturers' },
  { id:20, dayKey:'wed', time:'08:15', currency:'USD', impact:'high',   event:'ADP Non-Farm Employment Change',     forecast:'175K',    previous:'155K',  actual:null,     description:'Automated payroll estimate for non-farm payrolls' },
  { id:21, dayKey:'wed', time:'09:30', currency:'GBP', impact:'medium', event:'UK Services PMI',                    forecast:'52.1',    previous:'51.9',  actual:null,     description:'Survey of UK service sector purchasing managers' },
  { id:22, dayKey:'wed', time:'10:00', currency:'USD', impact:'high',   event:'ISM Services PMI',                   forecast:'50.8',    previous:'51.6',  actual:null,     description:'Survey of purchasing managers in US services sector' },
  { id:23, dayKey:'wed', time:'14:00', currency:'USD', impact:'high',   event:'Crude Oil Inventories',              forecast:'-1.5M',   previous:'+2.3M', actual:null,     description:'Weekly EIA report on US crude oil stockpile change' },
  { id:24, dayKey:'wed', time:'18:00', currency:'USD', impact:'medium', event:'FOMC Meeting Minutes',               forecast:'—',       previous:'—',     actual:null,     description:'Detailed minutes from last Federal Reserve meeting' },

  // Thursday
  { id:25, dayKey:'thu', time:'07:00', currency:'EUR', impact:'medium', event:'German Industrial Production m/m',  forecast:'0.6%',    previous:'-1.3%', actual:null,     description:'Monthly change in German industrial output' },
  { id:26, dayKey:'thu', time:'08:30', currency:'USD', impact:'high',   event:'Initial Jobless Claims',             forecast:'228K',    previous:'221K',  actual:null,     description:'Weekly tally of new applications for unemployment benefits' },
  { id:27, dayKey:'thu', time:'08:30', currency:'USD', impact:'medium', event:'Trade Balance',                      forecast:'-$73.5B', previous:'-$71.9B',actual:null,   description:'Difference in value of imports and exports' },
  { id:28, dayKey:'thu', time:'09:30', currency:'GBP', impact:'high',   event:'UK GDP m/m',                         forecast:'0.1%',    previous:'0.5%',  actual:null,     description:'Monthly estimate of UK economic output' },
  { id:29, dayKey:'thu', time:'10:00', currency:'EUR', impact:'high',   event:'ECB Interest Rate Decision',         forecast:'2.15%',   previous:'2.40%', actual:null,     description:'European Central Bank refinancing rate' },
  { id:30, dayKey:'thu', time:'10:45', currency:'EUR', impact:'high',   event:'ECB Press Conference',               forecast:'—',       previous:'—',     actual:null,     description:'ECB President explains monetary policy rationale' },
  { id:31, dayKey:'thu', time:'15:30', currency:'USD', impact:'medium', event:'Natural Gas Storage',                forecast:'-62B',    previous:'+98B',  actual:null,     description:'EIA weekly natural gas storage change' },

  // Friday
  { id:32, dayKey:'fri', time:'07:00', currency:'EUR', impact:'medium', event:'French Industrial Output m/m',       forecast:'0.3%',    previous:'-0.6%', actual:null,     description:'Monthly change in French industrial production' },
  { id:33, dayKey:'fri', time:'08:30', currency:'USD', impact:'high',   event:'CPI m/m',                            forecast:'0.3%',    previous:'0.2%',  actual:null,     description:'Monthly change in US consumer prices' },
  { id:34, dayKey:'fri', time:'08:30', currency:'USD', impact:'high',   event:'Core CPI m/m',                       forecast:'0.3%',    previous:'0.2%',  actual:null,     description:'CPI excluding food and energy' },
  { id:35, dayKey:'fri', time:'09:00', currency:'EUR', impact:'medium', event:'Eurozone GDP Flash Estimate q/q',    forecast:'0.3%',    previous:'0.2%',  actual:null,     description:'Preliminary eurozone GDP growth estimate' },
  { id:36, dayKey:'fri', time:'10:00', currency:'USD', impact:'medium', event:'University of Michigan Sentiment',  forecast:'52.0',    previous:'52.2',  actual:null,     description:'Monthly survey of US consumer sentiment' },
  { id:37, dayKey:'fri', time:'10:00', currency:'USD', impact:'low',    event:'Wholesale Inventories m/m',          forecast:'0.3%',    previous:'0.5%',  actual:null,     description:'Monthly change in value of goods held by wholesalers' },
  { id:38, dayKey:'fri', time:'13:00', currency:'CAD', impact:'medium', event:'Ivey PMI',                           forecast:'51.2',    previous:'51.2',  actual:null,     description:'Survey of purchasing managers across Canada' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  USD:'us', EUR:'eu', GBP:'gb', JPY:'jp',
  AUD:'au', CAD:'ca', CHF:'ch', NZD:'nz',
}

function Flag({ currency, size = 20 }: { currency: string; size?: number }) {
  const code = FLAG[currency]
  if (!code) return null
  return (
    <img src={`https://flagcdn.com/${code}.svg`} width={size} height={Math.round(size * 0.67)}
         alt={currency} style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, display: 'block' }}/>
  )
}

function ImpactBars({ level, size = 14 }: { level: ImpactLevel; size?: number }) {
  const cfg = IMPACT[level]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
      {[1, 2, 3].map(bar => (
        <div key={bar} style={{
          width: size === 14 ? 4 : 3,
          height: bar === 1 ? size * 0.45 : bar === 2 ? size * 0.7 : size,
          borderRadius: 2,
          background: bar <= cfg.bars ? cfg.color : 'rgba(255,255,255,0.1)',
          boxShadow: bar <= cfg.bars ? `0 0 4px ${cfg.color}88` : 'none',
          transition: 'all 0.2s',
        }}/>
      ))}
    </div>
  )
}

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

function Surprise({ actual, forecast }: { actual: string | null; forecast: string }) {
  if (!actual || actual === '—') return <span style={{ color: C.text3 }}>—</span>
  const a = parseNum(actual), f = parseNum(forecast)
  if (a === null || f === null || f === 0) return <span style={{ color: C.text2, fontFamily: 'monospace' }}>{actual}</span>
  const diff = ((a - f) / Math.abs(f)) * 100
  const beat = a > f
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: beat ? C.green : C.red, fontSize: 13 }}>{actual}</span>
      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: beat ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: beat ? C.green : C.red }}>
        {beat ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
      </span>
    </div>
  )
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const est = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/New_York' })
  const gmt = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 800, color: C.text1, letterSpacing: '0.06em', lineHeight: 1 }}>{est}</div>
        <div style={{ fontSize: 9, color: C.text3, letterSpacing: '0.07em', marginTop: 2 }}>NEW YORK EST</div>
      </div>
      <div style={{ width: 1, height: 28, background: C.border2 }}/>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: C.text2 }}>{gmt}</div>
        <div style={{ fontSize: 9, color: C.text3, letterSpacing: '0.07em', marginTop: 2 }}>GMT</div>
      </div>
    </div>
  )
}

// ─── Market sessions ─────────────────────────────────────────────────────────

function SessionBadge() {
  const [hour, setHour] = useState(new Date().getUTCHours())
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getUTCHours()), 60_000)
    return () => clearInterval(id)
  }, [])
  const sessions = [
    { label: 'Sydney',  open: 22, close: 7,  color: '#8b5cf6' },
    { label: 'Tokyo',   open: 0,  close: 9,  color: '#06b6d4' },
    { label: 'London',  open: 8,  close: 17, color: '#0ea5e9' },
    { label: 'New York',open: 13, close: 22, color: '#10b981' },
  ]
  const active = sessions.filter(s => {
    if (s.open < s.close) return hour >= s.open && hour < s.close
    return hour >= s.open || hour < s.close
  })
  if (active.length === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {active.map(s => (
        <span key={s.label} style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}35`,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, animation: 'ec-pulse 2s ease-in-out infinite', flexShrink: 0 }}/>
          {s.label}
        </span>
      ))}
    </div>
  )
}

// ─── Event row — desktop ──────────────────────────────────────────────────────

function EventRow({ event, idx, expanded, onToggle }: {
  event: CalendarEvent; idx: number; expanded: boolean; onToggle: () => void
}) {
  const cfg = IMPACT[event.impact]
  const [hovered, setHovered] = useState(false)
  const bg = hovered ? 'rgba(14,165,233,0.04)' : idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent'

  return (
    <>
      <div
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'grid',
          gridTemplateColumns: '72px 90px 80px 1fr 90px 90px 90px',
          alignItems: 'center', gap: 0,
          background: bg,
          borderBottom: `1px solid ${C.border}`,
          borderLeft: `3px solid ${cfg.color}`,
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
      >
        {/* Time */}
        <div style={{ padding: '12px 12px', borderRight: `1px solid rgba(255,255,255,0.04)` }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: C.text2 }}>{event.time}</span>
          <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>EST</div>
        </div>

        {/* Currency */}
        <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRight: `1px solid rgba(255,255,255,0.04)` }}>
          <Flag currency={event.currency} size={18}/>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text1 }}>{event.currency}</span>
        </div>

        {/* Impact */}
        <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRight: `1px solid rgba(255,255,255,0.04)` }}>
          <ImpactBars level={event.impact}/>
          <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, letterSpacing: '0.04em' }}>{cfg.label}</span>
        </div>

        {/* Event name */}
        <div style={{ padding: '12px 16px', borderRight: `1px solid rgba(255,255,255,0.04)` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, lineHeight: 1.3 }}>{event.event}</div>
          {expanded && (
            <div style={{ fontSize: 10, color: C.text2, marginTop: 4, lineHeight: 1.4 }}>{event.description}</div>
          )}
        </div>

        {/* Forecast */}
        <div style={{ padding: '12px 12px', textAlign: 'right', borderRight: `1px solid rgba(255,255,255,0.04)` }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: C.text2 }}>{event.forecast}</span>
        </div>

        {/* Previous */}
        <div style={{ padding: '12px 12px', textAlign: 'right', borderRight: `1px solid rgba(255,255,255,0.04)` }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: C.text3 }}>{event.previous}</span>
        </div>

        {/* Actual */}
        <div style={{ padding: '12px 12px', textAlign: 'right' }}>
          {event.actual
            ? <Surprise actual={event.actual} forecast={event.forecast}/>
            : <span style={{ fontSize: 11, color: C.text3 }}>Pending</span>
          }
        </div>
      </div>
    </>
  )
}

// ─── Event card — mobile / timeline ──────────────────────────────────────────

function EventCard({ event, expanded, onToggle }: {
  event: CalendarEvent; expanded: boolean; onToggle: () => void
}) {
  const cfg = IMPACT[event.impact]
  return (
    <div
      onClick={onToggle}
      style={{
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        background: C.surface,
        border: `1px solid ${expanded ? cfg.color + '45' : C.border}`,
        borderLeft: `4px solid ${cfg.color}`,
        boxShadow: expanded ? `0 0 16px ${cfg.color}15` : 'none',
        transition: 'all 0.18s',
        marginBottom: 6,
      }}
    >
      {/* Card header */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Time + currency block */}
        <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 800, color: C.text1 }}>{event.time}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>EST</div>
        </div>
        <div style={{ width: 1, height: 28, background: C.border2, flexShrink: 0 }}/>

        {/* Flag + currency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <Flag currency={event.currency} size={16}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text2 }}>{event.currency}</span>
        </div>

        {/* Event name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event.event}
          </div>
        </div>

        {/* Impact badge + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 7px', borderRadius: 6, background: cfg.bg }}>
            <ImpactBars level={event.impact} size={10}/>
            <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color }}>{cfg.label}</span>
          </div>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={C.text3} strokeWidth={2.5}
               style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expanded data grid */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: event.actual ? 8 : 0 }}>
            {[
              { label: 'Forecast', value: event.forecast, color: C.text1 },
              { label: 'Previous', value: event.previous, color: C.text2 },
              { label: 'Actual',   value: event.actual ?? 'Pending', color: event.actual ? (parseNum(event.actual) ?? 0) >= (parseNum(event.forecast) ?? 0) ? C.green : C.red : C.text3 },
            ].map(col => (
              <div key={col.label} style={{ background: C.surface2, borderRadius: 8, padding: '7px 10px' }}>
                <div style={{ fontSize: 9, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{col.label}</div>
                <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 800, color: col.color }}>{col.value}</div>
              </div>
            ))}
          </div>
          {event.description && (
            <p style={{ fontSize: 10, color: C.text2, lineHeight: 1.5, margin: 0, padding: '6px 0 0' }}>{event.description}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_LABELS: Record<DayKey, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' }

function getWeekDates(): Record<DayKey, Date> {
  const now = new Date()
  const dow = now.getDay() // 0=Sun
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const dates: Record<DayKey, Date> = {} as Record<DayKey, Date>
  DAY_KEYS.forEach((k, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates[k] = d
  })
  return dates
}

function todayKey(): DayKey {
  const dow = new Date().getDay()
  const map: Record<number, DayKey> = { 1:'mon', 2:'tue', 3:'wed', 4:'thu', 5:'fri' }
  return map[dow] ?? 'mon'
}

export default function EconomicCalendarPage() {
  const weekDates   = getWeekDates()
  const [activeDay, setActiveDay]         = useState<DayKey>(todayKey())
  const [impactFilter, setImpactFilter]   = useState<'all' | ImpactLevel>('all')
  const [currencyFilter, setCurrencyFilter] = useState('All')
  const [expandedId, setExpandedId]       = useState<number | null>(null)
  const [isMobile, setIsMobile]           = useState(window.innerWidth < 768)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const toggleExpand = useCallback((id: number) => {
    setExpandedId(p => p === id ? null : id)
  }, [])

  const CURRENCIES = ['All', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']

  const dayEvents = EVENTS.filter(e => {
    if (e.dayKey !== activeDay) return false
    if (impactFilter !== 'all' && e.impact !== impactFilter) return false
    if (currencyFilter !== 'All' && e.currency !== currencyFilter) return false
    return true
  })

  const allDayEvents  = EVENTS.filter(e => e.dayKey === activeDay)
  const highCount     = allDayEvents.filter(e => e.impact === 'high').length
  const mediumCount   = allDayEvents.filter(e => e.impact === 'medium').length
  const lowCount      = allDayEvents.filter(e => e.impact === 'low').length

  const fmtDayTab = (key: DayKey) => {
    const d = weekDates[key]
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const todayDow = new Date().getDay()
  const isWeekend = todayDow === 0 || todayDow === 6

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: C.bg }}>
      <style>{`
        @keyframes ec-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ec-day-tab:hover { background: rgba(14,165,233,0.08) !important; }
        .ec-cur-btn:hover { opacity: 0.85; }
      `}</style>

      {/* ── Terminal header ───────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(180deg, rgba(14,165,233,0.06) 0%, rgba(5,8,16,0) 100%)`,
        borderBottom: `1px solid ${C.border2}`,
        padding: isMobile ? '14px 14px 12px' : '16px 22px 14px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          {/* Title block */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.22), rgba(6,182,212,0.12))',
              border: '1px solid rgba(14,165,233,0.3)',
              boxShadow: '0 0 20px rgba(14,165,233,0.18)',
            }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="14" x2="8" y2="14" strokeWidth={2.5}/>
                <line x1="12" y1="14" x2="12" y2="14" strokeWidth={2.5}/>
                <line x1="16" y1="14" x2="16" y2="14" strokeWidth={2.5}/>
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: isMobile ? 15 : 17, fontWeight: 900, color: C.text1, margin: 0, letterSpacing: '-0.01em' }}>
                  ECONOMIC CALENDAR
                </h1>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', letterSpacing: '0.08em' }}>LIVE</span>
              </div>
              <p style={{ fontSize: 10, color: C.text2, margin: '3px 0 0', letterSpacing: '0.02em' }}>
                Central bank decisions · Macro indicators · Market-moving events
              </p>
            </div>
          </div>
          {/* Clock + sessions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <LiveClock/>
            {!isMobile && <SessionBadge/>}
          </div>
        </div>

        {/* ── Impact summary strip ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'High Impact', count: highCount,   color: C.high,   bg: C.highBg,   impact: 'high' as ImpactLevel },
            { label: 'Medium',      count: mediumCount, color: C.medium, bg: C.mediumBg, impact: 'medium' as ImpactLevel },
            { label: 'Low Impact',  count: lowCount,    color: C.low,    bg: C.lowBg,    impact: 'low' as ImpactLevel },
          ].map(s => (
            <button key={s.label} onClick={() => setImpactFilter(p => p === s.impact ? 'all' : s.impact)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 12px', borderRadius: 10, cursor: 'pointer',
              background: impactFilter === s.impact ? s.bg : 'rgba(255,255,255,0.03)',
              border: `1px solid ${impactFilter === s.impact ? s.color + '50' : C.border}`,
              transition: 'all 0.14s',
            }}>
              <ImpactBars level={s.impact} size={12}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: impactFilter === s.impact ? s.color : C.text2 }}>{s.label}</span>
              <span style={{
                fontSize: 13, fontWeight: 900, fontFamily: 'monospace',
                color: impactFilter === s.impact ? s.color : C.text1,
                textShadow: impactFilter === s.impact ? `0 0 8px ${s.color}` : 'none',
              }}>{s.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Day tabs ──────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', minWidth: 'max-content' }}>
          {DAY_KEYS.map(key => {
            const isActive  = activeDay === key
            const isToday   = !isWeekend && todayKey() === key
            const cnt       = EVENTS.filter(e => e.dayKey === key).length
            return (
              <button key={key} onClick={() => { setActiveDay(key); setExpandedId(null) }} className="ec-day-tab"
                style={{
                  padding: '11px 18px', background: 'none', border: 'none',
                  borderBottom: `2px solid ${isActive ? C.blue : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  minWidth: isMobile ? 70 : 90,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? C.blue : C.text2 }}>{DAY_LABELS[key]}</span>
                  {isToday && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue, boxShadow: `0 0 5px ${C.blue}` }}/>}
                </div>
                <span style={{ fontSize: 9, color: isActive ? C.text2 : C.text3 }}>{fmtDayTab(key)}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? C.blue : C.text3 }}>{cnt} events</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '10px 12px' : '10px 22px', borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 6, minWidth: 'max-content', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: C.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 4, flexShrink: 0 }}>Currency</span>
          {CURRENCIES.map(cur => (
            <button key={cur} onClick={() => setCurrencyFilter(cur)} className="ec-cur-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.12s',
                background: currencyFilter === cur ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${currencyFilter === cur ? 'rgba(14,165,233,0.3)' : C.border}`,
                color: currencyFilter === cur ? C.blue : C.text2,
                fontSize: 11, fontWeight: 700,
              }}>
              {cur !== 'All' && <Flag currency={cur} size={14}/>}
              {cur}
            </button>
          ))}
        </div>
      </div>

      {/* ── Events ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {dayEvents.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke={C.text3} strokeWidth={1.2}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.text2, margin: 0 }}>No events match the filters</p>
            <p style={{ fontSize: 12, color: C.text3, margin: 0 }}>Try changing the impact or currency filter</p>
          </div>
        ) : isMobile ? (
          /* ── Mobile: vertical timeline ─────────────────────────────── */
          <div style={{ padding: '12px' }}>
            {dayEvents.map(event => (
              <EventCard key={event.id} event={event} expanded={expandedId === event.id} onToggle={() => toggleExpand(event.id)}/>
            ))}
          </div>
        ) : (
          /* ── Desktop: dense table ──────────────────────────────────── */
          <div>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '72px 90px 80px 1fr 90px 90px 90px',
              background: C.surface2,
              borderBottom: `1px solid ${C.border2}`,
              position: 'sticky', top: 0, zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {[
                { label: 'TIME',     align: 'left'  },
                { label: 'CURRENCY', align: 'left'  },
                { label: 'IMPACT',   align: 'left'  },
                { label: 'EVENT',    align: 'left'  },
                { label: 'FORECAST', align: 'right' },
                { label: 'PREVIOUS', align: 'right' },
                { label: 'ACTUAL',   align: 'right' },
              ].map((h, i) => (
                <div key={h.label} style={{
                  padding: '9px 12px',
                  fontSize: 9, fontWeight: 800, color: C.text3,
                  letterSpacing: '0.09em', textTransform: 'uppercase',
                  textAlign: h.align as 'left' | 'right',
                  borderRight: i < 6 ? `1px solid rgba(255,255,255,0.04)` : 'none',
                }}>{h.label}</div>
              ))}
            </div>

            {/* Rows */}
            {dayEvents.map((event, i) => (
              <EventRow key={event.id} event={event} idx={i} expanded={expandedId === event.id} onToggle={() => toggleExpand(event.id)}/>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer: data source ───────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: isMobile ? '12px 14px' : '12px 22px', flexShrink: 0, background: C.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: 'ec-pulse 2s ease-in-out infinite' }}/>
          <span style={{ fontSize: 11, color: C.text2, fontWeight: 600 }}>Live Economic Data</span>
          <span style={{ fontSize: 10, color: C.text3 }}>Refresh each trading day · All times in EST</span>
        </div>
        <a href="https://www.myfxbook.com/economic-calendar" target="_blank" rel="noopener noreferrer"
           style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: C.blue, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.18)', textDecoration: 'none', transition: 'all 0.14s' }}>
          Full Live Calendar
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
      </div>
    </div>
  )
}
