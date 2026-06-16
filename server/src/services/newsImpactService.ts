/**
 * newsImpactService.ts
 *
 * Event-driven, instrument-specific news analysis for TradePilot bots.
 *
 * Unlike newsService's keyword sentiment (which scores headline *tone*), this
 * service reasons about the *causal price impact* of news on a SPECIFIC
 * instrument — e.g. "Iran peace deal + Hormuz reopens" is positive-toned but
 * BEARISH for crude oil because it eases supply risk.
 *
 * Two backends behind one interface:
 *   • Claude (claude-opus-4-8) when ANTHROPIC_API_KEY is set — genuine causal
 *     reasoning with a structured JSON verdict.
 *   • Rules-based event lexicon fallback otherwise — maps geopolitical/macro
 *     event phrases to a per-asset-class directional bias. Always available.
 *
 * Results are cached 15 min per symbol. The bot reads the cache synchronously
 * (getCachedNewsImpact) and triggers async refreshes, so a tick never blocks
 * on the network or the model.
 */

import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config'
import { getSentiment, getMacroNews } from './newsService'
import { getSymbolInfo, getAssetClass } from './mockDataService'

export type ImpactDirection = 'bullish' | 'bearish' | 'neutral'

export interface NewsImpact {
  symbol:     string
  direction:  ImpactDirection
  confidence: number          // 0 … 1
  rationale:  string          // one-sentence explanation of the causal link
  drivers:    string[]        // key events driving the verdict
  headlines:  string[]        // headlines considered
  source:     'claude' | 'rules'
  fetchedAt:  string
}

const CACHE_TTL_MS = 15 * 60 * 1_000
const cache = new Map<string, { data: NewsImpact; ts: number }>()
const inflight = new Set<string>()

// ─── Asset bucket resolution ───────────────────────────────────────────────────

type Bucket = 'energy' | 'metals' | 'risk' | 'fx' | 'bond'

const ENERGY_SYMBOLS = new Set(['WTI', 'BRENT', 'XBRUSD', 'NGAS', 'HO'])
const METAL_SYMBOLS  = new Set(['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'GC25'])

function assetBucket(symbol: string): Bucket {
  if (ENERGY_SYMBOLS.has(symbol)) return 'energy'
  if (METAL_SYMBOLS.has(symbol))  return 'metals'
  const cls = getAssetClass(symbol)
  if (cls === 'forex') return 'fx'
  if (cls === 'bond')  return 'bond'
  return 'risk' // stocks, indices, crypto, generic commodities
}

function instrumentLabel(symbol: string): string {
  const info = getSymbolInfo(symbol)
  const cls  = getAssetClass(symbol)
  return info ? `${symbol} (${info.name}, ${cls})` : symbol
}

// ─── Headline gathering ─────────────────────────────────────────────────────────

async function gatherHeadlines(symbol: string): Promise<string[]> {
  const titles: string[] = []
  try {
    const s = await getSentiment(symbol)
    for (const h of s.headlines) titles.push(h.title)
  } catch { /* ignore */ }
  try {
    // Macro/geopolitical context matters most for commodities, FX and indices,
    // where the price-moving event ("peace deal", "OPEC cut", "rate hike") is
    // rarely tagged to the instrument's own ticker.
    const macro = await getMacroNews()
    for (const m of macro.slice(0, 12)) titles.push(m.title)
  } catch { /* ignore */ }
  // Dedup by lowercased prefix, cap length
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of titles) {
    const key = t.slice(0, 60).toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= 18) break
  }
  return out
}

// ─── Claude backend ─────────────────────────────────────────────────────────────

const IMPACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    direction:  { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
    confidence: { type: 'number', description: '0 to 1 — strength of the directional read' },
    rationale:  { type: 'string', description: 'One sentence explaining the causal link to THIS instrument' },
    drivers:    { type: 'array', items: { type: 'string' }, description: 'Key events behind the verdict' },
  },
  required: ['direction', 'confidence', 'rationale', 'drivers'],
} as const

let client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!config.anthropicApiKey) return null
  if (!client) client = new Anthropic({ apiKey: config.anthropicApiKey })
  return client
}

async function analyzeWithClaude(symbol: string, headlines: string[]): Promise<NewsImpact | null> {
  const anthropic = getClient()
  if (!anthropic || headlines.length === 0) return null

  const system =
    'You are a markets analyst for an automated trading system. Given recent news ' +
    'headlines, judge the likely SHORT-TERM price impact on ONE specific instrument. ' +
    'Reason causally about supply/demand, risk appetite, rates and geopolitics — not ' +
    'headline tone. A positive-sounding event can be bearish for an instrument (e.g. a ' +
    'Middle-East peace deal reopening the Strait of Hormuz eases supply risk and is ' +
    'BEARISH for crude oil). If nothing clearly moves this instrument, answer neutral ' +
    'with low confidence. Respond only with the JSON verdict.'

  const user =
    `Instrument: ${instrumentLabel(symbol)}\n\n` +
    `Recent headlines:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}\n\n` +
    `What is the likely short-term price direction for ${symbol}, and why?`

  try {
    const resp = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema: IMPACT_SCHEMA } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    if ((resp as { stop_reason?: string }).stop_reason === 'refusal') return null

    const textBlock = resp.content.find(b => b.type === 'text') as { text?: string } | undefined
    if (!textBlock?.text) return null
    const parsed = JSON.parse(textBlock.text) as {
      direction: ImpactDirection; confidence: number; rationale: string; drivers: string[]
    }
    const dir = (['bullish', 'bearish', 'neutral'] as const).includes(parsed.direction)
      ? parsed.direction : 'neutral'
    return {
      symbol,
      direction:  dir,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      rationale:  String(parsed.rationale ?? '').slice(0, 280),
      drivers:    Array.isArray(parsed.drivers) ? parsed.drivers.slice(0, 5).map(String) : [],
      headlines,
      source:     'claude',
      fetchedAt:  new Date().toISOString(),
    }
  } catch (err) {
    console.warn(`[NewsImpact] Claude analysis failed for ${symbol}:`, err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Rules-based fallback (event lexicon) ───────────────────────────────────────

/**
 * Per-bucket keyword groups. Each group lists phrases that push the instrument
 * BULLISH or BEARISH. Matching is substring, case-insensitive.
 */
const LEXICON: Record<Bucket, { bullish: string[]; bearish: string[] }> = {
  energy: {
    // Oil/gas rise on supply risk; fall on de-escalation and demand weakness.
    bullish: ['war', 'attack', 'strike on', 'missile', 'conflict', 'sanction', 'embargo',
              'hormuz clos', 'supply disruption', 'output cut', 'opec cut', 'production cut',
              'pipeline', 'hurricane', 'outage', 'escalat', 'tensions rise', 'invasion'],
    bearish: ['peace', 'ceasefire', 'cease-fire', 'truce', 'deal', 'de-escalat', 'deescalat',
              'sanctions lifted', 'hormuz open', 'reopen', 'opec raise', 'raise output',
              'increase output', 'boost production', 'oversupply', 'inventory build',
              'demand slump', 'recession', 'glut'],
  },
  metals: {
    // Gold/silver rise on fear, inflation, easing; fall on risk-on and tightening.
    bullish: ['war', 'conflict', 'crisis', 'inflation', 'rate cut', 'recession', 'uncertain',
              'escalat', 'tension', 'safe haven', 'weak dollar', 'stimulus'],
    bearish: ['peace', 'ceasefire', 'truce', 'deal', 'de-escalat', 'rate hike', 'hawkish',
              'strong dollar', 'risk-on', 'risk on'],
  },
  risk: {
    // Stocks/indices/crypto rise on easing/growth; fall on tightening/conflict.
    bullish: ['rate cut', 'dovish', 'stimulus', 'beat', 'beats', 'strong', 'growth', 'deal',
              'peace', 'ceasefire', 'rally', 'surge', 'upgrade', 'record high', 'soft landing'],
    bearish: ['rate hike', 'hawkish', 'recession', 'crash', 'selloff', 'sell-off', 'miss',
              'weak', 'war', 'conflict', 'sanction', 'tariff', 'downgrade', 'default', 'crisis'],
  },
  fx: {
    bullish: ['rate hike', 'hawkish', 'strong data', 'beats forecast', 'risk-on'],
    bearish: ['rate cut', 'dovish', 'recession', 'weak data', 'crisis', 'intervention'],
  },
  bond: {
    // Bond *prices* rise when yields fall (cuts, risk-off); fall when yields rise.
    bullish: ['rate cut', 'dovish', 'recession', 'risk-off', 'safe haven', 'flight to quality'],
    bearish: ['rate hike', 'hawkish', 'inflation', 'strong data', 'hot cpi'],
  },
}

function analyzeWithRules(symbol: string, headlines: string[]): NewsImpact {
  const bucket = assetBucket(symbol)
  const lex    = LEXICON[bucket]
  const hay    = headlines.join('  ||  ').toLowerCase()

  const hits = (words: string[]) => words.filter(w => hay.includes(w))
  const bull = hits(lex.bullish)
  const bear = hits(lex.bearish)

  const net   = bull.length - bear.length
  const total = bull.length + bear.length
  let direction: ImpactDirection = 'neutral'
  if (net >= 1)  direction = 'bullish'
  if (net <= -1) direction = 'bearish'

  // Confidence scales with the margin and total evidence, capped at 0.75 for rules.
  const confidence = total === 0 ? 0
    : Math.min(0.75, (Math.abs(net) / total) * 0.5 + Math.min(total, 4) * 0.08)

  const drivers = (direction === 'bearish' ? bear : direction === 'bullish' ? bull : [])
    .slice(0, 4)

  const rationale = direction === 'neutral'
    ? `No clear ${symbol}-moving catalyst in current headlines.`
    : `${bucket === 'energy' ? 'Energy' : bucket === 'metals' ? 'Metals' : bucket === 'bond' ? 'Rates' : bucket === 'fx' ? 'FX' : 'Risk'} read: ` +
      `${direction} on ${symbol} — signals: ${drivers.join(', ') || 'mixed'}.`

  return {
    symbol, direction, confidence: parseFloat(confidence.toFixed(2)),
    rationale, drivers, headlines, source: 'rules', fetchedAt: new Date().toISOString(),
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/** Full analysis with caching. Uses Claude when available, else the rules engine. */
export async function getNewsImpact(symbol: string): Promise<NewsImpact> {
  const cached = cache.get(symbol)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const headlines = await gatherHeadlines(symbol)
  const result = (await analyzeWithClaude(symbol, headlines)) ?? analyzeWithRules(symbol, headlines)
  cache.set(symbol, { data: result, ts: Date.now() })
  return result
}

/** Synchronous cache read (null if not cached / stale). For hot paths like bot ticks. */
export function getCachedNewsImpact(symbol: string): NewsImpact | null {
  const cached = cache.get(symbol)
  if (!cached || Date.now() - cached.ts > CACHE_TTL_MS) return null
  return cached.data
}

/** Fire-and-forget refresh; de-duplicates concurrent requests for the same symbol. */
export function refreshNewsImpact(symbol: string): void {
  if (inflight.has(symbol)) return
  inflight.add(symbol)
  getNewsImpact(symbol)
    .catch(() => { /* ignore */ })
    .finally(() => inflight.delete(symbol))
}
