---
version: 1.0
name: Mouna8amti
description: >
  A calm, trustworthy operating system for NGOs. Notion's warm product chassis
  (warm neutrals, hairlines instead of shadows, pastel category tints) governed
  by Apple's discipline (one interactive colour, receding chrome, tight display
  headlines, a single elevation shadow, press-to-scale micro-interaction).
  Signature: deep "Mizan" teal, a sparing sand-gold highlight, an 8-point
  geometric star, and Arabic-first typography that is generous, never small.
derived_from:
  - notion   # getdesign.md/notion — VoltAgent/awesome-design-md (MIT)
  - apple    # getdesign.md/apple  — VoltAgent/awesome-design-md (MIT)

colors:
  # Brand
  primary: "#0f766e"            # Mizan teal — the ONLY interactive colour
  primary-hover: "#0d6961"
  primary-pressed: "#0b5952"
  primary-soft: "#e3f2ef"       # selected rows, active nav background
  on-primary: "#ffffff"
  gold: "#c8a24a"               # highlight only: focus of premium moments, star motif
  gold-soft: "#f6eedb"
  night: "#0b1716"              # Apple-style dark tile: auth & landing brand panels only
  # Neutrals (Notion warm scale)
  canvas: "#ffffff"             # cards, tables, dialogs
  surface: "#fafaf9"            # app background
  surface-sunken: "#f6f5f4"     # sidebar, table header, inputs at rest
  hairline-soft: "#ede9e4"
  hairline: "#e5e3df"
  hairline-strong: "#c8c4be"
  ink: "#1a1a1a"                # headings, figures
  charcoal: "#37352f"           # body
  slate: "#5d5b54"              # secondary text
  steel: "#787671"              # captions, placeholders
  stone: "#a4a097"              # disabled
  # Semantic
  success: "#1a7f37"
  success-soft: "#dcf3e3"
  warning: "#b45309"
  warning-soft: "#fdf0dc"
  danger: "#c92a2a"
  danger-soft: "#fde4e4"
  info: "#0b6bcb"
  info-soft: "#dcecfa"
  # Category tints (Notion database palette) — projects, budget categories, donor types
  tint-peach: "#ffe8d4"
  tint-rose: "#fde0ec"
  tint-mint: "#d9f3e1"
  tint-lavender: "#e6e0f5"
  tint-sky: "#dcecfa"
  tint-yellow: "#fef7d6"
  tint-gray: "#f0eeec"

colors-dark:
  primary: "#2fb3a3"
  primary-hover: "#3cc4b4"
  primary-pressed: "#26988b"
  primary-soft: "#14302c"
  on-primary: "#06201d"
  gold: "#d9b864"
  gold-soft: "#2e2716"
  canvas: "#1f1f1e"
  surface: "#171716"
  surface-sunken: "#141413"
  hairline-soft: "#262625"
  hairline: "#2f2f2d"
  hairline-strong: "#45443f"
  ink: "#f5f4f0"
  charcoal: "#e3e1db"
  slate: "#b5b2aa"
  steel: "#8f8c84"
  stone: "#66645e"

typography:
  families:
    display: "Readex Pro"             # Arabic + Latin, geometric
    body: "IBM Plex Sans Arabic"      # Arabic + Latin, built for tables and figures
    mono: "IBM Plex Mono"             # references, codes
  numerals: tabular-nums              # every amount, every table column
  scale:                              # size / weight / line-height (Latin) / letter-spacing
    display-xl: [56px, 600, 1.08, -1.2px]   # page hero numbers, landing
    display-lg: [44px, 600, 1.1, -0.8px]
    heading-1:  [34px, 600, 1.2, -0.5px]    # page title
    heading-2:  [26px, 600, 1.25, -0.3px]   # section title
    heading-3:  [20px, 600, 1.35, -0.1px]   # card title
    heading-4:  [18px, 600, 1.4, 0]
    body-lg:    [18px, 400, 1.6, 0]         # reading surfaces, onboarding
    body:       [16px, 400, 1.55, 0]        # default UI text
    body-strong:[16px, 500, 1.55, 0]
    table:      [15px, 400, 1.45, 0]        # data tables
    label:      [14px, 500, 1.4, 0]
    caption:    [13px, 400, 1.4, 0]         # absolute minimum anywhere
  arabic-adjustments:
    line-height-multiplier: 1.12      # Arabic needs taller lines (body ≈ 1.7)
    letter-spacing: 0                 # NEVER track Arabic; it breaks the joins
    min-size: 14px

rounded:
  xs: 6px      # chips inside inputs, kbd
  sm: 8px      # buttons, inputs
  md: 12px     # cards, popovers
  lg: 16px     # dialogs, sheets, hero cards
  pill: 9999px # status badges, segmented controls, avatars

spacing: [0, 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 96px]

elevation:
  flat: "none"                                          # default — hierarchy comes from surface colour + hairlines
  hairline: "0 0 0 1px {colors.hairline}"
  float: "0 1px 2px rgb(15 15 15 / .04), 0 8px 24px -6px rgb(15 15 15 / .12)"   # the ONE shadow: popovers, dialogs, dropdowns, ⌘K
  blur: "backdrop-filter: saturate(180%) blur(16px)"    # sticky top bar only

motion:
  durations: { fast: 120ms, base: 220ms, slow: 400ms }
  easings:
    standard: "cubic-bezier(0.2, 0, 0, 1)"        # most transitions
    emphasized: "cubic-bezier(0.3, 0, 0, 1.15)"   # entrances with a hint of overshoot
    exit: "cubic-bezier(0.4, 0, 1, 1)"
  spring: { stiffness: 420, damping: 32 }          # layout & shared-element transitions
  press-scale: 0.97                                # every button and pressable card
  page-enter: "opacity 0→1, translateX(±8px)→0 (sign follows reading direction)"
  reduced-motion: "crossfade only, durations ≤ 120ms"

components:
  button-primary:   { bg: primary, fg: on-primary, radius: sm, height: 40px, padding: "0 16px", typography: label }
  button-secondary: { bg: canvas, fg: ink, border: hairline-strong, radius: sm, height: 40px }
  button-ghost:     { bg: transparent, fg: charcoal, hover-bg: surface-sunken, radius: sm, height: 36px }
  button-danger:    { bg: danger, fg: "#fff", radius: sm, height: 40px }
  input:            { bg: canvas, border: hairline-strong, focus-ring: "0 0 0 3px {primary-soft}, border primary", radius: sm, height: 44px, typography: body }
  card:             { bg: canvas, border: hairline, radius: md, padding: 24px, shadow: flat }
  stat-card:        { bg: canvas, border: hairline, radius: md, padding: 24px, value: display-lg tabular }
  status-badge:     { radius: pill, height: 26px, padding: "0 10px", typography: label, bg: "<semantic>-soft", fg: "<semantic>" }
  table:            { header-bg: surface-sunken, row-height: 52px, row-hover: surface, border: hairline-soft, typography: table }
  sidebar:          { bg: surface-sunken, width: 272px, item-height: 40px, active: "primary-soft bg + primary fg" }
  topbar:           { height: 64px, bg: "surface @ 80% + blur", border-bottom: hairline-soft }
  dialog:           { bg: canvas, radius: lg, shadow: float, max-width: 560px }
  command-palette:  { bg: canvas, radius: lg, shadow: float, width: 640px }
  budget-bar:       { height: 8px, radius: pill, track: surface-sunken, consumed: primary, committed: gold, over: danger }
---

# Mouna8amti design system

## Overview

Mouna8amti handles other people's money: grants from donors, spent by NGOs
on behalf of communities. The interface has one job: make that money **legible
and trustworthy**. The visual language says "calm, exact, accountable" the
moment the page loads.

We take the **chassis from Notion**. The neutral scale is warm (paper, not
blue-grey). Hierarchy comes from surface colour and hairlines, not drop
shadows. Pastel category tints carry the colour vocabulary of the data.

We take the **discipline from Apple**. There is exactly one interactive colour.
The chrome steps back so the content (figures, statuses, people) speaks.
Display headlines are tight. One shadow exists in the whole system. Every
pressable element answers with a small scale.

Our **signature** sits on top of both:

- Mizan teal (`#0f766e`) is the colour of action and of balance.
- Sand gold (`#c8a24a`) is used sparingly: the logo star, the "committed"
  segment of a budget bar, premium empty states.
- An 8-point geometric star echoes the "8" in Mouna8amti. It appears only on
  the login, onboarding, empty states and PDF watermarks.
- Arabic is a first-class citizen with its own line-height and minimum size.

## Principles

1. **Numbers are the hero.** Amounts use tabular numerals, the display face
   and generous size. A director should read the remaining budget from across
   the room.
2. **One action colour.** If it is teal, you can click it. Status colours
   (success, warning, danger) never act as buttons.
3. **Hairlines, not shadows.** Cards are white on a warm background with a
   1 px hairline. The `float` shadow belongs only to layers that sit above the
   page: popover, dropdown, dialog, ⌘K.
4. **Never small.** Body 16 px, tables 15 px, and nothing under 13 px. Arabic
   never goes under 14 px.
5. **Motion explains, it does not decorate.** On work screens, animation shows
   what changed (a row that moved, a budget that filled, an approval step that
   completed). Effects in the spirit of React Bits are allowed only on the
   landing page, login, onboarding and empty states.
6. **Direction-agnostic.** Use logical properties only (`ms-*`, `pe-*`,
   `start`, `end`). Directional icons mirror. Page transitions follow the
   reading direction.

## Colour usage

| Need | Token |
|---|---|
| App background | `surface` |
| Cards, tables, dialogs | `canvas` |
| Sidebar, table header, resting inputs | `surface-sunken` |
| Dividers | `hairline-soft` (inside cards), `hairline` (card borders) |
| Headings & figures | `ink` |
| Body | `charcoal` |
| Secondary / meta | `slate`, `steel` |
| Clickable | `primary` |
| Selected / active | `primary-soft` background + `primary` text |
| Category chips (budget categories, donor types, project tags) | `tint-*` background + `charcoal` text |

Status → colour is fixed across every module:

| Status | Colour |
|---|---|
| draft | gray |
| pending / in review | warning |
| approved / active / paid | success |
| rejected / voided / over budget | danger |
| on hold / closed | info / gray |

## Typography

- **Readex Pro** is used for display (titles, KPI values, logo wordmark). It
  is a geometric face that gives Arabic and Latin one shared voice.
- **IBM Plex Sans Arabic** is used for everything else. It was designed for
  interfaces and dense data, and it has excellent figures.
- Letter-spacing applies only to Latin display sizes (`html[lang] :not(:lang(ar))`).
  Arabic is never tracked.
- Arabic line-height = Latin line-height × 1.12.
- Figures in tables are aligned to the end edge and use `tabular-nums`.

## Layout

- App shell: sidebar 272 px (collapsible to 72 px icons), top bar 64 px with
  blur, content max-width 1440 px, page padding 32 px (16 px on mobile).
- Page anatomy: breadcrumb → title (`heading-1`) and primary action on the
  same line → optional KPI strip → content cards.
- Grid: 12 columns, 24 px gutters; KPI strip = 4 cards on desktop, 2 on
  tablet, horizontal scroll-snap on mobile.

## Motion

| Moment | Treatment |
|---|---|
| Route change | Content fades and slides 8 px from the reading-start side, `base`/`standard` |
| List load | Rows stagger in at 24 ms intervals, max 12 rows animated |
| KPI value | Counts up from 0 over `slow` on first reveal only |
| Budget bar | Fills from start edge over `slow`/`emphasized` when it enters the viewport |
| Approval step done | Check-mark path draws in, then the timeline connector fills to the next step |
| Dialog / ⌘K | Scale 0.96→1 + fade, `base`/`emphasized`; backdrop fades `fast` |
| Button press | Scale to 0.97 while pressed, spring back |
| Toast | Slides from the bottom-end corner, auto-dismiss 5 s, pausable on hover |

`prefers-reduced-motion: reduce` replaces every movement with a ≤ 120 ms
crossfade.

## Do's and Don'ts

**Do**
- Do put the most important figure of every page in `display-lg`.
- Do pair every status with a word. Colour alone is not enough.
- Do give every list an illustrated empty state that names the action to take.
- Do use skeletons that match the final layout. Never use a lone spinner on a
  page.

**Don't**
- Don't introduce a second action colour, a gradient background on a work
  screen, or glassmorphism cards.
- Don't put a shadow on a card or a button.
- Don't use font sizes under 13 px, or track Arabic text.
- Don't use `left`/`right` in CSS, or icons that point in a fixed direction.
- Don't animate on scroll inside work screens.
