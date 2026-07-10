# TradeX — Design Principles

The working checklist every screen is audited against. Distilled from
*Refactoring UI* (Wathan/Schoger), *The Design of Everyday Things* (Norman),
*Don't Make Me Think* (Krug), *Interaction of Color* (Albers, read in full),
*Designing Interfaces 3rd ed.* (Tidwell/Brewer/Valencia), *Color Design
Workbook* (Adams/Stone), *UI Design Principles* (Filipiuk), and *Laws of UX*
— bound to our tokens and to `BRAND.md`.

> Nothing is decoration. If an element doesn't inform or act, remove it.

---

## 1. Hierarchy is everything *(Refactoring UI ch. 2)*

- **Emphasize by de-emphasizing.** Don't make the hero louder — make its
  neighbors quieter. Dim competitors before brightening winners.
- **Weight + color before size.** Prefer `font-weight` and text tone
  (`--t-text-1/2/3`) over ever-larger font sizes.
- **Labels are secondary.** Combine value with context ("38 trades", "+2.4%
  today") instead of `Label: value`. When a label must exist, it is small,
  uppercase, letterspaced, `--t-text-3`.
- **One primary action per screen.** Gold (`.btn-gold`) for take-the-seat
  moments, Signal Blue for the working primary, quiet ghost buttons for the
  rest. Destructive actions are quiet until they're the point.
- Never grey text on colored backgrounds — use a tinted shade of the
  background hue instead.

## 2. Layout & spacing *(Refactoring UI ch. 3)*

- **Start with too much white space, then remove.** Cramped is a bug.
- **Spacing scale** (px): `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64`.
  No values between steps without a reason.
- Space **between** groups must be visibly larger than space **within**
  groups (proximity = grouping).
- Don't fill the screen because it's there — `max-width` containers,
  fixed-width elements where content wants it.
- Elements scale independently; nothing must scale proportionately.

## 3. Typography *(Refactoring UI ch. 4, Practical Typography)*

- **Type scale** (px): `10.5 · 12 · 13 · 14 · 16 · 18 · 22 · 28 · 34 · clamp() for heroes`.
  Pick from the scale; don't invent sizes.
- Line length 45–75 characters for prose; `line-height` shrinks as font
  size grows (headlines ~1.1, body ~1.5).
- Align mixed sizes by **baseline**, not center.
- All-caps labels get `letter-spacing: 0.06em+`; headlines get slightly
  negative tracking.
- Numbers are telemetry: monospace, `tabular-nums`, right-aligned in
  tables. A ticking price must never make the layout twitch.

## 4. Color *(Refactoring UI ch. 5, Albers, Adams)*

- Palette is fixed in `BRAND.md` — shades are defined up front, never
  invented inline. Machine = cool Signal Blue; human = warm Victory Gold;
  Verdant/Coral for P&L only; amber for caution.
- **Gold means victory** and stays scarce — measured performance, the apex,
  primary take-the-seat CTAs. Never wallpaper.
- Same color reads differently on different grounds (Albers) — tinted
  colors sit on their own `1e`–`33` alpha backing plates.
- **Never rely on color alone** (accessibility): P&L always carries a
  `+/−` sign; states also get icons, dots, or text.
- Contrast: 4.5:1 body text, 3:1 large text. Flip contrast (dark text on
  light tint) rather than shouting.

## 4b. Color interaction *(Albers: Interaction of Color)*

- **"We almost never see a color as it physically is."** Every token was
  tuned in situ, on its real ground — never approve a color from a swatch.
  Judge `--t-text-2` on `--t-surface`, P&L green inside a row, gold on tarmac.
- **The ground subtracts its own hue and its own light** from what sits on
  it. Our dusk-plum surfaces pull warmth out of foreground colors — that's
  why brand colors were re-tuned (not reused) when the background warmed.
- **Boundaries define depth**: soft boundary = nearness/connection, hard
  boundary = separation. That's the token version — related things share a
  surface with no line; separated things change surface, not add borders.
- **Vibrating boundaries are a defect**: contrasting hues at near-equal
  lightness (e.g. saturated red text on saturated blue) shimmer and feel
  aggressive. Keep hue contrast paired with lightness contrast.
- **Weber–Fechner**: perception of steps is logarithmic — an even-feeling
  ladder (our surface 1→2→3, shadow sm→md→lg) needs geometric, not equal,
  physical increments.
- **Quantity is a quality**: any two colors "go together" if proportions
  are right — dominant / subordinate / accent (gold is *only* ever accent).
  Changing amounts changes the mood without changing the cast.
- Visual memory is poor: never ask users to remember a color's meaning
  across screens — encode meaning redundantly (sign, icon, position).

## 5. Depth *(Refactoring UI ch. 6, Filipiuk)*

- **Light comes from above.** Raised = lighter top edge + shadow below;
  inset = shadow above.
- **Two-part shadows** via tokens only: a tight *contact* shadow for edge
  definition + a soft *ambient* shadow for elevation. Use
  `--t-shadow-sm/md/lg`; never hand-roll shadows.
- Depth by tint and light, not heavy borders. Prefer surface contrast
  (`--t-surface` vs `--t-surface-2`) and spacing over `1px` lines —
  **use fewer borders**.

## 6. Feedback & affordance *(Norman, Laws of UX)*

- Every action answers back: hover lift, press scale (global), loading
  labels ("Deploying…"), success/error states.
- Controls look like what they do; disabled looks dead, armed looks alive
  (risk-modal gold ignition is the reference pattern).
- Doherty: show something within 400ms — skeletons/spinners over silence.

## 7. Friction *(Krug: Don't Make Me Think)*

- Every form field must justify its existence. **Good defaults beat forced
  choices** — offer "Change", don't demand a decision (Hick's Law).
- Users don't read, they scan: front-load sentences, keep buttons verbs
  ("Take the seat", "Deploy bot"), never "Submit".
- Empty states are the first impression of every feature: drawn icon,
  one honest sentence, one CTA.
- **Forms** (Filipiuk): single column; labels stay visible (placeholders
  vanish); field width hints expected input; semantic groups separated by
  space; "(optional)" beats asterisks; validate in real time, never wipe
  entries on error. Buttons 40–60px tall, 44px minimum tap area, primary
  action on the right of a pair, consistent radius everywhere.
- **VIBs** (Very Important Buttons): when a click takes something from the
  user — real money, an open position — the label says exactly what happens
  ("Close position", "Withdraw $500"), never "Continue".

## 8. Images & icons *(Refactoring UI ch. 7)*

- Everything has an intended size — never scale bitmaps up, never scale
  detailed icons down; enclose small icons in shapes instead.
- Real logos for real things (instruments, payment networks, flags);
  drawn 2px-stroke SVG for everything else. **No emoji, ever.**
- Text over images requires engineered contrast (overlay/gradient),
  designed once, verified against the busiest crop.

## 9. Behavior patterns *(Tidwell ch. 1 — how traders actually act)*

- **Safe Exploration**: trying things must never hurt — back out of any
  screen cleanly, no dead ends, demo account is the sandbox; confirmations
  reserved for real loss (closing positions, withdrawing).
- **Instant Gratification**: the first thing a new user does must be
  stunningly easy — value before demands (never gate charts behind KYC;
  registration asks the minimum, "customize" is deferred).
- **Satisficing**: users click the first plausible thing. Labels are short
  verbs whose first guess is correct; layout communicates before words do.
- **Habituation**: identical gestures do identical things everywhere —
  buy is always right/gold-or-bull, cancel always left; never swap. Routine
  confirm dialogs train blind OK-clicking, so use them rarely.
- **Deferred Choices**: few required fields, good defaults, always
  editable later ("Raw Spread · USD — Change").
- **Spatial Memory**: people find things by *where they were* — don't
  rearrange navigation or reorder menus between visits; tops and bottoms of
  lists get noticed most.
- **Prospective Memory**: half-finished forms keep their values; alerts,
  watchlists and pinned symbols are the user's self-made reminders — never
  "helpfully" clean them up.
- **Streamlined Repetition**: traders repeat orders all day — one-click
  re-order, remembered size/leverage, keyboard-first order entry.

## 10. Data displays *(Tidwell ch. 9 — charts, tables, tickers)*

- **Preattentive variables win**: color, size, weight and alignment are
  read before conscious attention — a P&L table needs no scanning if sign
  is encoded in color *and* the eye-catching values differ in weight.
  Monotonous same-size text forces linear reading; that's a defect.
- **Layering**: color similarity makes related data float as one layer
  (all bull-green reads as one system across chart, book, and blotter).
- **Focus plus context**: zoom and detail must keep the big picture in
  reach (chart crosshair + visible axis; drill-downs return cleanly).
- **Let users rearrange**: sortable columns reveal stories alphabetical
  order hides; extremes (top/bottom of a sorted list) are what people read.
- **Datatips over labels**: hover/tap detail keeps dense canvases clean;
  show precise values on demand, qualitative shape by default.
- Text in graphics obeys type rules: tabular numbers, aligned, no boxed
  borders, nothing obscuring data.

## Audit ritual

Before shipping a screen, ask in order:

1. What should the eye land on first — does it?
2. What can be removed? (decoration test)
3. Where is it cramped? (add space, then trim)
4. Are all sizes/spaces/colors from the scales?
5. Does every action give feedback?
6. Would a first-time user need to think?
