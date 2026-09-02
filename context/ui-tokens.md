# UI Tokens

## Design Direction

Campus Companion should feel like a **calm, trustworthy campus utility with a live pulse**
— closer to a well-designed university intranet or transit board than a generic SaaS
dashboard or a playful consumer chat app. The product's core promise is "grounded, real-time
answers," so the visual language must reinforce accuracy and immediacy without feeling
sterile or corporate.

- **Visual personality:** clean, structured, quietly confident. Academic rather than
  corporate; utilitarian rather than decorative. Think campus signage and transit-board
  clarity, not marketing-site polish.
- **Emotional feel:** reassuring and current. A student should feel "this answer is real
  and up to date right now," not "this is a chatbot guessing." Live/updating data (e.g. an
  attendance count) should read as alive, not flashy.
- **Information density:** medium-high on the Newsletter Home and Admin Panel (these are
  scan-and-act surfaces with cards, tables, and lists); lower and more conversational on
  Ask Genie (a chat surface needs breathing room and clear turn-taking).
- **Hierarchy:** one dominant primary color reserved for key actions and live/interactive
  states; neutrals carry the majority of the UI; a single accent color marks
  time-sensitive or "happening now" information. Status is never conveyed by color alone.
- **Utility vs. polish balance:** favor utility. Every visual flourish must earn its place
  by improving scannability or trust (e.g. a subtle pulse on a live-updating number is
  earned; a decorative illustration is not). Polish comes from consistent spacing,
  alignment, and type hierarchy — not ornamentation.
- **Campus context:** the palette and type system should read as "official campus system"
  rather than "startup product" — restrained color use, clear labels, tabular alignment for
  schedules/availability, generous but not wasteful whitespace.
- **Genie interaction:** the Ask Genie surface uses the same tokens as the rest of the app
  (no separate "chat theme") but leans on more whitespace, a clear visual distinction
  between the user's question and Genie's grounded answer, and a distinct, consistently
  styled treatment for the "data basis" (SQL/result) shown under an answer, so transparency
  is always visually recognizable.

---

## Color System

Single light theme only — no dark mode is implemented for this hackathon.

| Token | Value | Usage | Contrast Notes |
|---|---|---|---|
| `--color-bg` | `#F6FAFE` | Page background | Base canvas — barely-tinted cool paper |
| `--color-surface` | `#FFFFFF` | Default card/panel/table background | Standard content surface |
| `--color-surface-elevated` | `#FFFFFF` | Modals, dropdowns, the Genie answer panel | Paired with `--shadow-elevated` |
| `--color-surface-sunken` | `#E3F2FD` | Input fields, code/SQL blocks, table header row | Lightest blue fill |
| `--color-primary` | `#2196F3` | Primary actions, links, active nav item | 4.6:1 on white — passes AA |
| `--color-primary-hover` | `#0D47A1` | Hover/active state of primary elements | Navy deep blue |
| `--color-primary-mid` | `#90CAF9` | Secondary borders/accents on interactive elements | Subtle blue accent |
| `--color-primary-subtle` | `#E3F2FD` | Selected/active backgrounds | Pale blue |
| `--color-accent` | `#E8912D` | "Live now" / time-sensitive highlights | Background/icon use only |
| `--color-accent-text` | `#8A4B08` | Text-safe variant of accent for labels/badges on light backgrounds | Passes AA |
| `--color-accent-subtle` | `#FBEADB` | Background for "live"/"happening now" badges | Pairs with `--color-accent-text` |
| `--color-text` | `#10233D` | Primary body/heading text | Deep blue-charcoal |
| `--color-text-muted` | `#4E6079` | Secondary text, metadata, timestamps, helper text | Passes AA |
| `--color-text-disabled` | `#9AACC2` | Disabled control text | Disabled control text |
| `--color-border` | `#D7E4F2` | Default component borders (inputs, cards, table cells) | Desaturated tint |
| `--color-divider` | `#E6EEF7` | Section separators, list dividers | Non-interactive separation |
| `--color-success` | `#1F8A5A` | Success text/icons (e.g. "booking confirmed") | Passes AA |
| `--color-success-subtle` | `#E3F5EC` | Success badge/background | Pairs with `--color-success` |
| `--color-warning` | `#8A4B08` | Warning text/icons (e.g. "room availability limited") | Pairs with `--color-warning-subtle` |
| `--color-warning-subtle` | `#FBEADB` | Warning badge/background | Warm amber |
| `--color-error` | `#C1402C` | Error text/icons (e.g. booking conflict, permission denied) | Warm brick red |
| `--color-error-subtle` | `#FBE7E3` | Error badge/background | Pairs with `--color-error` |
| `--color-info` | `#0D47A1` | Informational text/icons | Navy blue |
| `--color-info-subtle` | `#E3F2FD` | Info badge/background | Pale blue |
| `--color-focus-ring` | `#2196F3` | Focus outline for all interactive elements | See Accessibility Tokens |

---

## Typography

**Font families:**
- Display / Headings: `Playfair Display`, `Georgia`, `Times New Roman`, `serif`
- Functional / Body / Tables / Forms: `Public Sans`, `Segoe UI`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- SQL blocks: `ui-monospace`, `Cascadia Code`, `SFMono-Regular`, `Consolas`, `monospace`

| Token | Size / Line Height | Family | Weight | Usage |
|---|---|---|---|---|
| `--text-display` | 38px / 44px | `--font-display` | 600 | Page-level hero heading (once per page) |
| `--text-h1` | 26px / 34px | `--font-display` | 600 | Section headings (e.g. "Upcoming Events") |
| `--text-h2` | 20px / 28px | `--font-display` | 500 | Card titles — event names |
| `--text-h3` | 15px / 22px | `--font-sans` | 600 | Compact headings inside cards/tables |
| `--text-body` | 15px / 24px | `--font-sans` | 400 | Default body text, form labels, Genie answer text |
| `--text-body-medium` | 15px / 24px | `--font-sans` | 500 | Emphasized body text |
| `--text-label` | 13px / 18px | `--font-sans` | 600 | Form field labels, nav items, button text, table headers |
| `--text-caption` | 12px / 16px | `--font-sans` | 400 | Timestamps, metadata, helper/error text under inputs |
| `--text-mono` | 13px / 20px | `--font-mono` | 400 | Genie SQL/data-basis blocks only |

**Table header convention:** `--text-label` at weight 600, letter-spacing `0.02em`,
`--color-text-muted`, optionally uppercase — applied consistently to every table in the
product (Newsletter Home room grid, Admin Panel booking list).

**Hierarchy rule of thumb:** never skip more than one level in a single view (e.g. don't
follow an `h1` directly with `h3`); at most 3 type sizes visible in any single card or
table row.

---

## Spacing

**Base unit:** 4px. All spacing tokens are multiples of the base unit, exposed as a scale
rather than arbitrary pixel values anywhere in the codebase.

| Token | Value | Typical Usage |
|---|---|---|
| `--space-0` | 0px | Reset/no gap |
| `--space-1` | 4px | Icon-to-label gap, tight inline spacing |
| `--space-2` | 8px | Default gap between related inline elements (badge + text) |
| `--space-3` | 12px | Form field internal padding, compact card padding |
| `--space-4` | 16px | Default card padding, gap between form fields |
| `--space-5` | 20px | Gap between a card's header and body |
| `--space-6` | 24px | Gap between distinct cards in a grid/list |
| `--space-8` | 32px | Section-to-section spacing within a page |
| `--space-10` | 40px | Page-level top padding, major section breaks |
| `--space-12` | 48px | Page-level side margins on wide viewports (paired with container width, see Breakpoints) |

**Choosing between nearby values:** use the smallest token that keeps related content
visually grouped without touching. Default to `--space-4` for "normal" padding/gaps unless
a specific rule above applies. Never hand-pick an odd value (e.g. `14px`, `18px`) — if none
of the above fits, that's a signal to reconsider the layout, not to introduce a new token
casually (see Token Naming Convention / Rules for This File on adding tokens).

---

## Sizing

| Token | Value | Usage |
|---|---|---|
| `--size-control-sm` | 32px | Compact buttons/inputs (e.g. inline table actions) |
| `--size-control-md` | 40px | Default button/input height (forms, Admin Panel) |
| `--size-control-lg` | 48px | Primary CTAs, the Ask Genie question input |
| `--icon-sm` | 16px | Inline icons next to text/labels |
| `--icon-md` | 20px | Default standalone icon (nav, buttons) |
| `--icon-lg` | 24px | Section/empty-state icons |
| `--avatar-sm` | 24px | Compact user/role indicator (e.g. "Council" badge icon) |
| `--avatar-md` | 32px | Default avatar-style indicator where needed |
| `--card-min-width` | 280px | Minimum width for an event/room card before wrapping to next row |
| `--table-row-height` | 44px | Default table/list row height across the app |
| `--nav-height` | 56px | Top navigation bar height (all surfaces) |

Only genuinely reusable, cross-component dimensions are tokenized here. One-off dimensions
(e.g. a specific chart's height) are defined locally where used, not added to this file.

---

## Borders and Radius

| Token | Value | Usage |
|---|---|---|
| `--border-width` | 1px | The only border width used in the product |
| `--border-style` | solid | The only border style used |
| `--radius-sm` | 6px | Badges, inputs, buttons, small controls |
| `--radius-md` | 10px | Cards, panels, the Genie answer block |
| `--radius-lg` | 16px | Modals, the Ask Genie chat container |
| `--radius-full` | 9999px | Pills/badges that should be fully rounded (status chips), avatars |

**Rule:** radius scales with the size/prominence of the element — small controls use
`--radius-sm`, containers use `--radius-md`, top-level surfaces (modals, the chat panel)
use `--radius-lg`. Never mix an unlisted radius value into a component.

---

## Elevation and Shadows

Shadows are used sparingly — only to indicate something is temporarily "above" the page
(a dropdown, modal, or toast), not to decorate static content. Standard cards and panels
use a `--color-border` outline instead of a shadow for their resting state.

| Token | Value | Usage |
|---|---|---|
| `--shadow-none` | `none` | Default state for cards, panels, table rows |
| `--shadow-raised` | `0 1px 2px rgba(13, 71, 161, 0.08)` | Clickable card resting state / subtle lift |
| `--shadow-elevated` | `0 4px 14px rgba(13, 71, 161, 0.14)` | Hover on cards, Genie answer panel |
| `--shadow-modal` | `0 14px 34px rgba(13, 71, 161, 0.22)` | Modals, role-code dialog |

**Rule:** never stack more than one shadow level on the same element, and never apply a
shadow to a static, non-interactive block of content.

---

## Icons

- **Library:** `lucide-react` — a single, consistent icon set for the entire application.
  No mixing of icon families (no emoji-as-icon, no mixing in a second icon library).
- **Default sizes:** use the Sizing tokens above (`--icon-sm` / `--icon-md` / `--icon-lg`)
  — never an arbitrary pixel size.
- **Stroke weight:** `1.5px` stroke width across all icon usage.
- **Color:** icons inherit `currentColor` and take on the semantic text/status color of
  their context (e.g. an icon inside an error badge uses `--color-error`) — icons never
  carry a hardcoded color independent of their surrounding semantic context.
- **Alignment:** icons are vertically centered with adjacent text using flex `align-items:
  center`, with `--space-2` (8px) gap between icon and label as the default.
- **Semantic usage guidelines:** an icon must reinforce an existing text label, never
  replace it as the sole indicator of meaning (accessibility — see Accessibility Tokens).
  Reserve icon-only buttons for well-understood, universally recognizable actions (close,
  search) and always pair them with an accessible label (`aria-label`).

---

## Motion

Motion is restrained and purely functional — it confirms an action happened or that live
data changed, it never decorates.

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | 120ms | Hover/press feedback, focus ring appearance |
| `--duration-base` | 200ms | Default transitions (dropdown open, tab switch, card hover lift) |
| `--duration-slow` | 320ms | Modal/panel enter-exit, the Genie answer panel appearing |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default easing for all transitions |
| `--easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Modal/panel entrances only |

**Live-data feedback:** when a value updates live (e.g. an attendance count increasing
after a form submission), use a single brief highlight — a `--duration-base` background
flash from `--color-accent-subtle` back to transparent — rather than a bouncing number,
confetti, or any attention-grabbing animation. This is the one and only "live update"
animation pattern in the product; it must be used consistently everywhere a live count
changes.

**Rules for avoiding excessive animation:** no animation longer than `--duration-slow`
anywhere in the product; no looping/ambient animation (no pulsing dots, no spinners left
running longer than the actual wait); respect `prefers-reduced-motion` by disabling all
non-essential transitions (keep only opacity changes for state feedback) when set.

---

## Breakpoints and Responsive Tokens

| Token | Value | Target |
|---|---|---|
| `--bp-sm` | 640px | Large phones / small tablets |
| `--bp-md` | 768px | Tablets |
| `--bp-lg` | 1024px | Small laptops — the primary target for the Admin Panel and Newsletter Home grid |
| `--bp-xl` | 1280px | Standard desktop/demo-projector width |

**Container width:** content max-width is `1120px`, centered, with `--space-4` (16px) side
padding below `--bp-md` and `--space-8` (32px) side padding at `--bp-lg` and above.

**Responsive rules:**
- **Newsletter Home:** card grid is 1 column below `--bp-sm`, 2 columns from `--bp-sm` to
  `--bp-lg`, 3 columns at `--bp-lg` and above. Cards never shrink below `--card-min-width`.
- **Ask Genie:** always a single-column, full-height chat layout regardless of breakpoint;
  only the side padding changes (`--space-4` on mobile, `--space-8` on desktop).
- **Admin Panel tables:** at or above `--bp-md`, render as a standard table. Below
  `--bp-md`, collapse each row into a stacked card (label/value pairs) rather than
  introducing horizontal scroll — dense tabular data does not work well at phone widths and
  should not be force-fit.
- **Typography scaling:** `--text-display` steps down to the `--text-h1` size below
  `--bp-sm` (no separate mobile-only token is introduced — reuse the existing scale rather
  than adding new sizes).
- **Touch targets:** below `--bp-md`, all interactive controls use `--size-control-md`
  (40px) as their minimum height even where a desktop layout would use
  `--size-control-sm`, to preserve tap accuracy (see Accessibility Tokens).

---

## Accessibility Tokens

- **Minimum contrast:** all text/background pairings in the Color System table meet WCAG AA
  (4.5:1 for normal text, 3:1 for large text/UI components) except `--color-accent`, which
  is explicitly flagged as background/icon-only — any text on an accent background must use
  `--color-accent-text`, never `--color-text` or white directly on raw `--color-accent`.
- **Focus indicator:** every interactive element shows a visible focus ring:
  `2px solid var(--color-focus-ring)` with a `2px` offset from the element's edge. Focus
  rings are never removed (`outline: none`) without an equivalent visible replacement.
- **Disabled states:** disabled controls are indicated by three simultaneous signals —
  `--color-text-disabled` text, `--color-surface-sunken` background, and `cursor:
  not-allowed` — never by opacity or color alone.
- **Readable text sizing:** no body or interactive text below `--text-caption` (12px)
  anywhere in the product; base body text is `--text-body` (15px), not 14px or smaller, for
  comfortable reading of schedules and answers.
- **Touch target sizing:** every interactive element has a minimum hit area of 40×40px
  (matching `--size-control-md`), including icon-only buttons, regardless of the icon's
  visual size.
- **State differentiation beyond color:** every semantic state (success/warning/error/info,
  and the availability states below) is paired with an icon and/or text label, never
  conveyed by background/text color alone — required for both accessibility and for the
  demo to read clearly on a projector.

---

## Semantic State Tokens

A single, reusable state vocabulary used across events, rooms, bookings, attendance, and
teacher availability. Each state maps to one color pairing (from the Color System) plus a
required icon, so meaning never depends on color perception alone.

| State | Color Token Pairing | Icon (lucide) | Used For |
|---|---|---|---|
| `available` | `--color-success` on `--color-success-subtle` | `circle-check` | Free room, free teacher slot |
| `unavailable` | `--color-error` on `--color-error-subtle` | `circle-x` | Booked room, busy teacher slot |
| `upcoming` | `--color-primary` on `--color-primary-subtle` | `calendar` | Scheduled event, not yet started |
| `ongoing` / `live` | `--color-accent-text` on `--color-accent-subtle` | `radio` (pulsing dot glyph) | Event currently in its time window; live-updating attendance |
| `completed` | `--color-text-muted` on `--color-surface-sunken` | `check` | Past event |
| `cancelled` | `--color-text-muted` on `--color-surface-sunken`, text strikethrough | `ban` | Cancelled event/booking |
| `pending` | `--color-warning` on `--color-warning-subtle` | `clock` | A submitted action awaiting confirmation (e.g. booking in flight) |
| `confirmed` | `--color-success` on `--color-success-subtle` | `circle-check` | Confirmed booking |
| `conflict` | `--color-error` on `--color-error-subtle` | `alert-triangle` | Booking conflict result |
| `full` | `--color-warning` on `--color-warning-subtle` | `users` | Reserved for future capacity features — not used in the MUST HAVE scope, defined for consistency if introduced later |
| `empty` | `--color-text-muted` on `--color-surface` | `inbox` | No events/no results state |
| `loading` | `--color-text-muted` | spinner (see Motion) | Any in-flight request |
| `error` | `--color-error` on `--color-error-subtle` | `alert-circle` | Failed request, "couldn't get that" states |
| `no_answer` (Genie-specific) | `--color-info` on `--color-info-subtle` | `help-circle` | Genie's "no governed answer found" state — deliberately distinct from `error` so the user can tell "the system is broken" apart from "the data doesn't have that" |

`ongoing`/`live` and `no_answer` are the two states unique to this product's identity (the
live-pulse feel and Genie's grounded-answer transparency) — every other state reuses the
standard success/warning/error/info vocabulary already defined in the Color System.

---

## Token Naming Convention

- **CSS custom properties:** `--{category}-{name}[-{variant}]`, all lowercase, kebab-case.
  Category prefixes: `color`, `text`, `space`, `size`, `icon`, `avatar`, `radius`,
  `shadow`, `duration`, `easing`, `bp`.
  - Correct: `--color-primary-hover`, `--text-h2`, `--space-6`, `--radius-md`.
  - Incorrect: `--blueButtonHover` (not semantic, wrong case), `--card-header-space`
    (component-specific — belongs in `ui-rules.md`, not a token), `--purple-500` (raw
    value name instead of semantic role).
- **Tailwind/JS token references:** camelCase, mirroring the same category structure, e.g.
  `colors.primary.hover`, `spacing[6]`, `radius.md` — see Implementation Format.
- **Never name a token after a page or component** (no `--newsletter-card-bg`, no
  `--genie-panel-radius`). If a value is genuinely specific to one component, it is a local
  style decision documented in `ui-rules.md`, not a token.
- **Never name a token after its raw value** (no `--blue-500`, no `--gray-100`) — names
  describe role/intent (`primary`, `surface-sunken`, `text-muted`), not appearance, so the
  underlying value can change without renaming every usage.

---

## Implementation Format

The frontend is a React (Vite, TypeScript) SPA using Tailwind CSS as the styling layer
(see `architecture.md`). Tokens are defined once and consumed everywhere through two
coordinated files — no component may define a competing local value for anything listed in
this document.

1. **`frontend/src/styles/tokens.css`** — the canonical source of every token as a CSS
   custom property on `:root`, exactly as named in this document (e.g. `--color-primary:
   #3949AB;`). This file is the single source of truth; every other representation derives
   from it.
2. **`frontend/tailwind.config.ts`** — extends Tailwind's theme to reference the CSS
   variables (not hardcoded duplicate values), e.g.:
   ```ts
   // frontend/tailwind.config.ts
   export default {
     theme: {
       extend: {
         colors: {
           bg: "var(--color-bg)",
           surface: "var(--color-surface)",
           "surface-elevated": "var(--color-surface-elevated)",
           "surface-sunken": "var(--color-surface-sunken)",
           primary: {
             DEFAULT: "var(--color-primary)",
             hover: "var(--color-primary-hover)",
             subtle: "var(--color-primary-subtle)",
           },
           accent: {
             DEFAULT: "var(--color-accent)",
             text: "var(--color-accent-text)",
             subtle: "var(--color-accent-subtle)",
           },
           text: {
             DEFAULT: "var(--color-text)",
             muted: "var(--color-text-muted)",
             disabled: "var(--color-text-disabled)",
           },
           border: "var(--color-border)",
           divider: "var(--color-divider)",
           success: { DEFAULT: "var(--color-success)", subtle: "var(--color-success-subtle)" },
           warning: { DEFAULT: "var(--color-warning)", subtle: "var(--color-warning-subtle)" },
           error: { DEFAULT: "var(--color-error)", subtle: "var(--color-error-subtle)" },
           info: { DEFAULT: "var(--color-info)", subtle: "var(--color-info-subtle)" },
         },
         fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["ui-monospace", "monospace"] },
         borderRadius: { sm: "var(--radius-sm)", md: "var(--radius-md)", lg: "var(--radius-lg)", full: "var(--radius-full)" },
         boxShadow: { raised: "var(--shadow-raised)", elevated: "var(--shadow-elevated)", modal: "var(--shadow-modal)" },
         transitionDuration: { fast: "var(--duration-fast)", base: "var(--duration-base)", slow: "var(--duration-slow)" },
         screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
       },
     },
   };
   ```
3. **`frontend/src/styles/tokens.ts`** — a typed TypeScript export of any tokens needed in
   JS logic rather than CSS classes (e.g. passing a hex color into a non-Tailwind chart
   library). This file reads the same values as `tokens.css` (kept in sync manually given
   the hackathon timeframe — there are few enough JS-consumed tokens, primarily the
   Semantic State Tokens' colors, that duplication risk is low).

Components consume Tailwind utility classes generated from this config (e.g.
`bg-surface`, `text-text-muted`, `rounded-md`, `shadow-elevated`) or, where Tailwind's
utility classes don't cover a raw CSS need (e.g. inside `tokens.css` itself), reference the
CSS custom properties directly. No component file defines a hex color, raw pixel spacing
value, or ad hoc font size.

---

## Rules for This File

1. These tokens are the canonical visual values for the entire application.
2. Components must consume tokens rather than inventing local visual values — no inline
   hex colors, arbitrary pixel spacing, or one-off font sizes in component code.
3. New tokens should only be introduced when an existing token cannot reasonably satisfy
   the requirement, and any addition must be made here first, not invented ad hoc inside a
   component.
4. Agents working on different workstreams must use the same token system — the Frontend
   workstream owns implementation of these tokens, but any surface any agent builds (Admin
   Panel, Newsletter Home, Ask Genie) must draw from this same file.
5. Component-specific styling belongs in `ui-rules.md`.
6. Component inventory and usage belong in `ui-registry.md`.
7. Product requirements come from `project-overview.md`.
8. Architectural constraints (stack, hosting) come from `architecture.md`.
9. This file should remain stable during implementation unless a deliberate,
   documented design-system decision is made — it is not a place for incremental,
   undiscussed visual drift.
10. Do not introduce unnecessary design-system complexity (no dark mode, no theming
    system, no more than the color/type/spacing scales defined above) beyond what this
    document specifies.
