import React, { useState, useEffect } from 'react'
import api from '../api/client'

const BB_CATEGORIES = ['All', 'Markets', 'Technology', 'Politics']

interface BloombergArticle {
  title:       string
  url:         string
  publishedAt: string
  category:    string
  source:      string
}

const FEATURED_POSTS = [
  {
    id: 1,
    category: 'Market News',
    title: 'US Dollar Climbs Against Most Majors Amid Tariff Uncertainty',
    excerpt: 'The US dollar strengthened against most major currencies as investors assessed the potential impact of new tariff announcements on global trade flows.',
    date: 'March 29, 2026',
    readTime: '4 min read',
    tag: 'FEATURED',
  },
  {
    id: 2,
    category: 'Education',
    title: 'Understanding CFD Trading: A Complete Beginner\'s Guide',
    excerpt: 'Contract for Difference (CFD) trading allows you to speculate on price movements without owning the underlying asset. Learn the fundamentals before you start.',
    date: 'March 28, 2026',
    readTime: '8 min read',
    tag: 'EDUCATION',
  },
  {
    id: 3,
    category: 'Forex',
    title: 'EUR/USD Technical Analysis: Key Levels to Watch This Week',
    excerpt: 'The EUR/USD pair has been consolidating near the 1.0850 level. Traders are watching the upcoming ECB minutes and US NFP data for directional cues.',
    date: 'March 27, 2026',
    readTime: '5 min read',
    tag: 'ANALYSIS',
  },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Market News': { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8' },
  Education:     { bg: 'rgba(99,102,241,0.12)',   text: '#818cf8' },
  Forex:         { bg: 'rgba(16,185,129,0.12)',   text: '#34d399' },
  Crypto:        { bg: 'rgba(251,191,36,0.12)',   text: '#fbbf24' },
  Commodities:   { bg: 'rgba(249,115,22,0.12)',   text: '#fb923c' },
  Stocks:        { bg: 'rgba(236,72,153,0.12)',   text: '#f472b6' },
  Markets:       { bg: 'rgba(14,165,233,0.12)',   text: '#38bdf8' },
  Technology:    { bg: 'rgba(99,102,241,0.12)',   text: '#818cf8' },
  Politics:      { bg: 'rgba(249,115,22,0.12)',   text: '#fb923c' },
  All:           { bg: 'rgba(255,255,255,0.06)',  text: 'rgba(255,255,255,0.6)' },
}

function CategoryBadge({ cat }: { cat: string }) {
  const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['All']
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {cat}
    </span>
  )
}

const FALLBACK_URL = 'https://www.bloomberg.com/markets'

function safeUrl(url: string | undefined): string {
  try {
    const parsed = new URL(url ?? '')
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href
  } catch {
    // fall through
  }
  return FALLBACK_URL
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function BlogPage() {
  const [bbCategory, setBbCategory]   = useState('All')
  const [search, setSearch]           = useState('')
  const [articles, setArticles]       = useState<BloombergArticle[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadNews = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await api.get<BloombergArticle[]>('/news/bloomberg')
      setArticles(data)
      setLastUpdated(new Date())
    } catch (e: any) {
      setError('Could not load Bloomberg news. Retrying shortlyâ€¦')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews()
    const id = setInterval(loadNews, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(id)
  }, [])

  const filtered = articles.filter(a => {
    const matchCat  = bbCategory === 'All' || a.category === bbCategory
    const matchText = !search || a.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  })

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
            <path d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <h1 className="text-text-primary text-2xl font-bold">Blog & Market Insights</h1>
        </div>
        <p className="text-text-muted text-sm">
          Live news from <strong className="text-text-secondary">Bloomberg</strong> plus trading education and market analysis.
        </p>
      </div>

      {/* Featured Posts (static editor picks) */}
      <>
        <h2 className="text-text-primary font-semibold text-sm uppercase tracking-wider opacity-60">Editor's Picks</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED_POSTS.map(post => (
            <a
              key={post.id}
              href="https://www.icmarkets.com/blog/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl p-5 flex flex-col gap-3 cursor-pointer transition-all group"
              style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            >
              <div className="flex items-center justify-between">
                <CategoryBadge cat={post.category} />
                <span className="text-2xs font-bold tracking-widest px-2 py-0.5 rounded"
                      style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>
                  {post.tag}
                </span>
              </div>
              <h3 className="text-text-primary font-semibold text-sm leading-snug group-hover:text-brand-300 transition-colors">
                {post.title}
              </h3>
              <p className="text-text-muted text-xs leading-relaxed flex-1">{post.excerpt}</p>
              <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-text-muted text-xs">{post.date}</span>
                <span className="text-text-muted text-xs">{post.readTime}</span>
              </div>
            </a>
          ))}
        </div>
      </>

      {/* Bloomberg Live News */}
      <div className="rounded-2xl overflow-hidden"
           style={{ border: '1px solid rgba(255,165,0,0.18)', background: '#0c1829' }}>
        {/* Bloomberg header bar */}
        <div className="flex items-center gap-3 px-4 py-3"
             style={{ background: 'rgba(255,140,0,0.06)', borderBottom: '1px solid rgba(255,165,0,0.12)' }}>
          {/* Bloomberg "B" logo placeholder */}
          <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 font-black text-sm"
               style={{ background: '#f5821f', color: '#fff' }}>B</div>
          <span className="text-text-primary text-sm font-bold">Bloomberg News</span>
          <span className="text-xs px-2 py-0.5 rounded font-semibold ml-1"
                style={{ background: 'rgba(255,140,0,0.15)', color: '#fb923c' }}>LIVE FEED</span>
          {lastUpdated && (
            <span className="text-text-muted text-xs ml-auto hidden sm:block">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={loadNews}
            disabled={loading}
            className="p-1.5 rounded-lg transition-colors ml-auto sm:ml-2 shrink-0"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' }}
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Search + Category filter */}
        <div className="flex flex-col sm:flex-row gap-2 p-3"
             style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Bloomberg articles..."
              className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            {BB_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setBbCategory(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={bbCategory === cat
                  ? { background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Article list */}
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {loading && articles.length === 0 ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <svg className="w-5 h-5 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-text-muted text-sm">Loading Bloomberg newsâ€¦</span>
            </div>
          ) : error && articles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center px-6">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v4m0 4h.01M10.293 4.293a1 1 0 011.414 0l7 7a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7a1 1 0 010-1.414l7-7z" />
              </svg>
              <p className="text-text-muted text-sm">{error}</p>
              <button
                onClick={loadNews}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-muted text-sm">No articles found.</p>
            </div>
          ) : (
            filtered.map((article, i) => (
              <a
                key={`${article.url}-${i}`}
                href={safeUrl(article.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3.5 transition-all group"
                style={{ display: 'flex' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.025)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryBadge cat={article.category} />
                  <span className="text-text-primary text-sm font-medium group-hover:text-brand-300 transition-colors truncate">
                    {article.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-text-muted text-xs hidden sm:block">{fmtDate(article.publishedAt)}</span>
                  <svg className="w-4 h-4 text-text-muted group-hover:text-brand-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))
          )}
        </div>

        {/* Footer attribution */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3"
               style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
            <span className="text-text-muted text-xs">
              {filtered.length} article{filtered.length !== 1 ? 's' : ''} Â· Source: Bloomberg
            </span>
            <a
              href="https://www.bloomberg.com/markets"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold transition-colors"
              style={{ color: '#fb923c' }}
            >
              bloomberg.com →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
