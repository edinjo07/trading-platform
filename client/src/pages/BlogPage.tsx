import React, { useState } from 'react'

const CATEGORIES = ['All', 'Forex', 'Crypto', 'Stocks', 'Commodities', 'Education', 'Market News']

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

const RECENT_POSTS = [
  { id: 4, category: 'Crypto', title: 'Bitcoin Holds Above $85K: Is a New ATH Incoming?', date: 'Mar 27, 2026', readTime: '3 min read' },
  { id: 5, category: 'Commodities', title: 'Gold Surges on Safe-Haven Demand as Geopolitical Tensions Rise', date: 'Mar 26, 2026', readTime: '4 min read' },
  { id: 6, category: 'Stocks', title: 'S&P 500 Volatility Spikes: What Options Markets Are Pricing In', date: 'Mar 26, 2026', readTime: '6 min read' },
  { id: 7, category: 'Education', title: 'How to Read Candlestick Charts Like a Pro', date: 'Mar 25, 2026', readTime: '7 min read' },
  { id: 8, category: 'Forex', title: 'Trading the Non-Farm Payrolls: Strategies and Risk Management', date: 'Mar 25, 2026', readTime: '5 min read' },
  { id: 9, category: 'Market News', title: 'Central Bank Watch: Fed, ECB, BoE Diverging Paths', date: 'Mar 24, 2026', readTime: '4 min read' },
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Market News': { bg: 'rgba(14,165,233,0.12)', text: '#38bdf8' },
  Education:     { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  Forex:         { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  Crypto:        { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
  Commodities:   { bg: 'rgba(249,115,22,0.12)', text: '#fb923c' },
  Stocks:        { bg: 'rgba(236,72,153,0.12)', text: '#f472b6' },
  All:           { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.6)' },
}

function CategoryBadge({ cat }: { cat: string }) {
  const c = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['All']
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.text }}>
      {cat}
    </span>
  )
}

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = RECENT_POSTS.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
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
        <p className="text-text-muted text-sm">Latest analysis, trading education, and market news from our team.</p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1"
             style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <svg className="w-4 h-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={activeCategory === cat
                ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Posts */}
      {activeCategory === 'All' && !search && (
        <>
          <h2 className="text-text-primary font-semibold text-sm uppercase tracking-wider opacity-60">Featured</h2>
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
      )}

      {/* Recent / Filtered Posts */}
      <div>
        <h2 className="text-text-primary font-semibold text-sm uppercase tracking-wider opacity-60 mb-3">
          {activeCategory === 'All' && !search ? 'Recent Articles' : `${filtered.length} Article${filtered.length !== 1 ? 's' : ''} Found`}
        </h2>
        {filtered.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-text-muted">No articles found for your search.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(post => (
              <a
                key={post.id}
                href="https://www.icmarkets.com/blog/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3.5 rounded-xl transition-all group"
                style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryBadge cat={post.category} />
                  <span className="text-text-primary text-sm font-medium group-hover:text-brand-300 transition-colors truncate">
                    {post.title}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-text-muted text-xs hidden sm:block">{post.readTime}</span>
                  <span className="text-text-muted text-xs">{post.date}</span>
                  <svg className="w-4 h-4 text-text-muted group-hover:text-brand-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* View More on IC Markets */}
      <div className="flex justify-center pt-2">
        <a
          href="https://www.icmarkets.com/blog/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.12)' }}
        >
          View All Articles on IC Markets Blog
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
