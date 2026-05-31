import React, { useState, useEffect, useCallback, useRef } from 'react'
import { fetchEconomicCalendar, fetchMacroNews, EconomicEvent, MacroNews } from '../api/news'

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
  high:     '#ef4444',  highBg:   'rgba(239,68,68,0.1)',
  medium:   '#f59e0b',  mediumBg: 'rgba(245,158,11,0.1)',
  low:      '#3b82f6',  lowBg:    'rgba(59,130,246,0.1)',
  blue:     '#0ea5e9',
  green:    '#10b981',
  red:      '#ef4444',
  violet:   '#8b5cf6',
  amber:    '#f59e0b',
}

const IMPACT_CFG = {
  high:    { color: C.high,   bg: C.highBg,   label: 'HIGH',    bars: 3 },
  medium:  { color: C.medium, bg: C.mediumBg, label: 'MED',     bars: 2 },
  low:     { color: C.low,    bg: C.lowBg,    label: 'LOW',     bars: 1 },
  holiday: { color: C.text3,  bg: 'transparent', label: 'HOLIDAY', bars: 0 },
}

const CAT_CFG: Record<string, { color: string; label: string }> = {
  'central-banks': { color: C.violet,  label: 'Central Banks' },
  'inflation':     { color: C.red,     label: 'Inflation'     },
  'employment':    { color: C.green,   label: 'Employment'    },
  'gdp':           { color: C.blue,    label: 'GDP / Growth'  },
  'manufacturing': { color: C.amber,   label: 'Manufacturing' },
  'commodities':   { color: '#f97316', label: 'Commodities'   },
  'trade':         { color: '#06b6d4', label: 'Trade'         },
  'markets':       { color: '#a78bfa', label: 'Markets'       },
  'general':       { color: C.text2,   label: 'General'       },
}

const FLAG: Record<string, string> = {
  USD:'us', EUR:'eu', GBP:'gb', JPY:'jp',
  AUD:'au', CAD:'ca', CHF:'ch', NZD:'nz',
  CNY:'cn', HKD:'hk', SGD:'sg', KRW:'kr',
  SEK:'se', NOK:'no', DKK:'dk', PLN:'pl',
}

// ─── Static fallback data (used when API is unavailable) ─────────────────────

const STATIC_EVENTS: EconomicEvent[] = [
  { id:'s1',  currency:'USD', impact:'high',   title:'Non-Farm Payrolls',          time:'08:30', date: new Date().toISOString(), forecast:'200K',  previous:'151K',  actual:null, description:'Monthly change in employed non-farm workers, the most important US labor market indicator.', url:'' },
  { id:'s2',  currency:'USD', impact:'high',   title:'Unemployment Rate',          time:'08:30', date: new Date().toISOString(), forecast:'4.1%',  previous:'4.1%',  actual:null, description:'Percentage of total workforce that is unemployed and actively seeking employment.', url:'' },
  { id:'s3',  currency:'USD', impact:'medium', title:'ISM Manufacturing PMI',      time:'10:00', date: new Date().toISOString(), forecast:'49.5',  previous:'50.3',  actual:null, description:'Survey of purchasing managers in the manufacturing sector. Above 50 signals expansion.', url:'' },
  { id:'s4',  currency:'EUR', impact:'high',   title:'CPI Flash Estimate y/y',    time:'10:00', date: new Date().toISOString(), forecast:'2.2%',  previous:'2.3%',  actual:null, description:'Preliminary estimate of consumer price inflation in the eurozone.', url:'' },
  { id:'s5',  currency:'GBP', impact:'high',   title:'Bank of England Rate',       time:'12:00', date: new Date().toISOString(), forecast:'4.25%','previous':'4.50%',actual:null, description:'Bank of England Monetary Policy Committee interest rate decision.', url:'' },
  { id:'s6',  currency:'USD', impact:'high',   title:'FOMC Rate Decision',         time:'14:00', date: new Date().toISOString(), forecast:'4.50%','previous':'4.50%',actual:null, description:'Federal Open Market Committee interest rate announcement.', url:'' },
  { id:'s7',  currency:'CAD', impact:'medium', title:'Employment Change',          time:'08:30', date: new Date().toISOString(), forecast:'15.0K','previous':'1.1K', actual:null, description:'Monthly change in number of employed Canadian workers.', url:'' },
  { id:'s8',  currency:'JPY', impact:'low',    title:'Household Spending y/y',    time:'00:30', date: new Date().toISOString(), forecast:'-0.4%','previous':'-2.4%',actual:null, description:'Year-over-year change in Japanese household expenditure.', url:'' },
  { id:'s9',  currency:'AUD', impact:'medium', title:'RBA Rate Decision',          time:'04:30', date: new Date().toISOString(), forecast:'4.10%', previous:'4.35%', actual:null, description:'Reserve Bank of Australia official cash rate decision.', url:'' },
  { id:'s10', currency:'USD', impact:'medium', title:'Initial Jobless Claims',     time:'08:30', date: new Date().toISOString(), forecast:'228K', previous:'221K',  actual:null, description:'Weekly number of Americans filing for unemployment benefits for the first time.', url:'' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Flag({ currency, size = 18 }: { currency: string; size?: number }) {
  const code = FLAG[currency]
  if (!code) return <span style={{ fontSize: size * 0.65, flexShrink: 0 }}>🌐</span>
  return <img src={`https://flagcdn.com/${code}.svg`} width={size} height={Math.round(size * 0.67)}
              alt={currency} style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0, display: 'block' }}/>
}

function ImpactBars({ level, size = 14 }: { level: EconomicEvent['impact']; size?: number }) {
  const cfg = IMPACT_CFG[level]
  if (cfg.bars === 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
      {[1, 2, 3].map(bar => (
        <div key={bar} style={{
          width: 3, height: bar === 1 ? size * 0.45 : bar === 2 ? size * 0.7 : size,
          borderRadius: 2,
          background: bar <= cfg.bars ? cfg.color : 'rgba(255,255,255,0.1)',
          boxShadow: bar <= cfg.bars ? `0 0 4px ${cfg.color}88` : 'none',
        }}/>
      ))}
    </div>
  )
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

function sentimentGlyph(label: string): string {
  if (label === 'bullish') return '↑'
  if (label === 'bearish') return '↓'
  return '→'
}
function sentimentColor(label: string): string {
  if (label === 'bullish') return C.green
  if (label === 'bearish') return C.red
  return C.text2
}

// ─── Live clock ───────────────────────────────────────────────────────────────

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const est = t.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone:'America/New_York' })
  const gmt = t.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'UTC' })
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontSize:15, fontFamily:'monospace', fontWeight:800, color:C.text1, letterSpacing:'0.06em', lineHeight:1 }}>{est}</div>
        <div style={{ fontSize:9, color:C.text3, letterSpacing:'0.07em', marginTop:2 }}>NEW YORK EST</div>
      </div>
      <div style={{ width:1, height:26, background:C.border2 }}/>
      <div>
        <div style={{ fontSize:12, fontFamily:'monospace', fontWeight:700, color:C.text2 }}>{gmt}</div>
        <div style={{ fontSize:9, color:C.text3, letterSpacing:'0.07em', marginTop:2 }}>GMT</div>
      </div>
    </div>
  )
}

// ─── Market sessions ─────────────────────────────────────────────────────────

function SessionBadge() {
  const [hour, setHour] = useState(new Date().getUTCHours())
  useEffect(() => { const id = setInterval(() => setHour(new Date().getUTCHours()), 60_000); return () => clearInterval(id) }, [])
  const sessions = [
    { label:'Sydney',   open:22, close:7,  color:'#8b5cf6' },
    { label:'Tokyo',    open:0,  close:9,  color:'#06b6d4' },
    { label:'London',   open:8,  close:17, color:C.blue    },
    { label:'New York', open:13, close:22, color:C.green   },
  ]
  const active = sessions.filter(s => s.open < s.close ? hour >= s.open && hour < s.close : hour >= s.open || hour < s.close)
  if (!active.length) return null
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
      {active.map(s => (
        <span key={s.label} style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:10, background:`${s.color}18`, color:s.color, border:`1px solid ${s.color}35`, display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:s.color, animation:'ec-pulse 2s ease-in-out infinite', flexShrink:0 }}/>
          {s.label}
        </span>
      ))}
    </div>
  )
}

// ─── News detail side panel ───────────────────────────────────────────────────

function NewsDetailPanel({ article, onClose }: { article: MacroNews; onClose: () => void }) {
  const cat = CAT_CFG[article.category] ?? CAT_CFG.general
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      display:'flex', justifyContent:'flex-end',
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'min(480px, 100%)', height:'100%', background:C.surface,
        borderLeft:`1px solid ${C.border2}`,
        boxShadow:'-8px 0 40px rgba(0,0,0,0.5)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        animation:'ec-slideIn 0.22s ease-out',
      }}>
        {/* Panel header */}
        <div style={{ padding:'16px 18px', borderBottom:`1px solid ${C.border}`, flexShrink:0, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, background:`linear-gradient(135deg, ${cat.color}08, transparent)` }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <span style={{ fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:5, background:`${cat.color}18`, color:cat.color, letterSpacing:'0.07em', textTransform:'uppercase' }}>{cat.label}</span>
              <span style={{ fontSize:9, color:C.text3 }}>·</span>
              <span style={{ fontSize:9, color:C.text3, fontFamily:'monospace' }}>{article.source}</span>
              <span style={{ fontSize:9, color:C.text3 }}>·</span>
              <span style={{ fontSize:9, color:C.text3 }}>{timeAgo(article.publishedAt)}</span>
            </div>
            <h2 style={{ fontSize:14, fontWeight:700, color:C.text1, margin:0, lineHeight:1.4 }}>{article.title}</h2>
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, color:C.text2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Metadata */}
        <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:C.surface2, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Source</div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>{article.source}</div>
            </div>
            <div style={{ background:C.surface2, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Published</div>
              <div style={{ fontSize:12, fontWeight:700, color:C.text1 }}>
                {new Date(article.publishedAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
            <div style={{ background:C.surface2, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Sentiment</div>
              <div style={{ fontSize:12, fontWeight:800, color:sentimentColor(article.label), fontFamily:'monospace' }}>
                {sentimentGlyph(article.label)} {article.label.charAt(0).toUpperCase() + article.label.slice(1)}
              </div>
            </div>
            <div style={{ background:C.surface2, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Category</div>
              <div style={{ fontSize:12, fontWeight:700, color:cat.color }}>{cat.label}</div>
            </div>
          </div>
        </div>

        {/* Sentiment bar */}
        <div style={{ padding:'12px 18px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Market Sentiment Score</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:10, color:C.red, fontWeight:700 }}>Bearish</span>
            <div style={{ flex:1, height:6, borderRadius:3, background:'rgba(255,255,255,0.06)', position:'relative', overflow:'hidden' }}>
              <div style={{
                position:'absolute', top:0, height:'100%', borderRadius:3,
                background: article.sentiment >= 0 ? C.green : C.red,
                width:`${Math.abs(article.sentiment) * 50}%`,
                left: article.sentiment >= 0 ? '50%' : `${50 - Math.abs(article.sentiment) * 50}%`,
                transition:'all 0.4s',
              }}/>
              <div style={{ position:'absolute', left:'50%', top:0, width:1, height:'100%', background:'rgba(255,255,255,0.15)' }}/>
            </div>
            <span style={{ fontSize:10, color:C.green, fontWeight:700 }}>Bullish</span>
          </div>
          <div style={{ textAlign:'center', fontSize:11, fontFamily:'monospace', fontWeight:700, color:sentimentColor(article.label), marginTop:4 }}>
            {article.sentiment >= 0 ? '+' : ''}{(article.sentiment * 100).toFixed(0)} / 100
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding:'16px 18px', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ fontSize:11, color:C.text2, lineHeight:1.6, margin:0 }}>
            Click the button below to read the full article on {article.source}'s website. Articles may require a subscription depending on the publisher.
          </p>
          <a href={article.url} target="_blank" rel="noopener noreferrer" style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'13px 0', borderRadius:12, textDecoration:'none',
            background:`linear-gradient(135deg, ${cat.color}20, ${cat.color}10)`,
            border:`1px solid ${cat.color}40`, color:cat.color,
            fontSize:13, fontWeight:800, transition:'all 0.15s',
          }}>
            Read Full Article
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
          <button onClick={onClose} style={{ padding:'10px 0', borderRadius:12, background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, color:C.text2, fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Event detail panel ───────────────────────────────────────────────────────

function EventDetailPanel({ event, relatedNews, onClose }: { event: EconomicEvent; relatedNews: MacroNews[]; onClose: () => void; }) {
  const cfg = IMPACT_CFG[event.impact]
  const parseNum = (s: string) => { const n = parseFloat(s.replace(/[^0-9.-]/g, '')); return isNaN(n) ? null : n }
  const actualN = event.actual ? parseNum(event.actual) : null
  const forecastN = parseNum(event.forecast)
  const isBeat = actualN !== null && forecastN !== null && actualN > forecastN
  const isMiss = actualN !== null && forecastN !== null && actualN < forecastN

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', justifyContent:'flex-end', background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'min(520px, 100%)', height:'100%', background:C.surface,
        borderLeft:`1px solid ${C.border2}`,
        boxShadow:'-8px 0 40px rgba(0,0,0,0.5)',
        display:'flex', flexDirection:'column', overflow:'hidden',
        animation:'ec-slideIn 0.22s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding:'16px 18px', borderBottom:`1px solid ${C.border}`, flexShrink:0, background:`linear-gradient(135deg, ${cfg.color}08, transparent)` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                <Flag currency={event.currency} size={20}/>
                <span style={{ fontSize:12, fontWeight:800, color:C.text1 }}>{event.currency}</span>
                <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 8px', borderRadius:6, background:cfg.bg }}>
                  <ImpactBars level={event.impact} size={11}/>
                  <span style={{ fontSize:9, fontWeight:800, color:cfg.color }}>{cfg.label}</span>
                </div>
                <span style={{ fontSize:10, fontFamily:'monospace', color:C.text2 }}>{event.time} EST</span>
              </div>
              <h2 style={{ fontSize:15, fontWeight:800, color:C.text1, margin:0, lineHeight:1.3 }}>{event.title}</h2>
            </div>
            <button onClick={onClose} style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.06)', border:`1px solid ${C.border}`, color:C.text2, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {/* Data grid */}
          <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { label:'Forecast', value:event.forecast, color:C.text1, note:'' },
                { label:'Previous', value:event.previous, color:C.text2, note:'' },
                { label:'Actual',   value:event.actual ?? 'Pending',
                  color: event.actual ? (isBeat ? C.green : isMiss ? C.red : C.text1) : C.text3,
                  note: event.actual && (isBeat || isMiss) ? (isBeat ? '▲ BEAT' : '▼ MISS') : '' },
              ].map(col => (
                <div key={col.label} style={{ background:C.surface2, borderRadius:10, padding:'10px 12px', border:`1px solid ${C.border}` }}>
                  <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>{col.label}</div>
                  <div style={{ fontSize:15, fontFamily:'monospace', fontWeight:900, color:col.color, lineHeight:1 }}>{col.value}</div>
                  {col.note && <div style={{ fontSize:9, fontWeight:800, color:col.color, marginTop:3 }}>{col.note}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>About This Release</div>
              <p style={{ fontSize:12, color:C.text2, lineHeight:1.7, margin:0 }}>{event.description}</p>
            </div>
          )}

          {/* Related news */}
          {relatedNews.length > 0 && (
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Related News ({relatedNews.length})</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {relatedNews.map(n => (
                  <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" style={{
                    display:'block', padding:'10px 12px', borderRadius:10,
                    background:C.surface2, border:`1px solid ${C.border}`,
                    textDecoration:'none', transition:'all 0.13s',
                  }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:600, color:C.text1, margin:'0 0 4px', lineHeight:1.4 }}>{n.title}</p>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:9, color:C.text3 }}>{n.source}</span>
                          <span style={{ fontSize:9, color:C.text3 }}>·</span>
                          <span style={{ fontSize:9, color:C.text3 }}>{timeAgo(n.publishedAt)}</span>
                          <span style={{ fontSize:9, fontWeight:700, color:sentimentColor(n.label) }}>{sentimentGlyph(n.label)}</span>
                        </div>
                      </div>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke={C.text3} strokeWidth={2} style={{ flexShrink:0, marginTop:3 }}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {event.url && (
            <div style={{ padding:'0 18px 18px' }}>
              <a href={event.url} target="_blank" rel="noopener noreferrer" style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'11px 0', borderRadius:10, textDecoration:'none',
                background:`${cfg.color}12`, border:`1px solid ${cfg.color}30`, color:cfg.color,
                fontSize:12, fontWeight:700,
              }}>
                View on Forex Factory
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── News card ────────────────────────────────────────────────────────────────

function NewsCard({ article, onClick }: { article: MacroNews; onClick: () => void }) {
  const cat = CAT_CFG[article.category] ?? CAT_CFG.general
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:'10px 12px', borderRadius:10, cursor:'pointer',
        background: hov ? `${cat.color}07` : 'rgba(255,255,255,0.02)',
        border:`1px solid ${hov ? cat.color + '30' : C.border}`,
        borderLeft:`3px solid ${cat.color}`,
        transition:'all 0.14s', marginBottom:4,
      }}
    >
      <p style={{ fontSize:12, fontWeight:600, color:C.text1, margin:'0 0 5px', lineHeight:1.4 }}>{article.title}</p>
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:`${cat.color}15`, color:cat.color }}>{cat.label}</span>
        <span style={{ fontSize:9, color:C.text3 }}>{article.source}</span>
        <span style={{ fontSize:9, color:C.text3 }}>·</span>
        <span style={{ fontSize:9, color:C.text3 }}>{timeAgo(article.publishedAt)}</span>
        <span style={{ fontSize:9, fontWeight:700, color:sentimentColor(article.label), marginLeft:'auto' }}>{sentimentGlyph(article.label)} {article.label}</span>
      </div>
    </div>
  )
}

// ─── Event row (desktop) ─────────────────────────────────────────────────────

function EventRow({ event, idx, onClick }: { event: EconomicEvent; idx: number; onClick: () => void }) {
  const cfg = IMPACT_CFG[event.impact]
  const [hov, setHov] = useState(false)
  const parseNum = (s: string) => { const n = parseFloat(s.replace(/[^0-9.-]/g,'')); return isNaN(n) ? null : n }
  const actualN   = event.actual ? parseNum(event.actual) : null
  const forecastN = parseNum(event.forecast)
  const isBeat    = actualN !== null && forecastN !== null && actualN > forecastN
  const isMiss    = actualN !== null && forecastN !== null && actualN < forecastN

  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      display:'grid', gridTemplateColumns:'68px 88px 76px 1fr 88px 88px 100px',
      alignItems:'center',
      background: hov ? 'rgba(14,165,233,0.04)' : idx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
      borderBottom:`1px solid ${C.border}`,
      borderLeft:`3px solid ${cfg.color}`,
      cursor:'pointer', transition:'background 0.12s',
    }}>
      <div style={{ padding:'11px 10px' }}>
        <div style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:C.text2 }}>{event.time}</div>
        <div style={{ fontSize:8, color:C.text3, marginTop:1 }}>EST</div>
      </div>
      <div style={{ padding:'11px 10px', display:'flex', alignItems:'center', gap:6, borderLeft:`1px solid rgba(255,255,255,0.04)` }}>
        <Flag currency={event.currency} size={16}/>
        <span style={{ fontSize:11, fontWeight:700, color:C.text1 }}>{event.currency}</span>
      </div>
      <div style={{ padding:'11px 10px', display:'flex', alignItems:'center', gap:5, borderLeft:`1px solid rgba(255,255,255,0.04)` }}>
        <ImpactBars level={event.impact} size={12}/>
        <span style={{ fontSize:9, fontWeight:800, color:cfg.color }}>{cfg.label}</span>
      </div>
      <div style={{ padding:'11px 14px', borderLeft:`1px solid rgba(255,255,255,0.04)` }}>
        <div style={{ fontSize:12, fontWeight:600, color:C.text1, lineHeight:1.3 }}>{event.title}</div>
      </div>
      <div style={{ padding:'11px 10px', textAlign:'right', borderLeft:`1px solid rgba(255,255,255,0.04)` }}>
        <span style={{ fontSize:11, fontFamily:'monospace', color:C.text2 }}>{event.forecast}</span>
      </div>
      <div style={{ padding:'11px 10px', textAlign:'right', borderLeft:`1px solid rgba(255,255,255,0.04)` }}>
        <span style={{ fontSize:11, fontFamily:'monospace', color:C.text3 }}>{event.previous}</span>
      </div>
      <div style={{ padding:'11px 10px', textAlign:'right', borderLeft:`1px solid rgba(255,255,255,0.04)` }}>
        {event.actual ? (
          <div>
            <div style={{ fontSize:12, fontFamily:'monospace', fontWeight:800, color:isBeat ? C.green : isMiss ? C.red : C.text1 }}>{event.actual}</div>
            {(isBeat || isMiss) && (
              <div style={{ fontSize:8, fontWeight:800, color:isBeat ? C.green : C.red, padding:'1px 4px', borderRadius:3, background:isBeat ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', marginTop:2, display:'inline-block' }}>
                {isBeat ? '▲ BEAT' : '▼ MISS'}
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize:10, color:C.text3, fontStyle:'italic' }}>Pending</span>
        )}
      </div>
    </div>
  )
}

// ─── Event card (mobile) ──────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: EconomicEvent; onClick: () => void }) {
  const cfg = IMPACT_CFG[event.impact]
  return (
    <div onClick={onClick} style={{
      borderRadius:12, padding:'11px 13px', cursor:'pointer',
      background:C.surface, border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${cfg.color}`, marginBottom:5,
      transition:'all 0.15s',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ minWidth:44, textAlign:'center', flexShrink:0 }}>
          <div style={{ fontSize:11, fontFamily:'monospace', fontWeight:800, color:C.text1 }}>{event.time}</div>
          <div style={{ fontSize:8, color:C.text3 }}>EST</div>
        </div>
        <div style={{ width:1, height:28, background:C.border2, flexShrink:0 }}/>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <Flag currency={event.currency} size={16}/>
          <span style={{ fontSize:10, fontWeight:700, color:C.text2 }}>{event.currency}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.text1, lineHeight:1.3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{event.title}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
          <ImpactBars level={event.impact} size={10}/>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke={C.text3} strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
      {event.actual && (
        <div style={{ display:'flex', gap:8, marginTop:7, paddingTop:7, borderTop:`1px solid ${C.border}` }}>
          {[{l:'Fcst', v:event.forecast, c:C.text2},{l:'Prev', v:event.previous, c:C.text3},{l:'Act', v:event.actual, c:C.green}].map(x => (
            <div key={x.l} style={{ flex:1, background:C.surface2, borderRadius:6, padding:'5px 8px', textAlign:'center' }}>
              <div style={{ fontSize:8, color:C.text3, fontWeight:700, marginBottom:2 }}>{x.l}</div>
              <div style={{ fontSize:11, fontFamily:'monospace', fontWeight:800, color:x.c }}>{x.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabKey = 'events' | 'news'

export default function EconomicCalendarPage() {
  const [events,       setEvents]       = useState<EconomicEvent[]>([])
  const [news,         setNews]         = useState<MacroNews[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [newsLoading,  setNewsLoading]  = useState(true)
  const [eventsError,  setEventsError]  = useState(false)
  const [impactFilter, setImpactFilter] = useState<'all' | EconomicEvent['impact']>('all')
  const [currencyFilter, setCurrencyFilter] = useState('All')
  const [newsCategory, setNewsCategory] = useState('all')
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null)
  const [selectedArticle, setSelectedArticle] = useState<MacroNews | null>(null)
  const [mobileTab,    setMobileTab]    = useState<TabKey>('events')
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 900)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEconomicCalendar()
      setEvents(data.length > 0 ? data : STATIC_EVENTS)
      setEventsError(false)
    } catch {
      setEvents(STATIC_EVENTS)
      setEventsError(true)
    } finally {
      setEventsLoading(false)
      setLastRefreshed(new Date())
    }
  }, [])

  const loadNews = useCallback(async () => {
    try {
      const data = await fetchMacroNews()
      if (data.length > 0) setNews(data)
    } catch { /* keep stale */ } finally {
      setNewsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
    loadNews()
    // Refresh events every 5 minutes, news every 10 minutes
    const evId = setInterval(loadEvents, 5 * 60_000)
    const nwId = setInterval(loadNews,  10 * 60_000)
    return () => { clearInterval(evId); clearInterval(nwId) }
  }, [loadEvents, loadNews])

  const CURRENCIES = ['All','USD','EUR','GBP','JPY','AUD','CAD','CHF','NZD']
  const NEWS_CATS   = ['all','central-banks','inflation','employment','gdp','manufacturing','markets','commodities','trade']

  // Group events by day of week
  const grouped: Record<string, EconomicEvent[]> = {}
  events.forEach(e => {
    const d   = new Date(e.date)
    const key = d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(e)
  })
  const sortedDays = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  // Filter events
  const filteredGroups: Record<string, EconomicEvent[]> = {}
  sortedDays.forEach(day => {
    const evs = grouped[day].filter(e => {
      if (impactFilter !== 'all' && e.impact !== impactFilter) return false
      if (currencyFilter !== 'All' && e.currency !== currencyFilter) return false
      return true
    })
    if (evs.length > 0) filteredGroups[day] = evs
  })
  const filteredDays = Object.keys(filteredGroups)

  // Filter news
  const filteredNews = newsCategory === 'all' ? news : news.filter(n => n.category === newsCategory)

  // Related news for selected event
  const relatedNews = selectedEvent
    ? news.filter(n =>
        n.title.toLowerCase().includes(selectedEvent.currency.toLowerCase()) ||
        selectedEvent.title.toLowerCase().split(' ').some(w => w.length > 4 && n.title.toLowerCase().includes(w))
      ).slice(0, 6)
    : []

  const totalEvents = events.length
  const highCount   = events.filter(e => e.impact === 'high').length
  const medCount    = events.filter(e => e.impact === 'medium').length
  const lowCount    = events.filter(e => e.impact === 'low').length

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:C.bg, overflow:'hidden' }}>
      <style>{`
        @keyframes ec-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ec-slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes ec-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Terminal header ──────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '12px 12px 10px' : '14px 20px 12px', borderBottom:`1px solid ${C.border2}`, flexShrink:0, background:`linear-gradient(180deg, rgba(14,165,233,0.05) 0%, transparent 100%)` }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,rgba(14,165,233,0.22),rgba(6,182,212,0.12))', border:'1px solid rgba(14,165,233,0.3)', boxShadow:'0 0 18px rgba(14,165,233,0.18)', flexShrink:0 }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <h1 style={{ fontSize:isMobile?14:16, fontWeight:900, color:C.text1, margin:0, letterSpacing:'-0.01em' }}>ECONOMIC CALENDAR</h1>
                <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:4, background:'rgba(16,185,129,0.12)', color:C.green, border:'1px solid rgba(16,185,129,0.2)', letterSpacing:'0.08em', animation:'ec-pulse 3s infinite' }}>LIVE</span>
                {eventsError && <span style={{ fontSize:8, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'rgba(245,158,11,0.1)', color:C.amber, border:'1px solid rgba(245,158,11,0.2)' }}>CACHED</span>}
              </div>
              <p style={{ fontSize:9, color:C.text2, margin:'2px 0 0' }}>
                {totalEvents} events this week · Last updated {lastRefreshed ? lastRefreshed.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
            <LiveClock/>
            {!isMobile && <SessionBadge/>}
          </div>
        </div>

        {/* Impact summary + refresh */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {([['high',highCount,C.high],['medium',medCount,C.medium],['low',lowCount,C.low]] as const).map(([level, count, color]) => (
            <button key={level} onClick={() => setImpactFilter(p => p === level ? 'all' : level)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:8, cursor:'pointer', transition:'all 0.13s',
              background: impactFilter === level ? `${color}15` : 'rgba(255,255,255,0.03)',
              border:`1px solid ${impactFilter === level ? color + '50' : C.border}`,
            }}>
              <ImpactBars level={level} size={11}/>
              <span style={{ fontSize:10, fontWeight:700, color: impactFilter === level ? color : C.text2 }}>{level.charAt(0).toUpperCase()+level.slice(1)}</span>
              <span style={{ fontSize:12, fontWeight:900, fontFamily:'monospace', color: impactFilter === level ? color : C.text1 }}>{count}</span>
            </button>
          ))}
          <button onClick={() => { loadEvents(); loadNews() }} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:`1px solid ${C.border}`, color:C.text2, fontSize:10, fontWeight:700 }}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 4v5h5M20 20v-5h-5M4.07 15A9 9 0 1020 12"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Mobile tab bar ───────────────────────────────────────────────── */}
      {isMobile && (
        <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, background:C.surface, flexShrink:0 }}>
          {([['events','Events',totalEvents],['news','Market News',news.length]] as const).map(([key,label,cnt]) => (
            <button key={key} onClick={() => setMobileTab(key as TabKey)} style={{
              flex:1, padding:'10px 0', background:'none', border:'none', borderBottom:`2px solid ${mobileTab===key ? C.blue : 'transparent'}`,
              cursor:'pointer', fontSize:11, fontWeight:700, color:mobileTab===key ? C.blue : C.text2, transition:'all 0.15s',
            }}>
              {label} <span style={{ fontSize:9, color:mobileTab===key ? C.blue : C.text3 }}>({cnt})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Events panel */}
        {(!isMobile || mobileTab === 'events') && (
          <div style={{ flex: isMobile ? 1 : '0 0 60%', display:'flex', flexDirection:'column', overflow:'hidden', borderRight: isMobile ? 'none' : `1px solid ${C.border}` }}>

            {/* Filter bar */}
            <div style={{ padding:'8px 12px', borderBottom:`1px solid ${C.border}`, background:C.surface, flexShrink:0, overflowX:'auto' }}>
              <div style={{ display:'flex', gap:5, minWidth:'max-content', alignItems:'center' }}>
                <span style={{ fontSize:9, color:C.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', flexShrink:0 }}>Currency</span>
                {CURRENCIES.map(cur => (
                  <button key={cur} onClick={() => setCurrencyFilter(cur)} style={{
                    display:'flex', alignItems:'center', gap:4, padding:'4px 9px', borderRadius:7, cursor:'pointer', transition:'all 0.12s',
                    background: currencyFilter===cur ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.04)',
                    border:`1px solid ${currencyFilter===cur ? 'rgba(14,165,233,0.3)' : C.border}`,
                    color: currencyFilter===cur ? C.blue : C.text2, fontSize:10, fontWeight:700,
                  }}>
                    {cur !== 'All' && <Flag currency={cur} size={13}/>}
                    {cur}
                  </button>
                ))}
              </div>
            </div>

            {/* Events list */}
            <div style={{ flex:1, overflowY:'auto' }}>
              {eventsLoading ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:10 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${C.blue}30`, borderTopColor:C.blue, animation:'ec-spin 0.7s linear infinite' }}/>
                  <span style={{ fontSize:12, color:C.text2 }}>Loading calendar events…</span>
                </div>
              ) : filteredDays.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'60px 20px', gap:10 }}>
                  <span style={{ fontSize:13, color:C.text2, fontWeight:700 }}>No events match the filters</span>
                </div>
              ) : (
                filteredDays.map(day => (
                  <div key={day}>
                    {/* Day separator */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:C.surface2, borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, zIndex:5 }}>
                      <span style={{ fontSize:11, fontWeight:800, color:C.blue, letterSpacing:'0.02em' }}>{day}</span>
                      <div style={{ flex:1, height:1, background:C.border }}/>
                      <span style={{ fontSize:9, color:C.text3 }}>{filteredGroups[day].length} events</span>
                    </div>
                    {isMobile
                      ? <div style={{ padding:'8px 10px' }}>{filteredGroups[day].map(e => <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)}/>)}</div>
                      : filteredGroups[day].map((e, i) => <EventRow key={e.id} event={e} idx={i} onClick={() => setSelectedEvent(e)}/>)
                    }
                  </div>
                ))
              )}
              {/* Table header (desktop) */}
              {!isMobile && !eventsLoading && filteredDays.length > 0 && (
                <div style={{ padding:'10px 14px', borderTop:`1px solid ${C.border}`, background:C.surface }}>
                  <p style={{ fontSize:10, color:C.text3, margin:0, textAlign:'center' }}>Click any event row to see details and related news ↑</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* News panel (desktop right / mobile tab) */}
        {(!isMobile || mobileTab === 'news') && (
          <div style={{ flex: isMobile ? 1 : '0 0 40%', display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* News header + category filter */}
            <div style={{ padding:'8px 12px', borderBottom:`1px solid ${C.border}`, background:C.surface, flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:800, color:C.text1 }}>Market News</span>
                {newsLoading && <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${C.blue}30`, borderTopColor:C.blue, animation:'ec-spin 0.7s linear infinite' }}/>}
                {!newsLoading && <span style={{ fontSize:9, color:C.text3 }}>{news.length} articles</span>}
              </div>
              <div style={{ display:'flex', gap:4, overflowX:'auto' }}>
                {NEWS_CATS.map(cat => {
                  const cfg2 = cat === 'all' ? { color:C.blue, label:'All' } : (CAT_CFG[cat] ?? { color:C.text2, label:cat })
                  const active = newsCategory === cat
                  return (
                    <button key={cat} onClick={() => setNewsCategory(cat)} style={{
                      padding:'3px 8px', borderRadius:6, cursor:'pointer', fontSize:9, fontWeight:700, flexShrink:0, transition:'all 0.12s',
                      background: active ? `${cfg2.color}15` : 'rgba(255,255,255,0.03)',
                      border:`1px solid ${active ? cfg2.color + '40' : C.border}`,
                      color: active ? cfg2.color : C.text3,
                    }}>{cfg2.label}</button>
                  )
                })}
              </div>
            </div>

            {/* News articles */}
            <div style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
              {newsLoading && news.length === 0 ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', gap:8 }}>
                  <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${C.blue}30`, borderTopColor:C.blue, animation:'ec-spin 0.7s linear infinite' }}/>
                  <span style={{ fontSize:11, color:C.text3 }}>Fetching latest news…</span>
                </div>
              ) : filteredNews.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <p style={{ fontSize:12, color:C.text3, margin:0 }}>No articles in this category</p>
                </div>
              ) : (
                filteredNews.map(article => (
                  <NewsCard key={article.id} article={article} onClick={() => setSelectedArticle(article)}/>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'8px 12px', borderTop:`1px solid ${C.border}`, background:C.surface, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:C.green, boxShadow:`0 0 5px ${C.green}`, animation:'ec-pulse 2s infinite', flexShrink:0 }}/>
              <span style={{ fontSize:9, color:C.text2 }}>Reuters · Yahoo Finance · CNBC · MarketWatch · Bloomberg — refreshes every 10 min</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail panels ────────────────────────────────────────────────── */}
      {selectedEvent  && <EventDetailPanel  event={selectedEvent}  relatedNews={relatedNews} onClose={() => setSelectedEvent(null)}/>}
      {selectedArticle && <NewsDetailPanel  article={selectedArticle}                         onClose={() => setSelectedArticle(null)}/>}
    </div>
  )
}
