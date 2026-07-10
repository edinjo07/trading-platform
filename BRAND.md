# TradeX — Brand Identity

## Motto

> **Engineered to win.**

## The story

An F1 car is not fast by accident. It is fast because hundreds of the best
engineers built every part of it for one purpose — and because nothing on it
is decoration. It exists to race, and it races to win.

TradeX is built with the same conviction. The homepage opens on the car
because the car **is** the brief:

- **Fast** — orders fill in milliseconds on live market data. No requotes,
  no lag. Pure pace.
- **Built by engineers** — the platform is a set of engineered systems, not
  features: an execution engine, a risk safety-cell, an automation pit wall,
  a telemetry deck.
- **Aimed at winning** — everything measurable, everything accountable.
  Every lap is timed. Every trade has a number.

### The X is the apex

In racing, everything is decided at the **apex** — the one point in a corner
where the racing line touches the geometry of the track, where maximum speed
meets total control. Get it right and you carry speed down the whole straight.
Get it wrong and no engine can save you.

The X in TradeX is that point. The logomark draws it literally: the **racing
line** sweeps through in Signal Blue, the **track's geometric line** cuts
across in slate, and the point where they meet — the apex — is marked in
**Victory Gold**.

## The language of the team

Racing vocabulary maps onto the product, used with restraint:

| Racing | TradeX |
|---|---|
| The engine | Execution engine — millisecond fills |
| The pit wall | TradePilot — bots that read telemetry (confluence, news) and refuse to gamble |
| The safety cell | Risk engineering — SL/TP, margin protection, daily loss limits |
| Telemetry | Analytics — live equity, drawdown, attribution |
| Practice laps | The $100,000 demo account |
| Lights out | Going live |

## Voice

An engineer's voice, not a gambler's: calm, precise, confident. Short
sentences. Real numbers. Speed is stated as a measurement, never as hype.
No exclamation marks, no pictograph emojis. When something is risky, say so
plainly — a good pit wall never lies to its driver.

## Visual language

| Token | Value | Name | Role |
|---|---|---|---|
| `--t-bg` | `#0b0f1a` | **Midnight Tarmac** | The background — a circuit at night. |
| `--t-accent` | `#4f8cff` | **Signal Blue** | The single accent. The racing line: actions, focus, decisions. |
| accent 2 | `#f6c453` | **Victory Gold** | Used sparingly — the apex, telemetry numbers, P1 moments. |
| `--t-bull` | `#18c98a` | **Verdant** | Gains. Confident, not neon. |
| `--t-bear` | `#ff5a72` | **Coral** | Losses. Serious, never alarmist. |
| `--t-text-1` | `#e9eef8` | **Ink** | Primary text. |
| ambient | `--t-bg-glow` | **Undercurrent** | Faint radial washes behind the UI. Alive, never loud. |

Rules:

1. **Nothing is decoration.** Every element earns its place, like a part on
   the car. If it doesn't inform or act, it's removed.
2. **Gold means victory.** Victory Gold appears only where performance is
   measured or won: telemetry values, the apex dot, rank badges, key CTA
   accents. Never as wallpaper.
3. **One racing line.** Signal Blue is the only interactive accent.
4. **Numbers are telemetry.** Monospace, tabular, aligned — they must read
   like a pit-wall screen, and never jitter.
5. **Iconography is drawn.** 2px-stroke SVG, geometric. No pictograph emojis.

## The mark

- `BrandMark` — deep tile: speed trails, the slate geometric line, the Signal
  Blue racing line, the Victory Gold apex dot. Legible from 16px.
- `BrandLogo` — mark + wordmark `TradeX` (X in Signal Blue) + optional
  "ENGINEERED TO WIN" tagline.
- Source of truth: `client/src/components/ui/BrandMark.tsx` and
  `client/public/logo.svg`.

## Usage

- Homepage hero: the car, treated cinematically; headline "Engineered to win."
- Auth: mark + wordmark + motto above the form.
- Browser tab: `TradeX Pro — Engineered to win.`
- Sign-off line (footers, docs): *The X is the apex.*
