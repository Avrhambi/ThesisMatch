# Design — Research Finder

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

**Scope note:** Research Finder has no marketing pages — `app/page.tsx` redirects
straight to `/researchers`. Every screen is authenticated app UI (list, detail
tabs, modals, forms). Hallmark's marketing macrostructure/hero/footer catalog
does not apply here; this system applies Hallmark's token discipline (OKLCH
palette, type pairing, 4pt spacing, motion, 8-state interactive components,
focus rings, anti-slop typography) to real app UI instead of picking a
hero/footer archetype.

## Genre
editorial

## Macrostructure family
One family: **App Shell** (custom, non-marketing — not from the 21-macro
catalog). A fixed masthead-style topbar, content in a single readable column
(max 72rem) with generous top padding, no hero, no footer archetype. Variation
knobs per page type:

- **List view** (`/researchers`): filter toolbar + card-per-row list + pagination.
- **Detail view** (`/researchers/[id]`, `/researchers/[id]/outreach`): tabbed
  panel layout — heading block, then stacked panel cards (Analysis, Papers,
  Evidence, Outreach, Contact timeline).
- **Modal** (profile/CV editor): centered card over a scrim, same card voice
  as detail panels.

No enrichment on any page — function carries the page.

## Theme
- `--color-paper`      oklch(97% 0.006 250)
- `--color-paper-2`    oklch(94% 0.008 250)
- `--color-rule`       oklch(85% 0.008 250)
- `--color-neutral`    oklch(58% 0.010 250)
- `--color-muted`      oklch(42% 0.010 250)
- `--color-ink`        oklch(20% 0.012 250)
- `--color-accent`     oklch(52% 0.16 258)   /* indigo-blue — links, primary actions, focus */
- `--color-accent-ink` oklch(98% 0.01 258)   /* text on filled accent */
- `--color-focus`      oklch(60% 0.17 258)
- Semantic status (functional, not decorative — needed for the decision/status workflow):
  - `--color-success` oklch(52% 0.13 145) / `--color-success-bg` oklch(94% 0.03 145)
  - `--color-warning` oklch(62% 0.15 70)  / `--color-warning-bg` oklch(93% 0.04 70)
  - `--color-danger`  oklch(55% 0.17 25)  / `--color-danger-bg`  oklch(94% 0.03 25)

Accent hue: cool (258°) — consistent with the product's existing blue primary
action color. One accent; the three status colors are functional signals, not
decorative accents, and stay off large fills (badges/borders only).

## Typography
- Display: **Fraunces**, weight 600, style normal — headings, wordmark
- Body: **IBM Plex Sans**, weight 400 (500/600 for emphasis) — all UI text
- Mono (outlier, ≤2 slots — pagination counters + timestamps): **JetBrains Mono**, weight 400
- Display tracking: -0.02em
- Scale anchor: 1.25 ratio, base 16px (see `tokens.css`)

## Spacing
4-point named scale. Values in `tokens.css`. Pages use named tokens
(`p-md`, `gap-lg`, Tailwind utilities generated from `--spacing-*`), never
raw pixel/rem values.

## Motion
- Easing: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
- Durations: `--dur-short: 160ms`, `--dur-med: 220ms`
- Reveal pattern: none — this is app UI, not a scroll-revealed page
- Reduced-motion fallback: opacity-only, ≤150ms

## Microinteractions stance
- Silent success on inline saves (personal note autosave, decision change) — no toast
- Explicit loading/error states for network actions (refresh, profile load)
- Hover delay 800ms / focus delay 0ms on any tooltip
- Focus ring always instant, never animated in

## CTA voice
- Primary: filled `--color-accent`, `--color-accent-ink` text, `--radius-input` corners, medium weight
- Secondary: `--color-paper-2` fill, `--color-ink` text, hairline `--color-rule` border
- Destructive/reset actions: `--color-danger` text on `--color-paper-2` fill

## Per-page allowances
- No page uses enrichment (no marketing pages exist in this app).
- All pages share the App Shell family; they vary only in the content layout
  knob (list / detail-tabs / modal) described above.

## What pages MUST share
- The wordmark (`Research Finder`, Fraunces 600).
- The accent colour and its placement (links, primary buttons, focus rings, active states only).
- Fraunces + IBM Plex Sans pairing, JetBrains Mono for the two outlier slots.
- CTA voice (button shape, radius, padding rhythm) above.
- Card voice: `--color-paper` surface, hairline `--color-rule` border, `--radius-card` corners.

## What pages MAY differ on
- The content-layout knob (list vs. detail-tabs vs. modal) within the App Shell family.

## Exports

### tokens.css
See [`tokens.css`](tokens.css) at the project root — canonical source, imported by `app/globals.css`.
