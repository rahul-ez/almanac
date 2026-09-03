# Campus Companion — Visual Redesign Spec

**Audience:** the Frontend agent/implementer.
**Scope:** visual design only — color, type, iconography, layout, and alignment. No change
to component behavior, data flow, routes, or the REST contract. This spec **replaces the
visual values** in `ui-tokens.md` and the component-level notes in `ui-rules.md` /
`ui-registry.md`; it does not replace their structure, states, or accessibility rules.
Every rule in `ui-rules.md` (states, responsive behavior, a11y) still applies — only the
tokens and a handful of named components change shape.

**Why this exists:** the current build (Home, Ask Genie, Council Panel — see reference
screenshots) is functionally correct but visually generic: flat indigo, uniform
rounded-corner cards with an identical soft shadow on everything, a sparkle-in-a-circle
mascot icon on Ask Genie, washed-out lavender buttons that read as disabled, and no
typographic hierarchy beyond size. It reads as an unstyled component library, not a
designed product. This spec fixes that with a specific, deliberate identity — not a
different flavor of the same defaults.

---

## 1. Design Direction

**Ground truth:** Campus Companion is an official campus utility — closer to a university
noticeboard, a transit timetable, or a library catalog than a consumer SaaS app. It answers
real, live questions ("is this room free," "how many people are here") and its whole value
proposition is *trustworthy, current, grounded information*. The design should feel like it
belongs to the institution: composed, legible, slightly editorial — like a well-printed
campus programme — not like a startup's marketing site.

**Principles:**
1. **One typographic voice, used deliberately.** A serif display face carries the
   institutional, "this is real and official" register (page titles, section headers, event
   names). Everything functional — nav, buttons, tables, data, timestamps — stays in a
   clean grounded sans so the product is legible, not costume-y.
2. **Blue is the entire identity, not a decoration.** The four blues given below are used
   for every interactive and brand surface: links, primary actions, active states, focus
   rings, subtle fills, borders. No other hue appears in this role. (Semantic states —
   success/error — keep conventional colors for recognizability, but nothing else competes
   with blue for attention. See §3.)
3. **Structure comes from typography and spacing, not boxes.** Not every group of content
   gets a bordered, shadowed card. A card means "this is one record" (an event, a booking
   receipt). Section groupings, filters, and page regions are separated with whitespace,
   rules, and heading hierarchy — never a second, redundant card wrapped around a card.
4. **Restraint.** One accent warm tone exists, reserved for "happening now" / live states,
   used sparingly. Everything else is blue, ink, and paper. No gradients, no decorative
   illustrations, no icon-in-a-circle mascots.

---

## 2. Typography

### Typefaces

| Role | Typeface | Source | Weights used |
|---|---|---|---|
| Display / headings (`--text-display`, `--text-h1`, `--text-h2`) | **Playfair Display** | `fonts.google.com/specimen/Playfair+Display` | 500, 600 |
| Everything else (nav, body, labels, buttons, tables, captions, forms) | **Public Sans** | `fonts.google.com/specimen/Public+Sans` | 400, 500, 600, 700 |
| SQL / data-basis blocks only | system monospace (unchanged) | — | 400 |

**Why this pairing:** Playfair Display gives the product the "official, printed, this
matters" register a campus bulletin has — used only where a heading is announcing
something (a page title, a section, an event name), never on functional chrome. Public Sans
was designed for exactly this register of civic/institutional interface — dense tables,
timestamps, form labels — and reads as deliberately "campus system," not "generic app
font." Two families is the ceiling; they must stay clearly distinct in role, not mixed
within one line of text.

**Import (add to `frontend/index.html` or `tokens.css` via `@import`):**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Public+Sans:wght@400;500;600;700&display=swap');
```

**Font stacks (replace in `tokens.css` / `tailwind.config.ts`):**
```css
--font-display: "Playfair Display", Georgia, "Times New Roman", serif;
--font-sans: "Public Sans", "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: ui-monospace, "Cascadia Code", "SFMono-Regular", Consolas, monospace;
```

### Type scale (replaces `ui-tokens.md`'s Typography table)

| Token | Size / Line-height | Family | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| `--text-display` | 38px / 44px | `--font-display` | 600 | -0.01em | Page `h1` — once per page |
| `--text-h1` | 26px / 34px | `--font-display` | 600 | -0.005em | Section `h2` headings |
| `--text-h2` | 20px / 28px | `--font-display` | 500 | normal | Card titles — event names |
| `--text-h3` | 15px / 22px | `--font-sans` | 600 | normal | Compact headings inside cards/tables |
| `--text-body` | 15px / 24px | `--font-sans` | 400 | normal | Body text, Genie answers |
| `--text-body-medium` | 15px / 24px | `--font-sans` | 500 | normal | Emphasized body |
| `--text-label` | 13px / 18px | `--font-sans` | 600 | normal | Field labels, nav, buttons, table headers |
| `--text-caption` | 12px / 16px | `--font-sans` | 400 | normal | Timestamps, metadata, helper text |
| `--text-mono` | 13px / 20px | `--font-mono` | 400 | normal | SQL blocks only |

**Rules carried forward unchanged from `ui-rules.md`** (do not weaken these — they prevent
the exact clichés this redesign is trying to remove):
- No all-caps labels, anywhere, ever.
- Never accent a single word in a headline with italic/bold/color.
- No eyebrow labels (small tracked-out text above a heading) unless it's a genuinely
  reusable status, not decoration.
- No middle-dot-joined metadata strings as a stylistic default (`A · B · C`) — use the
  existing timestamp/metadata formatting already specified in `ui-rules.md`; a dot separator
  is fine when it's the *simplest* readable separator, not when it's dressing up plain text.
- Line length for body/Genie answer text stays under ~80 characters — the existing 3/4
  container width cap on Genie messages already achieves this; do not widen it.
- Serif (`--text-h2`, card/event titles) gets slightly more generous line-height than sans
  at the same size, already reflected above (28px on a 20px face).

---

## 3. Color System

This **replaces** the Color System table in `ui-tokens.md`. Token *names* are unchanged so
`ui-rules.md` and `ui-registry.md` need no edits — only `tokens.css` / `tailwind.config.ts`
values change.

### Brand blues (from the required palette, used as the entire interactive/brand identity)

| Token | Value | Role |
|---|---|---|
| `--color-primary-subtle` | `#E3F2FD` | Selected/active backgrounds, subtle fills, chip backgrounds |
| `--color-primary-mid` *(new)* | `#90CAF9` | Secondary borders/accents on interactive elements, unread/lighter emphasis |
| `--color-primary` | `#2196F3` | Primary actions, links, active nav indicator, focus ring |
| `--color-primary-hover` | `#0D47A1` | Hover/pressed state of primary elements, high-emphasis accents |

These four values — and *only* these four — carry the brand. No indigo, no purple, no
teal appears anywhere in the interactive palette.

### Neutrals (re-derived so "ink" and "paper" feel like part of the same family, not generic gray)

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#F6FAFE` | Page background — a barely-tinted paper, not flat gray |
| `--color-surface` | `#FFFFFF` | Card/panel/table background |
| `--color-surface-elevated` | `#FFFFFF` | Modals, Genie answer panel (paired with the new tinted shadow, see below) |
| `--color-surface-sunken` | `#E3F2FD` | Inputs, SQL blocks, table header row — reuses the palette's lightest blue directly, so recessed content still reads as "on brand" instead of flat gray |
| `--color-text` | `#10233D` | Primary text — deep blue-charcoal, not pure black |
| `--color-text-muted` | `#4E6079` | Secondary text, metadata, timestamps |
| `--color-text-disabled` | `#9AACC2` | Disabled control text |
| `--color-border` | `#D7E4F2` | Default borders — a desaturated tint of `--color-primary-mid`, not flat gray |
| `--color-divider` | `#E6EEF7` | Section separators |
| `--color-focus-ring` | `#2196F3` | Focus outline (same as `--color-primary`) |

### Accent (single warm note, reserved exclusively for "happening now" / live states)

| Token | Value | Usage |
|---|---|---|
| `--color-accent` | `#E8912D` | Background/icon use only — "live now" badges |
| `--color-accent-text` | `#8A4B08` | Text-safe variant for labels on light backgrounds |
| `--color-accent-subtle` | `#FBEADB` | Background for live/happening-now badges |

This is the **only** non-blue, non-neutral hue in the interactive UI, and it is reserved
for exactly one job: making "this is happening right now" visually distinct from
"upcoming" (which is blue). It is not used for anything decorative.

### Semantic states

| Token | Value | Notes |
|---|---|---|
| `--color-success` | `#1F8A5A` / subtle `#E3F5EC` | Unchanged in role from current spec |
| `--color-warning` | `#8A4B08` on `#FBEADB` | **Aliased to the accent pair** — deliberately, so we're not introducing a fifth hue family for something that functions the same way visually as "attention" |
| `--color-error` | `#C1402C` / subtle `#FBE7E3` | Slightly warmer brick-red than the current `#C0341D`, sits better against the cool blue field |
| `--color-info` | `#0D47A1` on `#E3F2FD` | **Aliased to `--color-primary-hover` on `--color-primary-subtle`** — appropriate, since "info" and "grounded-in-data" are this product's whole brand, not a separate concern |

### Shadows

Replace neutral-black shadow rgba values with a navy-tinted shadow so elevation feels like
part of the same palette instead of a generic drop-shadow:

```css
--shadow-raised: 0 1px 2px rgba(13, 71, 161, 0.08);
--shadow-elevated: 0 4px 14px rgba(13, 71, 161, 0.14);
--shadow-modal: 0 14px 34px rgba(13, 71, 161, 0.22);
```

`--shadow-none` stays `none`. The rule from `ui-rules.md` that static content never gets a
shadow is unchanged — this only changes the *color* of the two shadows that already exist.

---

## 4. Iconography

**Keep `lucide-react`** — it is already a disciplined, professional SVG icon set and
matches the brief's "professional SVG icons" requirement. The fix here is *discipline of
use*, not a library swap.

- Stroke width: standardize to **1.5px** everywhere (down from 1.75px) — reads cleaner
  paired with the serif/sans typography, less "default icon kit."
  Icons take `currentColor`; no hardcoded icon colors, per existing rule.
- **Remove the sparkle-in-a-circle icon from the Ask Genie empty state entirely.** An
  icon-in-a-circle "AI mascot" above a heading is one of the most recognizable generic-AI
  interface patterns and directly undermines the "grounded, not guessing" positioning. The
  empty state should lead with the `--text-display` or `--text-h1` heading text itself —
  typography is the personality here, not a mascot.
- Every icon still needs the text label next to it required by `ui-rules.md`; the one
  documented exception (Genie's icon-only send button) is unchanged.
- Do not add icons to nav items, section headings, or card titles that don't already have
  one specified in `ui-registry.md` — an icon next to every heading is a generic-template
  tell, not a hierarchy device.

---

## 5. Layout & Alignment

The structural rules in `ui-rules.md` (container width, spacing scale, breakpoints) are
correct and unchanged. The following are concrete alignment/rhythm fixes, based on the
current screenshots, that the token/type changes alone won't fix:

1. **Tighten the gap between the top bar and the page title.** Currently there's a large
   dead zone before "Campus Today." Use `--space-8` (not more) between the top bar and the
   `PageHeader`.
2. **Page-header action slot (refresh + freshness stamp) must align to the same baseline
   as the page title**, not float independently in the corner. Right-align it against the
   title's cap-height, per `ui-rules.md`'s Page-level action slot rule — currently it reads
   as a disconnected element.
3. **Event card top row** (status badge + club name): these must sit on one baseline with
   consistent vertical centering — currently the pill badge and the plain club-name text
   don't align cleanly. Badge uses `--radius-full`, `--text-label`, fixed height matching
   the club-name text's line box.
4. **Room-type segmented control**: currently reads as a leftover default (flat blue "All"
   pill with plain white siblings). Restyle using `--color-primary-subtle` fill and
   `--color-primary` text for the selected segment, `--color-border` outline for the rest —
   no drop shadow on this control.
5. **Primary buttons must never look disabled.** The current "Create event" / "Book room"
   buttons render in a washed-out lavender that reads as inactive. Primary buttons are
   solid `--color-primary` fill with white text at rest, `--color-primary-hover` on
   hover/press — full opacity always, per the existing rule that disabled state is
   signaled by three explicit simultaneous cues, never by a faded fill.
6. **Ask Genie empty state**: center the heading and supporting line (unchanged), but after
   removing the mascot icon (see §4), reduce the vertical whitespace above it so the block
   doesn't float in the middle of a mostly-empty panel — pull it up to roughly one-third of
   the container height, chips directly below with `--space-6` gap.
7. **Council Panel forms**: label-to-field spacing and field-to-field spacing must be
   perfectly uniform down the form (`--space-2` label→field, `--space-4` field→field) —
   currently slightly inconsistent between "Event name," "Club / Society," and the
   Date/Time row. Native `date`/`time` inputs stay native per `ui-rules.md`; style their
   border/focus ring to match `--color-border` / `--color-focus-ring` so they don't look
   like an unstyled browser default sitting inside a styled form.
8. **Room Availability table** (Council Panel / Home): header row uses
   `--color-surface-sunken` (now the pale blue, not gray) with `--text-label` at 600 weight
   — this alone will make the table feel considerably more intentional without any
   structural change.

---

## 6. Component-Level Notes

These are visual-only refinements to specific `ui-registry.md` entries. No new components,
no new props beyond what's listed.

- **EventCard**: Title (`--text-h2`, now Playfair Display) is the most visually distinct
  element in the card — this is the one place the serif face appears inside a card, and it
  should be the only thing in the card that isn't sans-serif. Metadata row, attendance
  count, and actions stay `--font-sans` for contrast.
- **StatusIndicator**: keep the existing 14-state vocabulary and icon pairings exactly —
  only the underlying color values change per §3. `ongoing`/`live` now uses the refined
  accent; `upcoming` uses `--color-primary` on `--color-primary-subtle`.
- **Banner**: background tints now come from the updated subtle tokens; no structural
  change.
- **GenieMessage (assistant-ok)**: background `--color-surface-elevated`, arrival shadow is
  now the navy-tinted `--shadow-elevated` from §3 — this alone gives the "grounded answer
  arriving" moment more presence without new motion.
- **SuggestedQuestionChip**: fill `--color-surface-sunken` (pale blue) at rest, text
  `--color-text`; on hover, fill `--color-primary-subtle`, text `--color-primary-hover`.
- **AccessCodeModal**: unchanged structurally; shadow/border now draw from the updated
  tokens. No icon added to the modal header.
- **TopBar**: product name "Campus Companion" renders in `--text-h2` (Playfair Display,
  500) — this is the one piece of chrome that should carry the display face, giving the
  whole app an identifiable "masthead," the way a newspaper or bulletin does. Nav items
  and the role badge stay `--text-label` in Public Sans.

---

## 7. Explicit Don'ts

Do not do any of the following, under any circumstance, regardless of how it looks in
isolation:

- **No emoji anywhere** — not in copy, not as icon substitutes, not in empty/error states.
- **No decorative "slabs"** — no gratuitous colored rectangles/blocks used purely as visual
  filler (e.g., a solid-color banner strip with no informational content, a colored panel
  behind a heading for "emphasis"). Every colored surface must correspond to a real
  semantic role already defined in `ui-tokens.md`'s Semantic State Tokens or §3 above.
- **No identical rounded-card-with-shadow treatment applied to every content block.** A
  card means "one record." Filters, headers, and page regions are separated by whitespace
  and typography, not by wrapping them in another bordered box.
- **No icon-in-a-circle mascot** anywhere (see §4) — this is the single most recognizable
  "this is an AI chatbot template" tell and must not appear on Ask Genie or anywhere else.
- **No gradients**, no soft glow effects, no decorative illustrations.
- **No all-caps labels, no tracked-out eyebrow text above headings.**
- **No single-word accent coloring inside a headline** (e.g., coloring just "Genie" a
  different shade inside a sentence).
- **No `→` appended to link or button text** as a stylistic flourish.
- **No new hues introduced outside §3's palette** — if a new UI moment seems to need a new
  color, it almost always means reusing one of the tokens above, not adding a fifth family.
- **Do not weaken any accessibility rule in `ui-rules.md`** to achieve a visual effect —
  contrast, focus rings, and non-color state cues are non-negotiable regardless of palette.

---

## 8. Implementation Checklist

1. Add the Google Fonts import (§2) to `frontend/index.html`.
2. Update `frontend/src/styles/tokens.css` with the full token set in §2 and §3 (font
   stacks, type scale, color values, shadow values). Token **names** stay the same as
   current `ui-tokens.md` except the two new tokens explicitly marked *(new)* in §3
   (`--color-primary-mid`) and the `--font-*` family tokens, which are additions, not
   renames.
3. Update `frontend/tailwind.config.ts`'s `theme.extend` to reference the same CSS
   variables (no hardcoded duplicate hex values — this rule from `ui-tokens.md` is
   unchanged).
4. Update `ui-tokens.md` itself (Typography table, Color System table, Elevation table) to
   match §2/§3 exactly, so the doc and the code never drift — this file remains the
   canonical source per its own Rules for This File.
5. Apply the component-level notes in §6 and the layout fixes in §5 across
   `NewsletterHome.tsx`, `AskGenie.tsx`, and `AdminPanel.tsx` — remove the mascot icon
   explicitly.
6. Self-review pass: take a screenshot of all three pages at `--bp-lg` after the change and
   check each one against §7's Don'ts list line by line before calling this done. If
   anything on the page could be mistaken for a generic AI-generated template at a glance,
   it isn't done yet.
7. Verify contrast ratios on the new `--color-text` / `--color-text-muted` /
   `--color-primary` pairings against `--color-bg` and `--color-surface` meet the same AA
   thresholds `ui-tokens.md` already documents — the palette swap must not regress
   accessibility.
