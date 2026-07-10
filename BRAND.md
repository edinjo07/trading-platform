# TradeX — Brand Identity

## Motto

> **Trade the signal. Not the noise.**

## The story

Most traders don't lose to the market. They lose to noise — hype, clutter,
fear, a hundred flashing numbers demanding attention at once.

TradeX is built on one conviction: everything decisive in a market happens at
a **crossing**. Two moving averages cross, and a trend is born. Price crosses
a level, and a decision exists. Signal crosses noise, and — for one clear
moment — you can tell them apart.

**The X in TradeX is that crossing.** The logomark draws it literally: a
rising *signal line* in Signal Blue crossing a falling *noise line* in muted
slate, meeting at a single bright point. That point is where the platform
lives.

The motto is not decoration — it is how the product is engineered:

- **TradePilot** bots refuse trades without confluence, and veto entries that
  fight a confident news read. They act on signal; they wait out noise.
- **Risk guards** — margin closeout, daily loss limits, confirmation bars —
  silence the loudest noise of all: emotion.
- **The interface** is deep water: one calm dark-blue surface, one accent,
  tabular numbers that don't jitter, no pictograph clutter, nothing shouting.

## Voice

Calm, precise, honest. Short sentences. Real numbers. No hype, no exclamation
marks, no emojis. When something is risky, say so plainly. When data is
simulated, label it. The platform never sounds excited — the user brings the
excitement; we bring the clarity.

## Visual language

| Token | Value | Name | Role |
|---|---|---|---|
| `--t-bg` | `#0b0f1a` | **Deep Water** | The background. Calm under pressure. |
| `--t-accent` | `#4f8cff` | **Signal Blue** | The single accent. Decisions, actions, focus. |
| `--t-bull` | `#18c98a` | **Verdant** | Gains. Softened — confident, not neon. |
| `--t-bear` | `#ff5a72` | **Coral** | Losses. Serious, never alarmist. |
| `--t-text-1` | `#e9eef8` | **Ink** | Primary text — cool off-white, not clinical. |
| ambient | `--t-bg-glow` | **Undercurrent** | Faint blue/emerald/violet radial washes behind the UI. Alive, never loud. |

Rules of the language:

1. **One accent.** Signal Blue marks the interactive and the decisive. Nothing
   else competes with it.
2. **Numbers are typography.** Monospace, tabular, aligned. A price ticking
   must never make the layout twitch.
3. **No pictograph emojis.** Iconography is drawn — 2px-stroke SVG, geometric,
   quiet. A rank is a metallic disc, not a medal emoji.
4. **Depth by light, not lines.** Surfaces separate by subtle tint and ambient
   glow, not heavy borders.
5. **State speaks in color-temperature.** Verdant/Coral for P&L only. Amber
   for caution. Signal Blue for action. Grey for everything at rest.

## The mark

- `BrandMark` — the tile: crossing signal/noise lines with a bright crossing
  point. Works from 16px (favicon) to any size.
- `BrandLogo` — mark + wordmark `TradeX` (X in Signal Blue) + optional
  tagline line.
- Source of truth: `client/src/components/ui/BrandMark.tsx` and
  `client/public/logo.svg`.

## Usage

- Auth screens: mark + wordmark + motto, centered above the form.
- Sidebar: mark + wordmark, compact.
- Browser tab: `TradeX Pro — Trade the signal. Not the noise.`
