import React, { useState, useEffect, useRef, useCallback } from 'react'
import { fetchMacroNews, MacroNews } from '../api/news'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime()
    if (ms < 60_000)         return 'Just now'
    if (ms < 3_600_000)      return `${Math.floor(ms / 60_000)} minutes ago`
    if (ms < 7_200_000)      return `1 hour ago`
    if (ms < 86_400_000)     return `${Math.floor(ms / 3_600_000)} hours ago`
    if (ms < 172_800_000)    return `Yesterday, ${new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}

function safeUrl(url: string): string {
  try {
    const p = new URL(url)
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : '#'
  } catch { return '#' }
}

const CAT_COLORS: Record<string, string> = {
  'central-banks': '#8b5cf6',
  'inflation':     '#ff5a72',
  'employment':    '#18c98a',
  'gdp':           '#4f8cff',
  'manufacturing': '#f6b24a',
  'commodities':   '#f97316',
  'trade':         '#06b6d4',
  'markets':       '#a78bfa',
  'general':       'var(--t-text-3)',
}

const SOURCE_LABELS: Record<string, string> = {
  'Reuters':        'Reuters News',
  'Yahoo Finance':  'Yahoo Finance',
  'CNBC Economy':   'CNBC',
  'MarketWatch':    'MarketWatch',
  'Bloomberg':      'Bloomberg',
}

// ─── Hero carousel ────────────────────────────────────────────────────────────

function HeroCarousel({ articles }: { articles: MacroNews[] }) {
  const [idx, setIdx]       = useState(0)
  const [fading, setFading] = useState(false)
  const touchX              = useRef(0)
  const timerRef            = useRef<ReturnType<typeof setTimeout>>()
  const items = articles.slice(0, 5)

  const goTo = useCallback((next: number) => {
    setFading(true)
    setTimeout(() => { setIdx(next); setFading(false) }, 220)
  }, [])

  const advance = useCallback(() => {
    goTo((idx + 1) % items.length)
  }, [idx, items.length, goTo])

  useEffect(() => {
    if (items.length <= 1) return
    timerRef.current = setTimeout(advance, 5_000)
    return () => clearTimeout(timerRef.current)
  }, [advance, items.length])

  if (!items.length) return null
  const art = items[idx]

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 0 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Major news</span>
        <button style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 0 }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Card */}
      <a href={safeUrl(art.url)} target="_blank" rel="noopener noreferrer"
         style={{ display: 'block', borderRadius: 16, overflow: 'hidden', textDecoration: 'none', position: 'relative', background: '#111' }}
         onTouchStart={e => { touchX.current = e.touches[0].clientX }}
         onTouchEnd={e => {
           const dx = e.changedTouches[0].clientX - touchX.current
           if (Math.abs(dx) > 50) goTo(dx < 0 ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length)
         }}
      >
        {/* Image */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56%', overflow: 'hidden', background: '#1a1a1a' }}>
          <img src={art.imageUrl} alt="" loading="lazy"
               style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: fading ? 0 : 1, transition: 'opacity 0.22s ease' }}
               onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.92) 100%)' }}/>
          {/* Text overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 16px 14px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.35, opacity: fading ? 0 : 1, transition: 'opacity 0.22s ease' }}>{art.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{timeAgo(art.publishedAt)}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>·</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{SOURCE_LABELS[art.source] ?? art.source}</span>
            </div>
          </div>
        </div>
      </a>

      {/* Dots */}
      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {items.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}>
              <div style={{ width: i === idx ? 20 : 7, height: 7, borderRadius: 4, background: i === idx ? '#fff' : '#374151', transition: 'all 0.25s' }}/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Horizontal scroll section ───────────────────────────────────────────────

function NewsSection({ title, articles, onRead }: { title: string; articles: MacroNews[]; onRead: (a: MacroNews) => void }) {
  if (!articles.length) return null
  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{title}</span>
        <button style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 0 }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {articles.map(art => (
          <button key={art.id} onClick={() => onRead(art)}
            style={{ flexShrink: 0, width: 'calc(65vw - 16px)', maxWidth: 260, minWidth: 180, borderRadius: 14, background: '#111', border: '1px solid rgba(255,255,255,0.06)', padding: '14px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Category dot + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[art.category] ?? 'var(--t-text-3)', flexShrink: 0 }}/>
              <span style={{ fontSize: 10, fontWeight: 700, color: CAT_COLORS[art.category] ?? 'var(--t-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {art.category.replace('-', ' ')}
              </span>
            </div>
            {/* Headline */}
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {art.title}
            </p>
            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto' }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span style={{ fontSize: 11, color: '#4b5563' }}>{timeAgo(art.publishedAt)}</span>
              <span style={{ fontSize: 11, color: '#374151' }}>·</span>
              <span style={{ fontSize: 11, color: '#4b5563' }}>{SOURCE_LABELS[art.source] ?? art.source}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Article detail sheet ─────────────────────────────────────────────────────

function ArticleSheet({ article, onClose }: { article: MacroNews; onClose: () => void }) {
  const sentColor = article.label === 'bullish' ? '#18c98a' : article.label === 'bearish' ? '#ff5a72' : 'var(--t-text-3)'
  const catColor  = CAT_COLORS[article.category] ?? 'var(--t-text-3)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           style={{ width: '100%', maxHeight: '88dvh', background: '#111', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'blog-slideUp 0.25s ease-out' }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2d2d2d' }}/>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Hero image */}
          <div style={{ position: 'relative', width: '100%', paddingTop: '52%', background: '#1a1a1a' }}>
            <img src={article.imageUrl} alt="" loading="lazy"
                 style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                 onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)' }}/>
            <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div style={{ padding: '16px 16px 8px' }}>
            {/* Category + source */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: `${catColor}18`, color: catColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {article.category.replace('-', ' ')}
              </span>
              <span style={{ fontSize: 11, color: '#4b5563' }}>{SOURCE_LABELS[article.source] ?? article.source}</span>
              <span style={{ fontSize: 11, color: '#374151' }}>·</span>
              <span style={{ fontSize: 11, color: '#4b5563' }}>{timeAgo(article.publishedAt)}</span>
            </div>

            {/* Headline */}
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.35 }}>{article.title}</h2>

            {/* Sentiment bar */}
            <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Sentiment</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: sentColor }}>
                  {article.label === 'bullish' ? '↑ Bullish' : article.label === 'bearish' ? '↓ Bearish' : '→ Neutral'}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: '#2d2d2d', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 3, background: sentColor, width: `${Math.abs(article.sentiment) * 100}%`, left: article.sentiment >= 0 ? '50%' : `${50 - Math.abs(article.sentiment) * 100}%` }}/>
                <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: '#374151' }}/>
              </div>
            </div>

            <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 20px' }}>
              This article is published by {SOURCE_LABELS[article.source] ?? article.source}. Click the button below to read the full story on their website.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '12px 16px 24px', borderTop: '1px solid #1f1f1f', flexShrink: 0, background: '#111' }}>
          <a href={safeUrl(article.url)} target="_blank" rel="noopener noreferrer"
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 0', borderRadius: 14, background: '#fff', color: '#000', fontSize: 15, fontWeight: 800, textDecoration: 'none' }}>
            Read Full Article
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Markets', 'Central Banks', 'Inflation', 'Employment', 'GDP', 'Commodities', 'Trade']
const CAT_MAP: Record<string, string> = {
  'All': '', 'Markets': 'markets', 'Central Banks': 'central-banks',
  'Inflation': 'inflation', 'Employment': 'employment', 'GDP': 'gdp',
  'Commodities': 'commodities', 'Trade': 'trade',
}

export default function BlogPage() {
  const [articles,  setArticles]  = useState<MacroNews[]>([])
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState<MacroNews | null>(null)
  const [lastUpd,   setLastUpd]   = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchMacroNews()
      if (data.length) { setArticles(data); setLastUpd(new Date()) }
    } catch { /* keep stale */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 10 * 60_000)
    return () => clearInterval(id)
  }, [load])

  const filtered = articles.filter(a => {
    const catMatch = !CAT_MAP[filter] || a.category === CAT_MAP[filter]
    const txtMatch = !search || a.title.toLowerCase().includes(search.toLowerCase())
    return catMatch && txtMatch
  })

  // Split: hero = top 5 most recent, "for you" = high-sentiment positives, rest = "all news"
  const heroArticles   = filtered.slice(0, 5)
  const allNewsSection = filtered.slice(5, 25)
  const forYouSection  = filtered.filter(a => a.label === 'bullish' || a.sentiment > 0.1).slice(0, 15)

  return (
    <div style={{ background: '#000', minHeight: '100%', paddingBottom: 40 }}>
      <style>{`
        @keyframes blog-slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes blog-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', padding: '12px 16px 0', WebkitBackdropFilter: 'blur(16px)' }}>
        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1a1a1a', borderRadius: 12, padding: '10px 14px', marginBottom: 12 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#4b5563" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search news..."
                 style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}/>
          {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #374151', borderTopColor: '#9ca3af', animation: 'blog-spin 0.7s linear infinite', flexShrink: 0 }}/>}
          {lastUpd && !loading && <span style={{ fontSize: 10, color: '#374151', flexShrink: 0 }}>{lastUpd.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: filter === cat ? '#fff' : '#1a1a1a',
              color:      filter === cat ? '#000' : '#6b7280',
            }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        {loading && articles.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #1f1f1f', borderTopColor: '#fff', animation: 'blog-spin 0.8s linear infinite' }}/>
            <p style={{ fontSize: 14, color: '#4b5563', margin: 0 }}>Loading latest news…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <p style={{ fontSize: 14, color: '#4b5563' }}>No news matches your search.</p>
          </div>
        ) : (
          <>
            {/* Hero carousel */}
            {heroArticles.length > 0 && <HeroCarousel articles={heroArticles}/>}

            {/* All news & Analysis */}
            {allNewsSection.length > 0 && (
              <NewsSection title="All news & Analysis" articles={allNewsSection} onRead={setSelected}/>
            )}

            {/* For you */}
            {forYouSection.length > 0 && (
              <NewsSection title="For you" articles={forYouSection} onRead={setSelected}/>
            )}

            {/* Source attribution */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid #111' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#18c98a', animation: 'blog-spin 0s' }}/>
              <span style={{ fontSize: 11, color: '#374151' }}>Reuters · Yahoo Finance · CNBC · MarketWatch · Bloomberg · refreshes every 10 min</span>
            </div>
          </>
        )}
      </div>

      {/* ── Article detail bottom sheet ──────────────────────────────────── */}
      {selected && <ArticleSheet article={selected} onClose={() => setSelected(null)}/>}
    </div>
  )
}
