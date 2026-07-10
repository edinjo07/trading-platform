# TradeX — Design Principles

The working checklist every screen is audited against. Distilled from
*Refactoring UI* (Wathan/Schoger), *The Design of Everyday Things* (Norman),
*Don't Make Me Think* (Krug), *Laws of UX*, and classic color theory
(Albers, Adams) — bound to our tokens and to `BRAND.md`.

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

## 5. Depth *(Refactoring UI ch. 6)*

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

## 8. Images & icons *(Refactoring UI ch. 7)*

- Everything has an intended size — never scale bitmaps up, never scale
  detailed icons down; enclose small icons in shapes instead.
- Real logos for real things (instruments, payment networks, flags);
  drawn 2px-stroke SVG for everything else. **No emoji, ever.**
- Text over images requires engineered contrast (overlay/gradient),
  designed once, verified against the busiest crop.

## Audit ritual

Before shipping a screen, ask in order:

1. What should the eye land on first — does it?
2. What can be removed? (decoration test)
3. Where is it cramped? (add space, then trim)
4. Are all sizes/spaces/colors from the scales?
5. Does every action give feedback?
6. Would a first-time user need to think?
