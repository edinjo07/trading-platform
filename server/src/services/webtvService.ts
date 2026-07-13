/**
 * Web TV live-stream resolver.
 *
 * YouTube removed the old `embed/live_stream?channel=ID` endpoint years ago,
 * so a channel's *current* live video ID has to be resolved at request time.
 * We do it the same key-free way the news service scrapes its sources: fetch
 * the channel's `/live` page and pull the canonical watch-URL out of the HTML.
 * Results are cached briefly so we don't hammer YouTube on every tab switch.
 */
import https from 'https'

const cache = new Map<string, { videoId: string | null; ts: number }>()
const TTL_MS = 4 * 60 * 1000 // 4 minutes — live IDs are stable for hours but restart occasionally

function fetchPage(url: string, timeoutMs = 7000): Promise<{ status: number; body: string; location?: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        // Browser-like headers + consent cookie avoid YouTube's EU consent wall on server requests
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+000',
      },
    }, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (c: string) => { body += c })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body, location: res.headers.location }))
    })
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
  })
}

function extractLiveId(html: string): string | null {
  // When a channel is live, /live's canonical link points at the live watch URL.
  const canon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)
  if (canon) return canon[1]
  // Fallback: a videoId adjacent to an isLiveNow marker in the initial data blob.
  const a = html.match(/"videoId":"([\w-]{11})"[^{}]*?"isLiveNow":true/)
  if (a) return a[1]
  const b = html.match(/"isLiveNow":true[^{}]*?"videoId":"([\w-]{11})"/)
  if (b) return b[1]
  return null
}

export async function getLiveVideoId(channelId: string): Promise<{ videoId: string | null; isLive: boolean }> {
  const hit = cache.get(channelId)
  if (hit && Date.now() - hit.ts < TTL_MS) return { videoId: hit.videoId, isLive: !!hit.videoId }

  let videoId: string | null = null
  try {
    const first = await fetchPage(`https://www.youtube.com/channel/${channelId}/live`)
    // 3xx redirect straight to the watch URL
    if (first.status >= 300 && first.status < 400 && first.location) {
      const wm = first.location.match(/[?&]v=([\w-]{11})/)
      if (wm) videoId = wm[1]
      else videoId = extractLiveId((await fetchPage(first.location)).body)
    } else {
      videoId = extractLiveId(first.body)
    }
  } catch {
    videoId = null
  }

  cache.set(channelId, { videoId, ts: Date.now() })
  return { videoId, isLive: !!videoId }
}
