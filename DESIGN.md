# Design System: Crypto Trading Assistant

Source of truth for the frontend's look. Tokens live in `frontend/src/styles/tokens.css`; change them there and here together.

## 1. Visual Theme & Atmosphere

A paper-trading desk at night. The page is a flat graphite field with off-white ink, one cool signal colour for action and the main data series, and one warm amber used only when the product wants to warn, flag or label something as simulated. There are no gradients, glows, glass panels or decorative shapes. Hierarchy comes from scale and from small steps in tone between surfaces.

The idea behind the landing page: the product's output is a written reason. Every AI trade is stored with a plain-English explanation, so the headline is the promise ("Every trade, explained.") and the page sets that sentence large before anything else.

The dashboard is a data terminal: dense, tabular, quiet. Numbers carry their sign in the text. Profit and loss colours appear only where a number's direction is the point.

**Key characteristics**
- Dark first. Light mode is not built; do not half-build it.
- One typeface family (Public Sans) at a few weights. Tabular figures on anything numeric.
- One primary accent (Signal) and one highlight accent (Amber). Green and red are semantic, text only.
- Surfaces separate by tone steps. Borders appear only inside the app (panels, tables, inputs) and stay at low contrast.
- Motion is limited to a masked headline reveal, small entrance rises and control feedback. All of it stops under `prefers-reduced-motion`.
- Every signal or recommendation sits near a "Not financial advice" notice.

## 2. Color Palette & Roles

| Token | Hex | Role |
|---|---|---|
| `--ground` | `#0C1013` | Page background |
| `--surface` | `#131A1E` | Panels, cards, table body |
| `--raised` | `#1B242A` | Inputs, hovered rows, inverse-free emphasis fields |
| `--border` | `#2A353C` | Quiet dividers inside the app only (decorative, not a boundary) |
| `--border-input` | `#6A7A82` | Input and button outlines that must be seen (3:1 on surface) |
| `--ink` | `#EDF2F1` | Primary text, all running copy |
| `--ink-muted` | `#A4B1B5` | Secondary text, labels (4.5:1 or better on every surface) |
| `--signal` | `#55C2E8` | Primary accent: CTA fill, main chart series, selection line, focus ring |
| `--signal-ink` | `#06222D` | Text on a Signal fill |
| `--amber` | `#F0B44C` | Highlight accent: alerts, AI trade markers, paper-trading notice |
| `--up` | `#5CC49A` | Positive number (text only) |
| `--down` | `#EB7A72` | Negative number (text only) |
| `--field-signal` | `--signal` | The one full-bleed colour field (the call to action band) |

Contrast (WCAG 2.x, measured with `frontend/scripts/contrast.mjs`; AA needs 4.5 for text, 3 for large text and UI):

| Pair | Ratio |
|---|---|
| ink on ground | 16.9 |
| ink on surface | 15.6 |
| ink-muted on ground | 8.7 |
| ink-muted on surface | 8.0 |
| ink-muted on raised | 7.2 |
| signal on ground | 9.3 |
| signal-ink on signal | 8.1 |
| amber on surface | 9.5 |
| up on surface | 8.2 |
| down on surface | 6.3 |
| down on raised | 5.7 |
| input-border on surface | 4.0 (UI component boundary, needs 3) |

Rules: signal is never a large background except the single call-to-action band; amber is never a button; up/down are never backgrounds.

## 3. Typography Rules

One family: **Public Sans** (Google Fonts, weights 400/500/600/700), falling back to `system-ui, sans-serif`. No monospace anywhere; figures use `font-variant-numeric: tabular-nums`.

| Role | Size | Weight | Leading | Tracking | Use |
|---|---|---|---|---|---|
| Display | `clamp(3.5rem, 15vw, 14rem)` | 700 | 0.92 | -0.04em | Landing hero (two lines) |
| Statement | `clamp(2.25rem, 5.4vw, 5rem)` | 700 | 1.0 | -0.03em | Section headings on the landing page |
| Heading | `clamp(1.75rem, 3vw, 2.5rem)` | 600 | 1.1 | -0.02em | Page titles in the app |
| Lead | `clamp(1.125rem, 1.4vw, 1.375rem)` | 400 | 1.5 | 0 | Supporting sentences |
| Body | 1rem | 400 | 1.55 | 0 | Running text (never smaller than 16px on the landing page) |
| App body | 0.875rem | 400 | 1.45 | 0 | Tables and panels inside the app |
| Small | 0.8125rem | 400/500 | 1.4 | 0 | Notes, axis labels (13px floor) |

Headlines are sentence case, left aligned, two lines or fewer at every width. No eyebrow labels, no tracked uppercase.

## 4. Component Stylings

**Buttons.** One shape: 8px radius, 44px minimum height.
- Primary: `--signal` fill, `--signal-ink` text, 600 weight. Hover: ink fill darkens one step (`#7DD2F0` lighter). Focus: 2px outline `--signal` offset 3px.
- Secondary: `--raised` fill, `--ink` text. Hover: `--border` fill.
- Buy / sell: secondary shape, with `--up` / `--down` text and the same fill. They are the only places those colours act as actions.
- Disabled: 45% opacity, `not-allowed`.

**Selection.** Tabs, ranges and the active nav item are marked by a 2px `--signal` line under the label, as wide as the label.

**Panels.** `--surface` fill, 1px `--border`, 10px radius, 20px padding. No nesting: a panel never contains another bordered panel.

**Inputs.** `--raised` fill, 1px `--border-input`, 8px radius, 44px height. Focus replaces the border with `--signal`. Every input has a visible label.

**Tables.** 38px header in `--ink-muted`, 42px rows, 1px `--border` between rows, figures right aligned and tabular.

**Notices.** The paper-trading notice and the risk notice use `--amber` text and a 3px `--amber` left bar on `--surface`. Never a pill badge.

**Charts.** Main series `--signal` 2px. AI buy markers are `--amber` triangles, sells `--amber` diamonds with a `--ink` outline; the shape, not the colour alone, tells them apart. Grid lines `--border`. Axes `--ink-muted`. Tooltips use `--raised` with `--ink` text.

**Navigation.** Plain bar: wordmark, three links, one action. No glass, no floating pill.

## 5. Layout Principles

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96, 160.
- One pair of outer margins: `clamp(16px, 4vw, 56px)`, equal on both sides at every width.
- Landing sections are separated by 120-200px of space on desktop and 72-96px on a phone.
- Landing page: a 12-column grid; each section uses a different horizontal position (left, right, full).
- App: content max width 1280px; 12-column grid; panels share a 16px gap.
- Border radius scale: 8px (controls), 10px (panels). No pills.

## 6. Depth & Elevation

None at rest. Depth is a tone step: ground, surface, raised. Only floating elements (chart tooltip, a menu) may have a shadow: `0 8px 24px rgba(0,0,0,0.4)`. Nothing glows. No gradients, no blur.

## 7. Do's and Don'ts

**Do**
- Set the one big statement very large and everything else small.
- Put the real interface (a working fragment of the app, with believable numbers) where other sites put a picture.
- Keep signal for action and the main series; keep amber for things the user should notice.
- Use text signs (`+2.4%`, `-$180.00`) so colour is never the only carrier of direction.
- State plainly that balances are simulated and that nothing here is financial advice.
- Keep the first screen of the landing page inside a 1280x720 viewport.

**Don't**
- Don't claim returns, accuracy or "AI-beating-the-market" anywhere. The backtest shows what it shows, including losses.
- Don't add a third accent, gradients, glass, glows, icon-topped cards or rows of identical cards.
- Don't use green or red as a card or button background outside buy/sell.
- Don't nest panels inside panels.
- Don't add motion that moves layout or colour of whole screens.
- Don't copy another brand's colours, fonts, logos or wording. The reference files informed structure and quality only.

## 8. Responsive Behavior

Breakpoints: 480, 768, 1024, 1280, 1536.

- Touch targets: 44x44px minimum.
- Landing hero keeps two lines at 13vw on a phone; the supporting sentence and the one button follow beneath, full width.
- The how-it-works bar turns vertical below 768px.
- The dashboard grid collapses to one column below 1024px; tables become two-line rows below 600px.
- Charts fill their container (responsive), never a fixed 900px.
- Reduced motion: transforms and reveals are removed; content is shown at once.

## 9. Agent Prompt Guide

**Quick reference**
- Ground `#0C1013`, surface `#131A1E`, raised `#1B242A`, border `#2A353C`
- Ink `#EDF2F1`, muted `#A4B1B5`
- Signal `#55C2E8` (on it: `#06222D`), Amber `#F0B44C`
- Up `#5CC49A`, down `#EB7A72`
- Public Sans, tabular figures, radius 8/10, no gradients, no shadows at rest

**Example prompts**
- "Build a panel on `--surface` with a 1px `--border`, 10px radius, 20px padding. Title 16px/600 in `--ink`, figures 20px tabular, signs in the text, labels 13px `--ink-muted`."
- "Add a notice: `--surface` background, 3px `--amber` left bar, text in `--ink`, the first words 'Not financial advice.' in `--amber` 600."
- "Landing section heading: Statement size, 700, -0.03em, two lines at most, left aligned on the page margin."

**Iteration guide.** Change tokens first, then components. Check contrast with `node frontend/scripts/contrast.mjs` after any colour change.
