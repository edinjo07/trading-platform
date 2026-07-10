import React, { useState, useRef, useEffect } from 'react'

// ─── Live channels ────────────────────────────────────────────────────────────

const LIVE_CHANNELS = [
  {
    id:          'bloomberg',
    name:        'Bloomberg',
    label:       'Bloomberg Markets',
    tag:         'MARKETS',
    desc:        '24/7 global market & business news',
    channelId:   'UCIALMKvObZNtJ6AmdCLP7Lg',
    accent:      '#f5821f',
    watchUrl:    'https://www.bloomberg.com/live-tv',
    logoLetter:  'B',
  },
  {
    id:          'cnbc',
    name:        'CNBC',
    label:       'CNBC Television',
    tag:         'US STOCKS',
    desc:        'Markets, NYSE floor coverage & earnings',
    channelId:   'UCrp_UI8XtuYfpiqluWLD7Lw',
    accent:      '#0091D5',
    watchUrl:    'https://www.cnbc.com/live-tv/',
    logoLetter:  'C',
  },
  {
    id:          'yahoo',
    name:        'Yahoo Finance',
    label:       'Yahoo Finance Live',
    tag:         'FINANCE',
    desc:        'Stocks, earnings & market analysis',
    channelId:   'UCEAZeUIeJs0IjQiqTCdVSIg',
    accent:      '#6001D2',
    watchUrl:    'https://finance.yahoo.com/live/',
    logoLetter:  'Y',
  },
  {
    id:          'reuters',
    name:        'Reuters',
    label:       'Reuters Television',
    tag:         'GLOBAL',
    desc:        'Breaking financial & world news',
    channelId:   'UChqUTb7kYRX8-EiaN3XFrSQ',
    accent:      '#ff6600',
    watchUrl:    'https://www.reuters.com/video/live',
    logoLetter:  'R',
  },
  {
    id:          'foxbiz',
    name:        'Fox Business',
    label:       'Fox Business Network',
    tag:         'US BUSINESS',
    desc:        'US business, economy & policy',
    channelId:   'UCF9IOB2TExg3QIBupFtBDxg',
    accent:      '#1a56db',
    watchUrl:    'https://www.foxbusiness.com/live',
    logoLetter:  'F',
  },
  {
    id:          'aljazeera',
    name:        'Al Jazeera',
    label:       'Al Jazeera English',
    tag:         'WORLD NEWS',
    desc:        'Global news, economics & markets',
    channelId:   'UCNye-wNBqNL5ZzHSJdde38g',
    accent:      '#c41920',
    watchUrl:    'https://www.aljazeera.com/live/',
    logoLetter:  'A',
  },
] as const

type ChannelId = typeof LIVE_CHANNELS[number]['id']

// ─── On-demand videos ─────────────────────────────────────────────────────────

const VIDEOS = [
  { id:1,  youtubeId:'aFaKsBTNMpk', title:'EUR/USD Technical Outlook: Key Resistance Tested',         cat:'Forex',       duration:'4:12', source:'Trading Central' },
  { id:2,  youtubeId:'PnWZCzTmCJ8', title:'Gold Rally: Can XAU/USD Push Through $3,150?',             cat:'Commodities', duration:'5:30', source:'Trading Central' },
  { id:3,  youtubeId:'DGbhxhTBGbw', title:'S&P 500 Weekly Outlook: Tariff Risks & Support Levels',    cat:'Equities',    duration:'6:05', source:'Trading Central' },
  { id:4,  youtubeId:'Kp-1pVGTqGA', title:'GBP/USD: Pound Resilience Amid BoE Divergence',            cat:'Forex',       duration:'4:48', source:'Trading Central' },
  { id:5,  youtubeId:'aFaKsBTNMpk', title:'WTI Crude: OPEC+ Meeting Impact on Oil Prices',            cat:'Commodities', duration:'5:15', source:'Trading Central' },
  { id:6,  youtubeId:'PnWZCzTmCJ8', title:'USD/JPY: Intervention Risk & Yen Dynamics',                cat:'Forex',       duration:'4:32', source:'Trading Central' },
  { id:7,  youtubeId:'DGbhxhTBGbw', title:'Bitcoin Technical Analysis: $85K Support Battle',          cat:'Crypto',      duration:'6:50', source:'Trading Central' },
  { id:8,  youtubeId:'Kp-1pVGTqGA', title:'NASDAQ 100: Tech Stocks & AI Sector Momentum',             cat:'Equities',    duration:'5:40', source:'Trading Central' },
  { id:9,  youtubeId:'aFaKsBTNMpk', title:'AUD/USD: RBA Outlook & Commodity Correlation',             cat:'Forex',       duration:'4:20', source:'Trading Central' },
  { id:10, youtubeId:'PnWZCzTmCJ8', title:'Silver & Platinum: Precious Metals Technical Review',      cat:'Commodities', duration:'4:55', source:'Trading Central' },
  { id:11, youtubeId:'DGbhxhTBGbw', title:'DAX 40: European Markets & ECB Rate Outlook',              cat:'Equities',    duration:'5:10', source:'Trading Central' },
  { id:12, youtubeId:'Kp-1pVGTqGA', title:'Ethereum Analysis: Layer-2 Momentum & Support Zones',     cat:'Crypto',      duration:'6:00', source:'Trading Central' },
]

const VIDEO_CATS = ['All', 'Forex', 'Equities', 'Commodities', 'Crypto']

const CAT_COLOR: Record<string, string> = {
  Forex:       '#18c98a',
  Equities:    '#4f8cff',
  Commodities: '#f6b24a',
  Crypto:      '#8b5cf6',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgoShort(mins: number) {
  if (mins < 60)  return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

// ─── Live player ──────────────────────────────────────────────────────────────

function LivePlayer({ channel }: { channel: typeof LIVE_CHANNELS[number] }) {
  const [showFallback, setShowFallback] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Show fallback if iframe doesn't respond in 8 seconds
  useEffect(() => {
    setShowFallback(false)
    const t = setTimeout(() => setShowFallback(true), 8_000)
    return () => clearTimeout(t)
  }, [channel.id])

  const embedUrl = `https://www.youtube.com/embed/live_stream?channel=${channel.channelId}&autoplay=1&rel=0&modestbranding=1`

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 16, overflow: 'hidden', background: '#111', border: `1px solid rgba(255,255,255,0.07)` }}>
      {/* 16:9 player */}
      <div style={{ position: 'relative', paddingTop: '56.25%' }}>
        <iframe
          ref={iframeRef}
          key={channel.id}
          src={embedUrl}
          title={channel.label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
        {/* Gradient overlay at top for LIVE badge */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: '#ff5a72' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'tv-pulse 1.5s ease-in-out infinite' }}/>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>LIVE</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{channel.label}</span>
          </div>
        </div>
      </div>

      {/* Channel info bar */}
      <div style={{ padding: '12px 14px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Channel logo */}
          <div style={{ width: 36, height: 36, borderRadius: 10, background: channel.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: 16, color: '#fff' }}>
            {channel.logoLetter}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{channel.name}</div>
            <div style={{ fontSize: 11, color: '#4b5563' }}>{channel.desc}</div>
          </div>
        </div>
        <a href={channel.watchUrl} target="_blank" rel="noopener noreferrer"
           style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 10, background: '#1a1a1a', border: '1px solid #2d2d2d', color: '#6b7280', fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0 }}>
          Open Live
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
      </div>

      {/* Fallback notice after timeout */}
      {showFallback && (
        <div style={{ padding: '8px 14px 14px', background: '#111', borderTop: '1px solid #1a1a1a' }}>
          <p style={{ fontSize: 11, color: '#374151', margin: 0, lineHeight: 1.5 }}>
            If the stream doesn't load, click "Open Live" to watch on {channel.name}'s website. Some channels restrict embedding.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Video card (horizontal scroll) ──────────────────────────────────────────

function VideoCard({ video, onTap }: { video: typeof VIDEOS[0]; onTap: () => void }) {
  const color = CAT_COLOR[video.cat] ?? 'var(--t-text-3)'
  return (
    <button onClick={onTap} style={{
      flexShrink: 0, width: 'calc(65vw - 16px)', maxWidth: 240, minWidth: 180,
      borderRadius: 14, background: '#111', border: '1px solid rgba(255,255,255,0.06)',
      padding: 0, textAlign: 'left', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#1a1a1a', flexShrink: 0 }}>
        <img src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`} alt={video.title} loading="lazy"
             style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
             onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}/>
        {/* Overlay + play button */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
            <svg width="14" height="14" fill="#000" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        {/* Duration */}
        <div style={{ position: 'absolute', bottom: 6, right: 6, padding: '2px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.8)', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>
          {video.duration}
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }}/>
          <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{video.cat}</span>
        </div>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {video.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <span style={{ fontSize: 10, color: '#374151' }}>{video.source}</span>
        </div>
      </div>
    </button>
  )
}

// ─── Video bottom sheet ───────────────────────────────────────────────────────

function VideoSheet({ video, onClose }: { video: typeof VIDEOS[0]; onClose: () => void }) {
  const color   = CAT_COLOR[video.cat] ?? 'var(--t-text-3)'
  const touchY  = useRef(0)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.85)' }}
         onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           onTouchStart={e => { touchY.current = e.touches[0].clientY }}
           onTouchEnd={e => { if (e.changedTouches[0].clientY - touchY.current > 80) onClose() }}
           style={{ width: '100%', maxHeight: '92dvh', background: '#111', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'tv-slideUp 0.25s ease-out' }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2d2d2d' }}/>
        </div>

        {/* YouTube embed */}
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', flexShrink: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 0' }}>
          {/* Category + source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: `${color}18`, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{video.cat}</span>
            <span style={{ fontSize: 11, color: '#374151' }}>{video.source}</span>
            <span style={{ fontSize: 11, color: '#1f2937' }}>·</span>
            <span style={{ fontSize: 11, color: '#374151' }}>{video.duration}</span>
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 12px', lineHeight: 1.35 }}>{video.title}</h2>
        </div>

        <div style={{ padding: '10px 16px 28px', flexShrink: 0, borderTop: '1px solid #1a1a1a' }}>
          <a href={`https://www.youtube.com/watch?v=${video.youtubeId}`} target="_blank" rel="noopener noreferrer"
             style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px 0', borderRadius: 14, background: '#fff', color: '#000', fontSize: 14, fontWeight: 800, textDecoration: 'none', marginBottom: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff0000"><path d="M23.5 6.2s-.2-1.6-.9-2.3c-.9-.9-1.9-.9-2.3-.9C17.1 2.8 12 2.8 12 2.8s-5.1 0-8.3.2c-.4 0-1.4 0-2.3.9-.7.7-.9 2.3-.9 2.3S.2 8 .2 9.8v1.7c0 1.8.3 3.6.3 3.6s.2 1.6.9 2.3c.9.9 2.1.9 2.6.9C5.7 18.5 12 18.5 12 18.5s5.1 0 8.3-.2c.4 0 1.4 0 2.3-.9.7-.7.9-2.3.9-2.3s.3-1.8.3-3.6V9.8c0-1.8-.3-3.6-.3-3.6zM9.7 14.1V7.8l6.3 3.2-6.3 3.1z"/></svg>
            Watch on YouTube
          </a>
          <button onClick={onClose} style={{ width: '100%', padding: '12px 0', borderRadius: 14, background: '#1a1a1a', border: '1px solid #2d2d2d', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WebTVPage() {
  const [activeChannel, setActiveChannel] = useState<ChannelId>('bloomberg')
  const [videoCat,      setVideoCat]      = useState('All')
  const [selectedVideo, setSelectedVideo] = useState<typeof VIDEOS[0] | null>(null)

  const channel   = LIVE_CHANNELS.find(c => c.id === activeChannel)!
  const filtered  = VIDEOS.filter(v => videoCat === 'All' || v.cat === videoCat)

  // Split videos: featured horizontal + rest
  const featured = filtered.slice(0, 8)
  const secondary = filtered.slice(8)

  return (
    <div style={{ background: '#000', minHeight: '100%', paddingBottom: 40 }}>
      <style>{`
        @keyframes tv-pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes tv-slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        ::-webkit-scrollbar { display:none }
      `}</style>

      {/* ── Sticky top bar ──────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', padding: '12px 16px 0' }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8M12 3v4"/><polygon points="10 11 16 14 10 17 10 11" fill="#fff" stroke="none"/></svg>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Web TV</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#ff5a72' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'tv-pulse 1.5s ease-in-out infinite' }}/>
            <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.08em' }}>LIVE</span>
          </div>
        </div>

        {/* Channel pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {LIVE_CHANNELS.map(ch => {
            const isActive = activeChannel === ch.id
            return (
              <button key={ch.id} onClick={() => setActiveChannel(ch.id as ChannelId)} style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 20, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: isActive ? '#fff' : '#1a1a1a',
                color:      isActive ? '#000' : '#6b7280',
                fontSize: 12, fontWeight: 700,
              }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: isActive ? ch.accent : '#2d2d2d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff', flexShrink: 0, transition: 'all 0.15s' }}>
                  {ch.logoLetter}
                </div>
                {ch.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Live player ─────────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px', marginBottom: 28 }}>
        {/* Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 14 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Now Live</span>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: `${channel.accent}18`, color: channel.accent, border: `1px solid ${channel.accent}30` }}>{channel.tag}</span>
        </div>
        <LivePlayer channel={channel}/>
      </div>

      {/* ── On Demand ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 16px' }}>
        {/* Header + category pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>On Demand</span>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
          {VIDEO_CATS.map(cat => {
            const isActive = videoCat === cat
            return (
              <button key={cat} onClick={() => setVideoCat(cat)} style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: isActive ? '#fff' : '#1a1a1a',
                color:      isActive ? '#000' : '#6b7280',
              }}>{cat}</button>
            )
          })}
        </div>

        {/* Featured videos horizontal scroll */}
        {featured.length > 0 && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 24 }}>
            {featured.map(v => (
              <VideoCard key={v.id} video={v} onTap={() => setSelectedVideo(v)}/>
            ))}
          </div>
        )}

        {/* "More Videos" second scroll */}
        {secondary.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>More Videos</span>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', marginBottom: 24 }}>
              {secondary.map(v => (
                <VideoCard key={v.id} video={v} onTap={() => setSelectedVideo(v)}/>
              ))}
            </div>
          </>
        )}

        {/* Footer attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid #111' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5a72', animation: 'tv-pulse 2s infinite' }}/>
          <span style={{ fontSize: 10, color: '#1f2937' }}>
            Live streams: Bloomberg · CNBC · Yahoo Finance · Reuters · Fox Business · Al Jazeera · On-demand: Trading Central
          </span>
        </div>
      </div>

      {/* ── Video bottom sheet ───────────────────────────────────────────── */}
      {selectedVideo && <VideoSheet video={selectedVideo} onClose={() => setSelectedVideo(null)}/>}
    </div>
  )
}
