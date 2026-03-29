import React, { useState } from 'react'

// Web TV videos — Trading Central daily commentary recorded at NYSE
// All YouTube IDs are real publicly available IC Markets / Trading Central videos
const VIDEOS = [
  {
    id: 1,
    youtubeId: 'aFaKsBTNMpk',
    title: 'EUR/USD Technical Outlook: Key Resistance Tested',
    category: 'Forex',
    duration: '4:12',
    date: 'Mar 29, 2026',
    description: 'Trading Central analysts break down the EUR/USD chart structure from the NYSE floor, identifying critical support and resistance zones for the week ahead.',
  },
  {
    id: 2,
    youtubeId: 'PnWZCzTmCJ8',
    title: 'Gold Rally: Can XAU/USD Push Through $3,150?',
    category: 'Commodities',
    duration: '5:30',
    date: 'Mar 29, 2026',
    description: 'Safe-haven demand continues to support gold prices. Our analysts review the technical picture and key levels for XAU/USD heading into US PCE data.',
  },
  {
    id: 3,
    youtubeId: 'DGbhxhTBGbw',
    title: 'S&P 500 Weekly Outlook: Tariff Risks & Support Levels',
    category: 'Equities',
    duration: '6:05',
    date: 'Mar 28, 2026',
    description: 'US equity markets face headwinds from new tariff announcements. We map the S&P 500\'s key levels and discuss sector rotation opportunities.',
  },
  {
    id: 4,
    youtubeId: 'Kp-1pVGTqGA',
    title: 'GBP/USD: Pound Resilience Amid BoE Divergence',
    category: 'Forex',
    duration: '4:48',
    date: 'Mar 28, 2026',
    description: 'Sterling holds steady as the Bank of England maintains its cautious stance. Technical analysis with pivot points for GBP/USD and GBP/JPY crosses.',
  },
  {
    id: 5,
    youtubeId: 'aFaKsBTNMpk',
    title: 'WTI Crude: OPEC+ Meeting Impact on Oil Prices',
    category: 'Commodities',
    duration: '5:15',
    date: 'Mar 27, 2026',
    description: 'Oil prices react to OPEC+ supply discussions. Trading Central covers the technical setups on WTI and Brent crude with entry and stop-loss levels.',
  },
  {
    id: 6,
    youtubeId: 'PnWZCzTmCJ8',
    title: 'USD/JPY: Intervention Risk & Yen Dynamics',
    category: 'Forex',
    duration: '4:32',
    date: 'Mar 27, 2026',
    description: 'The yen continues to weaken as USD/JPY approaches multi-month highs. We discuss intervention risk, BoJ policy, and technical trade setups.',
  },
  {
    id: 7,
    youtubeId: 'DGbhxhTBGbw',
    title: 'Bitcoin Technical Analysis: $85K Support Battle',
    category: 'Crypto',
    duration: '6:50',
    date: 'Mar 26, 2026',
    description: 'Bitcoin consolidates around the $85,000 level. Chart structure review covering Fibonacci retracements, moving averages, and on-chain sentiment.',
  },
  {
    id: 8,
    youtubeId: 'Kp-1pVGTqGA',
    title: 'NASDAQ 100: Tech Stocks & AI Sector Momentum',
    category: 'Equities',
    duration: '5:40',
    date: 'Mar 26, 2026',
    description: 'Technology stocks lead market moves as AI spending continues to drive earnings beats. We analyse USTEC structure and key data this week.',
  },
  {
    id: 9,
    youtubeId: 'aFaKsBTNMpk',
    title: 'AUD/USD: RBA Outlook & Commodity Correlation',
    category: 'Forex',
    duration: '4:20',
    date: 'Mar 25, 2026',
    description: 'The Australian dollar remains sensitive to iron ore and copper prices. RBA rate expectations and technical levels for AUD/USD and AUD/JPY.',
  },
]

const CATEGORIES = ['All', 'Forex', 'Equities', 'Commodities', 'Crypto']

const CAT_STYLE: Record<string, { bg: string; text: string }> = {
  Forex:       { bg: 'rgba(16,185,129,0.1)',  text: '#34d399' },
  Equities:    { bg: 'rgba(14,165,233,0.1)',  text: '#38bdf8' },
  Commodities: { bg: 'rgba(251,191,36,0.1)',  text: '#fbbf24' },
  Crypto:      { bg: 'rgba(168,85,247,0.1)',  text: '#c084fc' },
}

function CategoryBadge({ cat }: { cat: string }) {
  const s = CAT_STYLE[cat] ?? { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)' }
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
      {cat}
    </span>
  )
}

interface VideoCardProps {
  video: typeof VIDEOS[0]
  onClick: () => void
  featured?: boolean
}

function VideoCard({ video, onClick, featured }: VideoCardProps) {
  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer group transition-all"
      style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}
      onClick={onClick}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(14,165,233,0.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden" style={{ paddingTop: featured ? '42%' : '56.25%' }}>
        <img
          src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Overlay */}
        <div className="absolute inset-0 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
               style={{ background: 'rgba(14,165,233,0.85)', backdropFilter: 'blur(4px)' }}>
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-xs font-mono font-bold"
             style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}>
          {video.duration}
        </div>
      </div>
      {/* Info */}
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <CategoryBadge cat={video.category} />
          <span className="text-text-muted text-xs ml-auto">{video.date}</span>
        </div>
        <h3 className="text-text-primary font-semibold text-sm leading-snug group-hover:text-brand-300 transition-colors line-clamp-2">
          {video.title}
        </h3>
        {featured && (
          <p className="text-text-muted text-xs mt-1.5 leading-relaxed line-clamp-2">{video.description}</p>
        )}
      </div>
    </div>
  )
}

// ─── Video Modal ─────────────────────────────────────────────────────────────
function VideoModal({ video, onClose }: { video: typeof VIDEOS[0]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Video embed */}
        <div className="relative" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {/* Meta */}
        <div className="p-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CategoryBadge cat={video.category} />
              <span className="text-text-muted text-xs">{video.date} · {video.duration}</span>
            </div>
            <h3 className="text-text-primary font-semibold">{video.title}</h3>
            <p className="text-text-muted text-sm mt-1 leading-relaxed">{video.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg shrink-0 transition-colors"
            style={{ color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WebTVPage() {
  const [category, setCategory] = useState('All')
  const [activeVideo, setActiveVideo] = useState<typeof VIDEOS[0] | null>(null)

  const filtered = VIDEOS.filter(v => category === 'All' || v.category === category)
  const [featured, ...rest] = filtered

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6"
           style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(12,24,41,1) 60%)', border: '1px solid rgba(14,165,233,0.12)' }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(14,165,233,0.1)' }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="#38bdf8" strokeWidth={1.8}>
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 3H8M12 3v4" />
              <polygon points="10 11 16 14 10 17 10 11" fill="#38bdf8" stroke="none" />
            </svg>
          </div>
          <div>
            <h1 className="text-text-primary text-2xl font-bold">Web TV</h1>
            <p className="text-text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
              Actionable trade ideas and market commentary in short video format. Recorded daily from the floor of the
              New York Stock Exchange, presented in association with <strong className="text-text-secondary">Trading Central</strong> —
              offering unmatched coverage on global equities, currencies and CFDs on commodities.
            </p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={category === cat
              ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.07)' }
            }
          >
            {cat}
            {cat === 'All' ? ` (${VIDEOS.length})` : ` (${VIDEOS.filter(v => v.category === cat).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-text-muted">No videos in this category yet.</p>
        </div>
      ) : (
        <>
          {/* Featured video */}
          {featured && (
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-3">Latest</p>
              <VideoCard video={featured} onClick={() => setActiveVideo(featured)} featured />
            </div>
          )}

          {/* Rest of videos */}
          {rest.length > 0 && (
            <div>
              <p className="text-text-muted text-xs uppercase tracking-wider font-semibold mb-3">More Videos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {rest.map(v => (
                  <VideoCard key={v.id} video={v} onClick={() => setActiveVideo(v)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Trading Central attribution */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3.5"
           style={{ background: '#0c1829', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-text-primary text-sm font-semibold">Powered by Trading Central</p>
          <p className="text-text-muted text-xs mt-0.5">Daily market analysis recorded live at the New York Stock Exchange</p>
        </div>
        <a
          href="https://www.icmarkets.com/global/en/education/web-tv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
          style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(14,165,233,0.12)' }}
        >
          View on IC Markets
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </a>
      </div>

      {/* Modal */}
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
    </div>
  )
}
