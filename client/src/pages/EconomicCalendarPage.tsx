import React, { useState, useEffect, useCallback, useRef } from 'react'
import { fetchEconomicCalendar, fetchMacroNews, EconomicEvent, MacroNews } from '../api/news'

// ─── Types & constants ────────────────────────────────────────────────────────

type ImpactFilter = 'All' | 'High' | 'Medium' | 'Low'
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri'

const DAY_KEYS: DayKey[]             = ['mon', 'tue', 'wed', 'thu', 'fri']
const DAY_LABELS: Record<DayKey, string> = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri' }
const CURRENCIES = ['All','USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD']

const IMPACT_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#3b82f6', holiday: '#374151',
}
const IMPACT_BG: Record<string, string> = {
  high: 'rgba(239,68,68,0.1)', medium: 'rgba(245,158,11,0.1)', low: 'rgba(59,130,246,0.1)', holiday: 'transparent',
}
const IMPACT_BARS: Record<string, number> = { high: 3, medium: 2, low: 1, holiday: 0 }

const FLAG: Record<string, string> = {
  USD:'us', EUR:'eu', GBP:'gb', JPY:'jp',
  AUD:'au', CAD:'ca', CHF:'ch', NZD:'nz',
  CNY:'cn', HKD:'hk', SGD:'sg', KRW:'kr',
}

// ─── Static fallback ──────────────────────────────────────────────────────────

const STATIC_EVENTS: EconomicEvent[] = [
  { id:'s1',  currency:'USD', impact:'high',   title:'Non-Farm Payrolls',        time:'08:30', date:new Date().toISOString(), forecast:'200K',  previous:'151K',  actual:null, description:'Monthly change in employed non-farm workers, the most important US labor market indicator.', url:'' },
  { id:'s2',  currency:'USD', impact:'high',   title:'Unemployment Rate',        time:'08:30', date:new Date().toISOString(), forecast:'4.1%',  previous:'4.1%',  actual:null, description:'Percentage of total workforce that is unemployed and actively seeking employment.', url:'' },
  { id:'s3',  currency:'USD', impact:'medium', title:'ISM Manufacturing PMI',    time:'10:00', date:new Date().toISOString(), forecast:'49.5',  previous:'50.3',  actual:null, description:'Survey of purchasing managers in the manufacturing sector. Above 50 signals expansion.', url:'' },
  { id:'s4',  currency:'EUR', impact:'high',   title:'CPI Flash Estimate y/y',  time:'10:00', date:new Date().toISOString(), forecast:'2.2%',  previous:'2.3%',  actual:null, description:'Preliminary estimate of consumer price inflation in the eurozone.', url:'' },
  { id:'s5',  currency:'GBP', impact:'high',   title:'Bank of England Rate',     time:'12:00', date:new Date().toISOString(), forecast:'4.25%','previous':'4.50%',actual:null, description:'Bank of England Monetary Policy Committee interest rate decision.', url:'' },
  { id:'s6',  currency:'USD', impact:'high',   title:'FOMC Rate Decision',       time:'14:00', date:new Date().toISOString(), forecast:'4.50%','previous':'4.50%',actual:null, description:'Federal Open Market Committee interest rate announcement.', url:'' },
  { id:'s7',  currency:'CAD', impact:'medium', title:'Employment Change',        time:'08:30', date:new Date().toISOString(), forecast:'15.0K','previous':'1.1K', actual:null, description:'Monthly change in number of employed Canadian workers.', url:'' },
  { id:'s8',  currency:'JPY', impact:'low',    title:'Household Spending y/y',  time:'00:30', date:new Date().toISOString(), forecast:'-0.4%','previous':'-2.4%',actual:null, description:'Year-over-year change in Japanese household expenditure.', url:'' },
  { id:'s9',  currency:'AUD', impact:'medium', title:'RBA Rate Decision',        time:'04:30', date:new Date().toISOString(), forecast:'4.10%','previous':'4.35%',actual:null, description:'Reserve Bank of Australia official cash rate decision.', url:'' },
  { id:'s10', currency:'USD', impact:'medium', title:'Initial Jobless Claims',   time:'08:30', date:new Date().toISOString(), forecast:'228K', previous:'221K',  actual:null, description:'Weekly number of Americans filing for unemployment benefits for the first time.', url:'' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Flag({ currency, size = 20 }: { currency: string; size?: number }) {
  const code = FLAG[currency]
  if (!code) return (
    <svg width={size * 0.8} height={size * 0.8} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} style={{ opacity: 0.5, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>
  )
  return <img src={`https://flagcdn.com/${code}.svg`} width={size} height={Math.round(size * 0.67)}
              alt={currency} style={{ borderRadius: 3, objectFit: 'cover', display: 'block', flexShrink: 0 }}/>
}

function Bars({ impact, size = 14 }: { impact: string; size?: number }) {
  const filled = IMPACT_BARS[impact] ?? 0
  if (!filled) return null
  const color = IMPACT_COLOR[impact]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
      {[1, 2, 3].map(b => (
        <div key={b} style={{ width: 3, height: b === 1 ? size * 0.4 : b === 2 ? size * 0.7 : size, borderRadius: 2, background: b <= filled ? color : 'rgba(255,255,255,0.1)', boxShadow: b <= filled ? `0 0 4px ${color}88` : 'none' }}/>
      ))}
    </div>
  )
}

function parseNum(s: string) { const n = parseFloat(s.replace(/[^0-9.-]/g, '')); return isNaN(n) ? null : n }

function todayKey(): DayKey {
  const map: Record<number, DayKey> = { 1:'mon', 2:'tue', 3:'wed', 4:'thu', 5:'fri' }
  return map[new Date().getDay()] ?? 'mon'
}

function getWeekDates(): Record<DayKey, Date> {
  const now = new Date(), dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  const r = {} as Record<DayKey, Date>
  DAY_KEYS.forEach((k, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); r[k] = d })
  return r
}

function timeAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime()
    if (ms < 60_000)     return 'Just now'
    if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ago`
    if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
    return `${Math.floor(ms / 86_400_000)}d ago`
  } catch { return '' }
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const est = t.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'America/New_York' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'ec2-pulse 2s ease-in-out infinite' }}/>
      <span style={{ fontSize:12, fontFamily:'monospace', fontWeight:700, color:'#6b7280' }}>{est} EST</span>
    </div>
  )
}

// ─── Market movers horizontal scroll ─────────────────────────────────────────

function MarketMovers({ events, onTap }: { events: EconomicEvent[]; onTap: (e: EconomicEvent) => void }) {
  const high = events.filter(e => e.impact === 'high')
  if (!high.length) return null
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>Market Movers</span>
        <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>{high.length} high impact</span>
      </div>
      <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollbarWidth:'none' }}>
        {high.map(ev => {
          const color = IMPACT_COLOR[ev.impact]
          const gradients: Record<string, string> = {
            USD: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
            EUR: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            GBP: 'linear-gradient(135deg, #0f172a 0%, #1a1a2e 100%)',
            JPY: 'linear-gradient(135deg, #0f172a 0%, #1a0a0a 100%)',
            default: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
          }
          const bg = gradients[ev.currency] ?? gradients.default
          return (
            <button key={ev.id} onClick={() => onTap(ev)} style={{
              flexShrink:0, width:'calc(72vw - 16px)', maxWidth:280, minWidth:200,
              borderRadius:16, background:bg, border:`1px solid rgba(255,255,255,0.07)`,
              borderLeft:`4px solid ${color}`,
              padding:'16px 14px', textAlign:'left', cursor:'pointer',
              display:'flex', flexDirection:'column', gap:12,
            }}>
              {/* Top: flag + currency + time */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Flag currency={ev.currency} size={24}/>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800, color:'#fff' }}>{ev.currency}</div>
                    <div style={{ fontSize:10, color:'#4b5563' }}>{ev.time} EST</div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:6, background:IMPACT_BG[ev.impact] }}>
                  <Bars impact={ev.impact} size={11}/>
                  <span style={{ fontSize:9, fontWeight:800, color:color }}>HIGH</span>
                </div>
              </div>
              {/* Event name */}
              <p style={{ fontSize:14, fontWeight:700, color:'#fff', margin:0, lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {ev.title}
              </p>
              {/* Data row */}
              <div style={{ display:'flex', gap:12 }}>
                {[{l:'Forecast', v:ev.forecast}, {l:'Previous', v:ev.previous}].map(d => (
                  <div key={d.l}>
                    <div style={{ fontSize:9, color:'#374151', fontWeight:700, marginBottom:2 }}>{d.l}</div>
                    <div style={{ fontSize:13, fontFamily:'monospace', fontWeight:800, color: d.l === 'Forecast' ? '#fff' : '#6b7280' }}>{d.v}</div>
                  </div>
                ))}
                {ev.actual && (
                  <div style={{ marginLeft:'auto' }}>
                    <div style={{ fontSize:9, color:'#374151', fontWeight:700, marginBottom:2 }}>Actual</div>
                    <div style={{ fontSize:13, fontFamily:'monospace', fontWeight:900, color: (parseNum(ev.actual) ?? 0) >= (parseNum(ev.forecast) ?? 0) ? '#10b981' : '#ef4444' }}>{ev.actual}</div>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── All events timeline ──────────────────────────────────────────────────────

function EventTimeline({ events, onTap }: { events: EconomicEvent[]; onTap: (e: EconomicEvent) => void }) {
  if (!events.length) return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={1.3} style={{ margin:'0 auto 12px', display:'block' }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p style={{ fontSize:14, color:'#4b5563', margin:0 }}>No events match the filters</p>
    </div>
  )

  // Group by time
  const byTime: Record<string, EconomicEvent[]> = {}
  events.forEach(e => { if (!byTime[e.time]) byTime[e.time] = []; byTime[e.time].push(e) })
  const times = Object.keys(byTime).sort()

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>All Events</span>
        <span style={{ fontSize:12, fontWeight:700, color:'#374151' }}>{events.length} events</span>
      </div>

      {times.map(time => (
        <div key={time}>
          {/* Time divider */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:800, color:'#374151', flexShrink:0 }}>{time} <span style={{ fontSize:9, color:'#1f2937' }}>EST</span></span>
            <div style={{ flex:1, height:1, background:'#111' }}/>
          </div>

          {byTime[time].map(ev => {
            const color  = IMPACT_COLOR[ev.impact]
            const actualN = ev.actual ? parseNum(ev.actual) : null
            const fcastN  = parseNum(ev.forecast)
            const isBeat  = actualN !== null && fcastN !== null && actualN > fcastN
            const isMiss  = actualN !== null && fcastN !== null && actualN < fcastN

            return (
              <button key={ev.id} onClick={() => onTap(ev)} style={{
                width:'100%', display:'flex', alignItems:'center', gap:12,
                background:'#111', borderRadius:14, borderLeft:`4px solid ${color}`,
                border:`1px solid rgba(255,255,255,0.06)`, borderLeftColor:color,
                padding:'13px 14px', marginBottom:6, textAlign:'left', cursor:'pointer',
                transition:'background 0.12s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                onMouseLeave={e => (e.currentTarget.style.background = '#111')}
              >
                {/* Flag */}
                <Flag currency={ev.currency} size={22}/>

                {/* Content */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:4 }}>
                    {ev.title}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#4b5563' }}>{ev.currency}</span>
                    <span style={{ fontSize:10, color:'#1f2937' }}>·</span>
                    {ev.forecast !== '—' && <span style={{ fontSize:10, color:'#374151' }}>Fcst: <span style={{ color:'#6b7280', fontFamily:'monospace' }}>{ev.forecast}</span></span>}
                    {ev.previous !== '—' && <span style={{ fontSize:10, color:'#374151' }}>Prev: <span style={{ color:'#4b5563', fontFamily:'monospace' }}>{ev.previous}</span></span>}
                  </div>
                </div>

                {/* Right: impact + actual */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <Bars impact={ev.impact} size={12}/>
                  </div>
                  {ev.actual ? (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:12, fontFamily:'monospace', fontWeight:900, color: isBeat ? '#10b981' : isMiss ? '#ef4444' : '#fff', lineHeight:1 }}>{ev.actual}</div>
                      {(isBeat || isMiss) && <div style={{ fontSize:8, fontWeight:800, color: isBeat ? '#10b981' : '#ef4444' }}>{isBeat ? '▲BEAT' : '▼MISS'}</div>}
                    </div>
                  ) : (
                    <span style={{ fontSize:9, color:'#1f2937', fontStyle:'italic' }}>—</span>
                  )}
                </div>

                {/* Chevron */}
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2.5} style={{ flexShrink:0 }}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── Event detail bottom sheet ────────────────────────────────────────────────

function EventSheet({ event, relatedNews, onClose }: { event: EconomicEvent; relatedNews: MacroNews[]; onClose: () => void }) {
  const color   = IMPACT_COLOR[event.impact]
  const actualN = event.actual ? parseNum(event.actual) : null
  const fcastN  = parseNum(event.forecast)
  const isBeat  = actualN !== null && fcastN !== null && actualN > fcastN
  const isMiss  = actualN !== null && fcastN !== null && actualN < fcastN
  const touchY  = useRef(0)

  return (
    <div style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'flex-end', background:'rgba(0,0,0,0.75)' }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           onTouchStart={e => { touchY.current = e.touches[0].clientY }}
           onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) onClose() }}
           style={{ width:'100%', maxHeight:'90dvh', background:'#111', borderRadius:'20px 20px 0 0', overflow:'hidden', display:'flex', flexDirection:'column', animation:'ec2-slideUp 0.25s ease-out' }}>

        {/* Drag handle */}
        <div style={{ display:'flex', justifyContent:'center', paddingTop:10, flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#2d2d2d' }}/>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {/* Header gradient banner */}
          <div style={{ padding:'16px 18px 14px', background:`linear-gradient(135deg, ${color}18, transparent)`, borderBottom:'1px solid #1a1a1a' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <Flag currency={event.currency} size={26}/>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{event.currency}</div>
                <div style={{ fontSize:10, color:'#4b5563', fontFamily:'monospace' }}>{event.time} EST</div>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'4px 9px', borderRadius:8, background:IMPACT_BG[event.impact] }}>
                <Bars impact={event.impact} size={12}/>
                <span style={{ fontSize:10, fontWeight:800, color }}>{event.impact.toUpperCase()}</span>
              </div>
            </div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:0, lineHeight:1.3 }}>{event.title}</h2>
          </div>

          <div style={{ padding:'16px 18px' }}>
            {/* Data grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
              {[
                { l:'Forecast', v:event.forecast, c:'#fff' },
                { l:'Previous', v:event.previous, c:'#6b7280' },
                { l:'Actual',   v:event.actual ?? 'Pending', c: event.actual ? (isBeat ? '#10b981' : isMiss ? '#ef4444' : '#fff') : '#374151' },
              ].map(col => (
                <div key={col.l} style={{ background:'#1a1a1a', borderRadius:12, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'#374151', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{col.l}</div>
                  <div style={{ fontSize:16, fontFamily:'monospace', fontWeight:900, color:col.c, lineHeight:1 }}>{col.v}</div>
                  {col.l === 'Actual' && (isBeat || isMiss) && event.actual && (
                    <div style={{ fontSize:9, fontWeight:800, color: isBeat ? '#10b981' : '#ef4444', marginTop:3 }}>{isBeat ? '▲ BEAT' : '▼ MISS'}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Description */}
            {event.description && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, color:'#374151', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>About This Release</div>
                <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.65, margin:0 }}>{event.description}</p>
              </div>
            )}

            {/* Related news */}
            {relatedNews.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:10, color:'#374151', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Related News</div>
                {relatedNews.map(n => (
                  <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                    display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
                    background:'#1a1a1a', borderRadius:10, marginBottom:6, textDecoration:'none', border:'1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'#fff', margin:'0 0 4px', lineHeight:1.4 }}>{n.title}</p>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ fontSize:10, color:'#374151' }}>{n.source}</span>
                        <span style={{ fontSize:10, color:'#1f2937' }}>·</span>
                        <span style={{ fontSize:10, color:'#374151' }}>{timeAgo(n.publishedAt)}</span>
                      </div>
                    </div>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2.5} style={{ flexShrink:0, marginTop:3 }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                  </a>
                ))}
              </div>
            )}

            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer" style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'12px 0', borderRadius:12, textDecoration:'none',
                background:`${color}12`, border:`1px solid ${color}30`, color, fontSize:13, fontWeight:700, marginBottom:4,
              }}>
                View on Forex Factory
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            )}
          </div>
        </div>

        {/* Close button */}
        <div style={{ padding:'10px 18px 28px', borderTop:'1px solid #1a1a1a', flexShrink:0 }}>
          <button onClick={onClose} style={{ width:'100%', padding:'13px 0', borderRadius:14, background:'#1a1a1a', border:'1px solid #2d2d2d', color:'#6b7280', fontSize:14, fontWeight:700, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EconomicCalendarPage() {
  const weekDates = getWeekDates()
  const [events,       setEvents]       = useState<EconomicEvent[]>([])
  const [news,         setNews]         = useState<MacroNews[]>([])
  const [loading,      setLoading]      = useState(true)
  const [cached,       setCached]       = useState(false)
  const [activeDay,    setActiveDay]    = useState<DayKey>(todayKey())
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('All')
  const [currFilter,   setCurrFilter]   = useState('All')
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<EconomicEvent | null>(null)
  const [lastUpd,      setLastUpd]      = useState<Date | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEconomicCalendar()
      if (data.length) { setEvents(data); setCached(false) } else { setEvents(STATIC_EVENTS); setCached(true) }
      setLastUpd(new Date())
    } catch {
      setEvents(STATIC_EVENTS); setCached(true)
    } finally { setLoading(false) }
  }, [])

  const loadNews = useCallback(async () => {
    try { const d = await fetchMacroNews(); if (d.length) setNews(d) } catch { /* keep */ }
  }, [])

  useEffect(() => {
    loadEvents(); loadNews()
    const e = setInterval(loadEvents, 5 * 60_000)
    const n = setInterval(loadNews,  10 * 60_000)
    return () => { clearInterval(e); clearInterval(n) }
  }, [loadEvents, loadNews])

  // Assign each event a day key based on its date
  const eventsWithDay = events.map(ev => {
    const dow = new Date(ev.date).getDay()
    const map: Record<number, DayKey> = { 1:'mon', 2:'tue', 3:'wed', 4:'thu', 5:'fri' }
    return { ...ev, dayKey: map[dow] ?? 'mon' }
  })

  const dayEvents = eventsWithDay.filter(e => e.dayKey === activeDay)

  const filtered = dayEvents.filter(e => {
    if (impactFilter !== 'All' && e.impact !== impactFilter.toLowerCase()) return false
    if (currFilter !== 'All' && e.currency !== currFilter) return false
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const relatedNews = selected
    ? news.filter(n =>
        n.title.toLowerCase().includes(selected.currency.toLowerCase()) ||
        selected.title.toLowerCase().split(' ').some(w => w.length > 4 && n.title.toLowerCase().includes(w))
      ).slice(0, 5)
    : []

  const fmtDayLabel = (k: DayKey) => {
    const d = weekDates[k]
    return d.toLocaleDateString('en-US', { month:'short', day:'numeric' })
  }

  const today = todayKey()
  const highTotal  = dayEvents.filter(e => e.impact === 'high').length
  const medTotal   = dayEvents.filter(e => e.impact === 'medium').length

  return (
    <div style={{ background:'#000', minHeight:'100%', paddingBottom:40 }}>
      <style>{`
        @keyframes ec2-pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ec2-slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes ec2-spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar { display:none }
      `}</style>

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div style={{ position:'sticky', top:0, zIndex:20, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', padding:'12px 16px 0' }}>

        {/* Title row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ fontSize:17, fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>Economic Calendar</span>
            {cached && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(245,158,11,0.12)', color:'#f59e0b', border:'1px solid rgba(245,158,11,0.2)' }}>CACHED</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <LiveClock/>
            <button onClick={() => { loadEvents(); loadNews() }} style={{ width:28, height:28, borderRadius:8, background:'#1a1a1a', border:'1px solid #2d2d2d', color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h5M20 20v-5h-5M4.07 15A9 9 0 1020 12"/></svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, background:'#1a1a1a', borderRadius:12, padding:'10px 14px', marginBottom:10, border:'1px solid #222' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events..."
                 style={{ flex:1, background:'none', border:'none', outline:'none', color:'#fff', fontSize:14 }}/>
          {loading && <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid #2d2d2d', borderTopColor:'#6b7280', animation:'ec2-spin 0.7s linear infinite', flexShrink:0 }}/>}
          {lastUpd && !loading && <span style={{ fontSize:9, color:'#2d2d2d', flexShrink:0 }}>{lastUpd.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
        </div>

        {/* Day pills */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:10, scrollbarWidth:'none' }}>
          {DAY_KEYS.map(k => {
            const isActive = activeDay === k
            const isToday  = today === k
            const cnt      = eventsWithDay.filter(e => e.dayKey === k).length
            return (
              <button key={k} onClick={() => { setActiveDay(k); setImpactFilter('All'); setCurrFilter('All') }} style={{
                flexShrink:0, padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', border:'none', transition:'all 0.15s',
                background: isActive ? '#fff' : '#1a1a1a',
                color:      isActive ? '#000' : '#6b7280',
                position:'relative',
              }}>
                {DAY_LABELS[k]}
                <span style={{ marginLeft:4, fontSize:10, color: isActive ? '#374151' : '#374151' }}>·{cnt}</span>
                {isToday && !isActive && <div style={{ position:'absolute', top:4, right:4, width:5, height:5, borderRadius:'50%', background:'#0ea5e9' }}/>}
              </button>
            )
          })}
        </div>

        {/* Impact + count summary pills */}
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:10, scrollbarWidth:'none' }}>
          {([
            ['All',    '#fff',     '',         dayEvents.length],
            ['High',   '#ef4444',  '#ef444420', highTotal],
            ['Medium', '#f59e0b',  '#f59e0b20', medTotal],
            ['Low',    '#3b82f6',  '#3b82f620', dayEvents.filter(e=>e.impact==='low').length],
          ] as const).map(([label, activeColor, activeBg, cnt]) => {
            const isActive = impactFilter === label
            return (
              <button key={label} onClick={() => setImpactFilter(label as ImpactFilter)} style={{
                flexShrink:0, display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20, cursor:'pointer', border:'none', transition:'all 0.15s',
                background: isActive ? (label === 'All' ? '#fff' : activeBg) : '#1a1a1a',
                color:      isActive ? (label === 'All' ? '#000' : activeColor) : '#6b7280',
              }}>
                {label !== 'All' && <div style={{ width:6, height:6, borderRadius:'50%', background: isActive ? activeColor : '#374151' }}/>}
                <span style={{ fontSize:12, fontWeight:700 }}>{label}</span>
                <span style={{ fontSize:11, color: isActive ? (label==='All' ? '#374151' : activeColor) : '#374151' }}>{cnt}</span>
              </button>
            )
          })}
        </div>

        {/* Currency pills */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:12, scrollbarWidth:'none' }}>
          {CURRENCIES.map(cur => {
            const isActive = currFilter === cur
            return (
              <button key={cur} onClick={() => setCurrFilter(cur)} style={{
                flexShrink:0, display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:18, cursor:'pointer', border:'none', transition:'all 0.15s',
                background: isActive ? '#fff' : '#1a1a1a',
                color:      isActive ? '#000' : '#6b7280',
                fontSize:11, fontWeight:700,
              }}>
                {cur !== 'All' && <Flag currency={cur} size={13}/>}
                {cur}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ padding:'16px 16px 0' }}>
        {loading && events.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', paddingTop:80, gap:16 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid #1f1f1f', borderTopColor:'#fff', animation:'ec2-spin 0.8s linear infinite' }}/>
            <p style={{ fontSize:14, color:'#4b5563', margin:0 }}>Loading calendar events…</p>
          </div>
        ) : (
          <>
            {/* Market movers (high impact only, no text filter applied) */}
            <MarketMovers events={dayEvents.filter(e => currFilter === 'All' || e.currency === currFilter)} onTap={setSelected}/>

            {/* Full timeline */}
            <EventTimeline events={filtered} onTap={setSelected}/>

            {/* Date label */}
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:4, borderTop:'1px solid #111' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', animation:'ec2-pulse 2s infinite' }}/>
              <span style={{ fontSize:10, color:'#1f2937' }}>
                {weekDates[activeDay].toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })} · Events from Forex Factory · Refreshes every 5 min
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Event detail bottom sheet ────────────────────────────────────── */}
      {selected && <EventSheet event={selected} relatedNews={relatedNews} onClose={() => setSelected(null)}/>}
    </div>
  )
}
