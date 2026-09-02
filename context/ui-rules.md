# UI Rules

This document defines **how an agent builds a UI in Campus Companion**. It is binding on
every frontend workstream. It does not define which components exist (`ui-registry.md`), how
code is written (`code-standards.md`), or product requirements (`project-overview.md`).

Every visual value named below is an exact CSS custom property from `ui-tokens.md` — this
document introduces no new token, no literal color, size, or duration. Where a rule needs a
value `ui-tokens.md` does not yet define, that is called out explicitly as a gap rather than
invented (see Token Reference Index).

---

## Core UI Principles

1. **Clarity before density.** Every screen answers one question at a glance: *what is
   happening on campus* (Newsletter Home), *what did I ask and what was the answer* (Ask
   Genie), *what am I creating* (Admin Panel).
2. **One dominant thing per view.** Each page has one visual focal point. Everything else is
   quieter — smaller text, `--color-text-muted` instead of `--color-text`, less space.
3. **Consistency beats local optimisation.** No agent introduces a second way to do something
   this document already specifies, even if it feels marginally better locally.
4. **Comfortable density, single mode.** One density setting everywhere; no compact/
   comfortable toggle.
5. **Discoverability without instruction.** Primary actions are visible, verb-labelled
   controls, never icon-only (except the one exception in Buttons and Actions), never
   revealed only on hover.
6. **Accessibility is a build requirement**, covered fully in Accessibility Rules — not a
   later pass.
7. **Responsive by construction**, verified at `--bp-sm`, `--bp-md`, `--bp-lg`, and `--bp-xl`
   before a surface is called done.
8. **Feedback for every action.** Every user-initiated action produces a visible loading
   state, then a visible result state, in the same view.
9. **Progressive disclosure for evidence, not for essentials.** The Genie SQL/data basis may
   start collapsed. Answers, counts, statuses, errors, and actions never do.
10. **Never fabricate, never blur states.** "No data", "couldn't reach the data", and "not
    permitted" render as three visually distinct states, per the `no_answer` vs `error`
    distinction `ui-tokens.md` defines explicitly (see Status and Feedback), mirroring the
    `fail visibly, never fabricate` invariant in `architecture.md`.

---

## Page Structure

### Application shell

Every page renders inside one shared shell, built once.

1. **Skip link** — visually hidden until focused, targets `main`.
2. **Top bar** — height `--nav-height` (56px), sticky to the top of the viewport,
   `--color-surface` background, one `--border-width` `--color-divider` bottom border.
   Contains, left to right: the product name (links to Newsletter Home), primary navigation,
   and the session/role indicator.
3. **Main content region** — one `main` landmark holding the page header and page content.
4. **No global footer.** Three flat surfaces do not justify one.

There is no sidebar, no drawer, and no hamburger menu at any breakpoint (see Responsive
Rules). The top bar is the only persistent chrome.

### Page header

Every page opens with:

- **Page title** — `--text-display`, rendered as the page's single `<h1>`.
- **Supporting line** — one sentence in `--text-body`, explaining the page's purpose.
  Required on all three pages.
- **Page-level action/status slot** (optional, at most one item) — right-aligned at `--bp-md`
  and above; stacked full-width below the supporting line under `--bp-md`. Used only by
  Newsletter Home's refresh control and freshness stamp.

Header content is separated from page sections by `--space-10`. Page headers never contain
filters or search — those belong to the section they control.

### Content container

- One centred container, max-width **1120px** (the value `ui-tokens.md` gives directly under
  Breakpoints and Responsive Tokens — it is not exposed as a named custom property, so it is
  cited by value here). Side padding is `--space-4` below `--bp-md` and `--space-8` at
  `--bp-lg` and above, exactly as specified in `ui-tokens.md`.
- Content is left-aligned throughout. No centred body text, headings, or forms anywhere.
- The container is never nested inside another container.

### Sections

- A section is: an `h2` at `--text-h1` size (see the naming note in Typography and Content
  Hierarchy), an optional one-line description or control row, and the section body.
- Sections are separated by `--space-8`. Content inside a section uses `--space-4` and
  `--space-6` as appropriate (see Layout Rules).
- Sections are delimited by spacing and the section title, not by wrapping them in a card.
  Cards represent records, not page regions (see Cards and Information Surfaces).
- A page has at most four top-level sections.

### Page archetypes

| Archetype | Used by | Required regions |
|---|---|---|
| **Browse** | Newsletter Home | Header with refresh + freshness stamp; event section; room-availability section with type filter; entry point to Ask Genie |
| **Converse** | Ask Genie | Header; one bounded chat container (`--radius-lg`, see Genie section) holding the conversation and the input |
| **Act** | Admin Panel | Header; one form section per governed write (create event, book room); inline result feedback per form |

### Page-level spacing and empty space

- Vertical rhythm comes only from the spacing scale (`--space-1` through `--space-12`). No
  hand-picked values between steps.
- A section with less content than expected keeps its spacing; content never stretches to
  fill it.
- Content never spans full viewport width on large screens — the 1120px container is a hard
  cap.

### Mobile adaptation of structure

- The top bar stays sticky at `--nav-height`; page header, sections, and container keep their
  order. Only geometry changes, never information architecture.
- The page-level action slot moves below the supporting line and becomes full-width.

---

## Layout Rules

### Containers and grids

- One fluid multi-column grid with `--space-6` gaps between grid items (the token
  `ui-tokens.md` assigns to "gap between distinct cards in a grid/list"). Column counts are
  fixed per breakpoint (Responsive Rules), not chosen locally.
- Grid items are equal width; no asymmetric hero/sidebar splits.
- Cards never shrink below `--card-min-width` (280px) before wrapping to the next row —
  stated directly in `ui-tokens.md`.

### Choosing a layout pattern

| Content shape | Pattern | Rule |
|---|---|---|
| Records with a title, several metadata values, possible actions | **Card grid** | Events — the only card-grid content in the MVP |
| Records that are one row of parallel attributes, compared across rows | **Table** | Room availability, Genie result rows |
| Short parallel values with no actions | **Definition list** | Card metadata; a booking success summary |
| Sequential text exchange | **Stacked message blocks** | Genie only |
| Mutually exclusive filters, four or fewer | **Segmented control** | Room type filter |
| Suggestions the user may pick | **Chips** | Genie suggested questions only |

Do not present the same entity as a card on one surface and a table row on another without a
stated reason. Room availability is deliberately tabular everywhere; events are deliberately
cards everywhere.

### Cards

- A card represents **one record**. It is never a page-region wrapper or a decorative panel.
- Every card shares: `--radius-md`, a `--border-width` `--color-border` outline (not a
  shadow, at rest — `ui-tokens.md`: "standard cards and panels use a `--color-border` outline
  instead of a shadow for their resting state"), `--space-4` internal padding, and `--space-5`
  between its header and body.
- **Event cards are the one clickable-card pattern in the product.** The card is wrapped as a
  single stretched link to the event's registration destination (no nested interactive
  elements inside the clickable area). On hover/focus it takes `--shadow-raised` — the token
  `ui-tokens.md` defines specifically for "hover state for clickable cards (subtle lift
  only)" — transitioning over `--duration-base` with `--easing-standard`. Cancelled events
  (no registration action) are not wrapped as a link and show no hover state.
- No other card in the product is clickable. There is no second clickable-card pattern to
  invent.
- Cards in a grid share equal height per row; overflowing content is truncated by rule (see
  Cards and Information Surfaces), not by uneven card growth.

### Lists

- A plain vertical list (not cards, not a table) is used only for short homogeneous strings
  with no metadata — e.g. a list of free room names inside a Genie answer summary.
- Lists longer than ten items on a browse surface are capped with a visible count of what is
  not shown ("Showing 10 of 24 events"). No pagination.

### Alignment and grouping

- Text and labels are left-aligned. Numeric table columns are right-aligned. Nothing is
  centre-aligned except an empty-state block inside an otherwise empty section.
- Related controls are grouped with `--space-2`; unrelated groups are separated by at least
  `--space-4`. No vertical dividers used for grouping.
- Labels sit above their values (cards, forms) or above their column (tables).

### Information density

- A card shows at most four metadata values.
- A table shows at most six columns on desktop.
- Density is never increased by shrinking spacing or type below the token scale — drop
  content instead.

---

## Responsive Rules

Breakpoint tokens, used exactly as `ui-tokens.md` defines them — note the grid and the table
break at *different* tokens; this is intentional and must not be flattened into one rule:

| Token | Value | Role |
|---|---|---|
| `--bp-sm` | 640px | Large phones / small tablets |
| `--bp-md` | 768px | Tablets |
| `--bp-lg` | 1024px | Small laptops — primary target for the Admin Panel and the event grid |
| `--bp-xl` | 1280px | Desktop / demo-projector width |

### Concrete adaptations

| Element | Rule |
|---|---|
| Navigation | Three items always inline in the top bar at every breakpoint — no menu button, ever |
| Event grid | 1 column below `--bp-sm`; 2 columns from `--bp-sm` to below `--bp-lg`; 3 columns at `--bp-lg` and above, exactly per `ui-tokens.md`'s Responsive rules |
| Room availability | Stacked label/value block per room below `--bp-md`; standard `table` at `--bp-md` and above, exactly per `ui-tokens.md`'s Admin Panel tables rule (applied to this table too, since both are dense tabular surfaces) |
| Genie result rows | Horizontally scrollable table container at every breakpoint (arbitrary column shape; see Tables and Dense Data) |
| Ask Genie layout | Always single-column, full-height chat regardless of breakpoint; only side padding changes (`--space-4` below `--bp-md`, `--space-8` at `--bp-lg` and above), per `ui-tokens.md` |
| Forms | Single column at every breakpoint; fields full width of the container |
| Page-level action slot | Below the supporting line, full-width, below `--bp-md`; right of the title at `--bp-md` and above |
| Touch targets | Below `--bp-md`, every interactive control uses `--size-control-md` (40px) as its minimum height even where a desktop layout would use `--size-control-sm` — stated directly in `ui-tokens.md`'s Accessibility Tokens |
| Page title size | `--text-display` steps down to `--text-h1` size below `--bp-sm` — no separate mobile-only type token is introduced, per `ui-tokens.md` |

### Overflow behaviour

- **Known-shape tables** (room availability) never scroll horizontally; they stack per the
  rule above.
- **Arbitrary-shape tables** (Genie result rows, whose columns depend on generated SQL)
  scroll horizontally inside a bounded container at every breakpoint, since their column
  semantics are unknown to the frontend.
- Long unbroken strings (emails, SQL, room names) wrap or scroll within their own container
  and never widen the page. Horizontal page scroll is a defect at every breakpoint.
- Sticky elements (top bar, Genie input) never cover the last item of scrollable content; the
  scroll container carries bottom padding equal to the sticky element's height.

---

## Navigation Rules

### Primary navigation

- Exactly three destinations, fixed order, always visible to every session regardless of
  role: **Home**, **Ask Genie**, **Council access**.
- **"Council access" is visible to everyone**, per `project-overview.md`'s navigation
  section ("a user ... who identifies as a club head/council member can ... reach the
  Council/Club Admin Panel ... via a persistent navigation element"). It is not hidden from
  `student` sessions — a student needs a way to identify as council in the first place.
- Selecting "Council access": if the session role is already `council`, it navigates
  straight to the Admin Panel. If the role is `student`, it opens the access-code modal (see
  Permissions and Role-Based UI).
- Labels are sentence case, single words or short noun phrases, no icons, no counters.
- Navigation order and labels are identical at every breakpoint and on every page.

### Active state

- The current destination is marked with **two** cues: a persistent indicator using
  `--color-primary` (or `--color-primary-subtle` as its background per "active nav item"
  usage) and `aria-current="page"`. Colour is never the only cue.

### Secondary navigation and breadcrumbs

The product is three flat surfaces. **No breadcrumbs, no sub-navigation, no nested routes.**

### Back navigation

- The browser back button is the only back mechanism.
- The Genie conversation persists in memory for the session and is restored when the user
  returns to Ask Genie during the same session; navigating away never discards it.

### Links

- In-body links are underlined, use `--color-primary`, and are distinguishable without
  relying on colour alone.
- No arrows, chevrons, or middle-dot separators appended to link text as decoration.
- A link navigates; a button acts. The Event Registration entry point (link) and every form
  submit (button) follow this without exception.

### External links

- The Event Registration Google Form is the only external destination. It opens in a new tab
  with `rel="noopener noreferrer"`, a visible external-link icon (`lucide-react`, `--icon-sm`,
  `currentColor`), and an accessible name ending "(opens in a new tab)".
- No other external link exists in the product.

### Navigation after actions

- **A successful write never navigates.** After creating an event or booking a room, the
  user stays on the Admin Panel; a success banner names what was created and the affected
  read data is re-fetched in place.
- Gaining `council` access via the modal never navigates away from the current page unless
  the user opened the modal specifically to reach the Admin Panel, in which case it opens
  once the code is accepted.

---

## Typography and Content Hierarchy

**Naming note:** `ui-tokens.md` names its type tokens after nominal heading levels
(`--text-h1`, `--text-h2`, `--text-h3`), but these describe *visual size roles*, not DOM
heading depth. The page's single `<h1>` uses `--text-display`; the token literally named
`--text-h1` is used on `<h2>` section headings. Agents must follow this size-role mapping,
not assume the token name equals the DOM tag.

| Content | DOM element | Type token | Notes |
|---|---|---|---|
| Page title | `h1` | `--text-display` | One per page, used sparingly per `ui-tokens.md` |
| Section title | `h2` | `--text-h1` | Sentence case |
| Card title (event name) | `h3` | `--text-h2` | Most prominent element in its card |
| Compact heading inside a card/table (table group header) | `h4` or styled span | `--text-h3` | |
| Body content, Genie answers | — | `--text-body` | Genie answer text explicitly listed as a `--text-body` usage in `ui-tokens.md` |
| Emphasised body (event names inside a list row) | — | `--text-body-medium` | |
| Field labels, table headers, nav items, button text | — | `--text-label` | Never all-caps — `ui-tokens.md`'s example uppercase treatment is optional and this product does not use it, to match the "no all-caps labels" direction in `frontend-design` guidance |
| Timestamps, metadata, helper/error text under inputs | — | `--text-caption` | |
| SQL / data-basis blocks | — | `--text-mono` | The only place monospace is used, per `ui-tokens.md` |

Additional rules:

- Never skip more than one heading level in a single view; at most 3 type sizes visible in
  any single card or table row — both stated directly in `ui-tokens.md`.
- Hierarchy is expressed by size, weight, and `--color-text` vs `--color-text-muted` — never
  by colouring a single word in a heading.
- Copy is sentence case throughout, including buttons and status text.
- **Times and dates:** 24-hour times (`15:00`), ranges with an en dash (`15:00–17:00`), dates
  as weekday-day-month (`Sat 5 Sep`), `Today`/`Tomorrow` substituted where applicable.
  Timestamps are campus-local and rendered exactly as received — no timezone conversion, no
  timezone suffix, per `data-contracts.md`.
- **Identifiers** (`evt_001`, `bk_0001`) are never a primary label. They appear only inside
  the Genie evidence disclosure and conflict details, in `--text-mono`.
- Numbers that are the point of an element (attendance count) use `--text-h2` or
  `--text-body-medium` depending on the surface, never smaller than `--text-body`, and read as
  number-then-noun ("42 registered"), never "Registered: 42".

---

## Cards and Information Surfaces

### Universal card anatomy

In order, top to bottom (slots may be omitted; order may not change):

1. **Status indicator** (only for a non-default state — e.g. `cancelled`) using the pairing
   from Status and Feedback. Omitted for ordinary records rather than showing a "normal" pill.
2. **Title** — `--text-h2`, the record's human name.
3. **Metadata row** — up to four label/value pairs at `--text-caption` label / `--text-body`
   value, gapped with `--space-2`. Absent values are omitted, not shown as a placeholder.
4. **Body** — optional description at `--text-body`, clamped to two lines.
5. **Primary datum** — where one number matters (attendance count), it gets its own slot at
   `--text-h2`, separated from the metadata row by `--space-5`.
6. **Actions** — at most two, `--space-2` apart, bottom-aligned, left-aligned.

### Per-surface application

- **Events (Newsletter Home):** title = event name; metadata = start time, club, room (or
  "Room not booked"); primary datum = attendance count, using the `ongoing`/`live` pairing
  (`--color-accent-text` on `--color-accent-subtle`, `radio` icon) while the event is
  currently in its time window, otherwise no status treatment on the number itself; the whole
  card is the clickable stretched link to registration when the event is upcoming and not
  cancelled (see Cards, above). Cancelled events show the `cancelled` pairing and are not a
  link.
- **Rooms:** presented as a table, never cards (see Tables and Dense Data).
- **Teacher availability:** answered conversationally in Genie; supporting schedule rows live
  in the evidence disclosure. No teacher card exists.
- **Attendance:** never a standalone surface — it is the primary datum on an event card and
  the subject of Genie answers.
- **Bookings:** shown as a success definition list after creation and as conflict detail on a
  409. No bookings browse surface exists.
- **Clubs:** appear only as an event card's metadata value and as a Genie answer subject. No
  club surface exists.

### Per-surface loading, empty, and error behaviour

- A card grid or table renders **skeletons in the final layout's shape** on first load — three
  card skeletons for the event grid, matching row height (`--table-row-height`) for tables.
- **Empty** uses the `empty` state pairing (`--color-text-muted` on `--color-surface`, `inbox`
  icon) and is a real, styled state inside the section body — never an empty grid.
- **Error** uses the `error` state pairing and replaces only that section's body; one failing
  section never blanks the page.

---

## Tables and Dense Data

Used for room availability and Genie result rows.

### Structure

- Real `table` markup: `thead`, `th scope="col"`, a caption or `aria-labelledby` pointing at
  the section title. Never divs-as-table.
- **Header row uses `--color-surface-sunken`** background with `--text-label` at weight 600,
  `0.02em` letter-spacing, `--color-text-muted` — the exact "table header convention" given in
  `ui-tokens.md`.
- Row height is `--table-row-height` (44px). One header row; no column groups or footers.
- Column order: identity first (room name), then classifying attributes (type, capacity),
  then status, then actions last. Maximum six columns on desktop.

### Alignment and formatting

- Text columns left-aligned; numeric columns right-aligned; status columns left-aligned.
- Missing values render as an em dash in the cell, with accessible text reading "not
  available" — the one place in the product a placeholder is used, since column alignment
  requires it.

### Status in tables

Status uses the same indicator (shape + `--text-label`) as cards — see Status and Feedback. A
row is never coloured wholesale, and a coloured dot is never used alone.

### Actions in tables

- At most one tertiary action per row, in the last column. The room-availability table in the
  MVP has none.

### Sorting and filtering

- No generic sortable columns. The only filter is the room type segmented control (`All`,
  `Classroom`, `Lab`, `Auditorium`, `Study room`) — the closed `rooms.type` enum, no fifth
  option, no free text.
- A filter yielding nothing shows the filtered `empty` state naming the filter with a control
  to clear it.

### Responsive and overflow

- Room availability stacks below `--bp-md` into label/value blocks using the same labels as
  the desktop header, per the Responsive Rules table above.
- Genie result tables scroll horizontally within a bounded container at every breakpoint and
  cap at a readable max height with vertical scroll. At most the first 20 rows render,
  followed by a caption stating the total row count.

### Empty state

An empty table keeps its header row and shows one full-width `empty`-styled row so column
semantics stay visible. "No rooms free at 15:00" is styled as a correct answer, worded as an
answer, not as an error.

---

## Forms and User Input

Forms exist in the Admin Panel (create event, book room) and the access-code modal.

### Layout

- Single column, fields stacked with `--space-4` between them, full width of the container —
  `ui-tokens.md` defines no separate, narrower form-width token, so forms do not introduce
  one locally (see Token Reference Index).
- Each form lives in its own section with an `h2` (`--text-h1`) and a one-line description.
- Field order follows the write contract's mental order: what → who owns it → when → where.

### Labels and helper text

- Every field has a visible `--text-label` above it, programmatically associated with the
  input. Placeholders are never labels; they show format examples only.
- Helper text sits below the field in `--text-caption`, `--color-text-muted`.
- Required fields carry a visible marker plus the input's `required` attribute; optional
  fields carry no marker; one legend line at the top of the form explains the marker.

### Inputs

- Native controls only: text input, `select`, `date`, `time`. No custom dropdowns, no custom
  date pickers.
- Date and time are separate `date`/`time` inputs; the client composes the ISO
  `YYYY-MM-DDTHH:MM:SS` value. No timezone is ever requested or shown.
- Selects for closed sets (club, room, room type) are populated from API data, no free-text
  option. A select whose data hasn't loaded shows the three-signal disabled state (below)
  with helper text explaining why — the one legitimate use of disabled-at-rest.
- Field height is `--size-control-md` (40px); fields are uniform width, sized to the form
  column, not to expected content.

### Validation

- Validate on submit; optionally re-validate on blur once a field has already failed.
- **The submit button is never disabled to indicate invalid input.** It is enabled; on press,
  errors surface, per `ui-tokens.md`'s disabled-state definition being reserved for controls
  that are genuinely not actionable, not for withholding feedback.
- On failure: focus moves to the first invalid field; each shows its error in `--text-caption`
  `--color-error` below it, replacing helper text, with `aria-invalid` and
  `aria-describedby`; a form-level summary in the `error` pairing appears at the top of the
  form.
- Client-side validation covers only what's obviously fixable (required fields present, end
  time after start time). Club/room existence and booking conflicts are the server's answer,
  rendered from the API response.

### Errors from the server

- **409 conflict:** a persistent form-level banner in the `conflict` pairing
  (`--color-error` on `--color-error-subtle`, `alert-triangle` icon — distinct from the plain
  `error` pairing's `alert-circle`), naming the conflicting booking's event, room, and time
  window as a definition list, with "Choose another time or room." Input is preserved.
- **403 forbidden:** the form is replaced by the access-code modal reopening; input is
  discarded, since it was never authorised (see Permissions and Role-Based UI).
- **502:** a form-level `error` banner stating the data service is unavailable, with a "Try
  again" secondary button that resubmits unchanged input.

### Submission

- On submit, the button enters its loading state (present-participle label: "Creating
  event…", "Booking room…"), inputs disable, no page overlay.
- Double submission is prevented by the button's own loading state, not a modal.

### Cancellation and destructive actions

- No cancel button. A "Clear" tertiary action may reset fields without confirmation, since
  nothing has been committed.
- **The MVP has no destructive actions.** If one is ever added, it uses a two-step inline
  confirm (button becomes "Confirm delete" in the `error`/danger pairing, reverting on blur).
  The product's only modal is the access-code dialog (see Permissions); no additional modal
  may be introduced for confirmation.

### Success feedback

- A success banner in the `success` pairing (`--color-success` on `--color-success-subtle`,
  `circle-check` icon) appears at the top of the form's section, stating what was created in
  the user's vocabulary ("Booked Lab 204 for the AI Workshop, Sat 5 Sep, 15:00–17:00").
- The form resets to empty. The banner persists until the next submission or a page change —
  not auto-dismissed, since it is the receipt for a governed write.
- Affected read data (room availability, event list) is re-fetched immediately so the banner
  and the data agree.
- Action vocabulary stays constant: button "Book room" → loading "Booking room…" → banner
  "Booked".

---

## Buttons and Actions

### Hierarchy

| Level | Use | Rules |
|---|---|---|
| **Primary** | The single most important action in a context | At most one per section. `--color-primary` fill, `--color-primary-hover` on hover, `--size-control-lg` for the two form submits and the Genie question input's send action, `--size-control-md` elsewhere. |
| **Secondary** | Meaningful alternatives (retry, refresh, clear) | Outlined `--color-border`, up to two per context. |
| **Tertiary** | Low-weight in-place actions (expand evidence, clear filter) | Text-styled, `--color-primary`, underline on hover/focus, still a real `button`. |
| **Destructive** | None in the MVP | Would use `--color-error` fill, secondary weight, two-step confirm; never the visual primary. |

Two primary buttons never compete in one section.

### Labels

- Verb-first, specific: "Book room", "Create event", "Ask", "Try again", "Refresh". Never
  "Submit", "OK", "Go".
- No arrows or chevrons appended.
- The same action carries the same label everywhere.

### States

- **Disabled** uses the three simultaneous signals `ui-tokens.md` specifies: `--color-text-
  disabled` text, `--color-surface-sunken` background, `cursor: not-allowed` — never opacity
  or colour alone. Used only when the action is genuinely impossible right now, with the
  reason visible nearby. Never used to signal a permission failure (see Permissions).
- **Loading** replaces the label with its present-participle form and shows an inline
  indicator; the button keeps its width and sets `aria-busy`.
- Hover/press/focus use `--duration-fast` (120ms) with `--easing-standard`; pressed state is
  the hover value at 90% opacity, per `ui-tokens.md`'s interactive-state derivation rule.

### Icon buttons

- Icon-only buttons exist **only** for the Genie send control, always paired with an
  `aria-label`, per `ui-tokens.md`'s Icons guidance ("reserve icon-only buttons for
  well-understood, universally recognizable actions ... and always pair with an accessible
  label"). Every other action is a labelled button.
- Icons are `lucide-react`, sized from `--icon-sm`/`--icon-md`/`--icon-lg`, `1.75px` stroke
  width, `currentColor`. Icon-only buttons meet the 40×40px minimum hit area regardless of
  the icon's visual size.

### Placement

- Form actions: bottom-left of the form, primary first.
- Card actions: bottom-left of the card.
- Section-level actions (refresh, clear filter): the section's control row, right-aligned at
  `--bp-md` and above.

---

## Genie / Conversational Interface

Ask Genie sits inside the same shell, using the same tokens as the rest of the app — no
separate chat theme, no avatars, no "AI is typing" personality copy. Genie's behaviour,
instructions, and answer semantics are defined in `genie.md`; this section covers
presentation only.

### Container

- The conversation and the input together sit inside **one bounded chat container**:
  `--radius-lg`, `--color-surface` background, `--border-width` `--color-border` outline —
  the usage `ui-tokens.md` assigns `--radius-lg` to directly ("Modals, the Ask Genie chat
  container"). This gives Genie a distinct panel identity without a separate colour theme.
- Inside the container: extra whitespace (`--space-6` around the conversation edge) compared
  to the denser Newsletter Home / Admin Panel, per the "lower density, more breathing room"
  direction in `ui-tokens.md`'s Design Direction.

### Conversation structure

- One vertical column inside the chat container, oldest message at top, newest at bottom.
- **User messages:** right-aligned, `--color-primary-subtle` background, `--radius-md`,
  never wider than three-quarters of the container.
- **Assistant messages (answers):** left-aligned, `--color-surface-elevated` background,
  `--radius-md` — the pairing `ui-tokens.md` assigns directly ("Modals, dropdowns, the Genie
  answer panel"). On arrival, the panel takes `--shadow-elevated` and animates in over
  `--duration-slow` (320ms) with `--easing-emphasized`, per `ui-tokens.md`'s Motion table
  ("the Genie answer panel appearing"); the shadow settles to `--shadow-none` once rendered,
  consistent with shadows indicating something temporarily "above" the page rather than
  decorating static content.
- Exchanges are separated by `--space-4`. No timestamps shown.

### Query input

- A single-line-growing textarea pinned to the bottom of the chat container, `--size-control-
  lg` minimum height, with a send button per Icon Buttons above. Sticky to the viewport
  bottom on mobile.
- Enter submits; Shift+Enter inserts a newline. Disabled while a question is in flight;
  refocused when the answer arrives.
- The field has a visually hidden label; its placeholder shows one example question and is
  never used as the label itself.

### Empty state

Before the first question: one line (`--text-body`) on what Genie can answer, plus **four
suggested question chips** — `--radius-full`, `--color-surface-sunken` background,
`--text-label` — one each for rooms, teachers, attendance, and events, drawn from the
benchmark set in `genie.md`. Selecting a chip submits it immediately.

### Loading

- The user's message appears instantly. An assistant-side placeholder follows: a non-spinning
  progress indicator plus "Checking campus data…", using `--color-surface-elevated` /
  `--radius-md` like a settled answer panel so the layout doesn't jump when the real answer
  replaces it.
- No skeleton text, no fake streaming.

### Answers

Renders in order:

1. **Answer text** — `--text-body`, the `answer` field in full, never truncated.
2. **Evidence disclosure** — a tertiary control labelled "How this was answered", present on
   **every** successful answer, collapsed by default, using `--duration-base` (200ms) /
   `--easing-standard` to expand — this is the product's grounding guarantee from
   `project-overview.md` and is never omitted.
3. Expanded, it shows: the SQL in `--text-mono` inside a `--color-surface-sunken` scroll
   container (the exact usage `ui-tokens.md` assigns `--color-surface-sunken` — "code/SQL
   blocks"), then the result rows as a table (Tables and Dense Data), then the row count.
- A zero-row `ok` result still shows the disclosure, stating the query returned no rows — an
  empty result is a legitimate grounded answer.
- Disclosure state is per-message and resets for each new message.

### Errors and non-answers

Three distinct renderings, mapped to the exact `ui-tokens.md` state pairings — never
collapsed into one:

| API result | Pairing used | Rendering |
|---|---|---|
| `status: "ok"` | (none — plain answer panel) | Answer + evidence disclosure |
| `status: "no_answer"` | `no_answer` — `--color-info` on `--color-info-subtle`, `help-circle` | Assistant message stating no governed answer was found, plus the suggested chips again. No evidence disclosure — there is nothing to disclose. |
| HTTP 502 / `status: "error"` | `error` — `--color-error` on `--color-error-subtle`, `alert-circle` | Assistant message stating the data service couldn't be reached, with a "Try again" secondary button resending the same question |

The frontend never composes, guesses, or supplements an answer, and never retries
automatically.

### Follow-ups and context

- The conversation is one continuous list; follow-ups are ordinary messages. No "new
  conversation" control in the MVP.
- Auto-scroll to the newest message only if the user is already at the bottom of the scroll
  container.

### Long responses and mobile

- Long answers scroll with the page; never clamped behind "show more".
- On mobile, the chat container spans the full content width, the input is sticky, and the
  scroll region has bottom padding equal to the input's height.
- Evidence tables and SQL blocks scroll within themselves and never widen the page.

### Integration with the rest of the product

- Newsletter Home carries one entry point to Ask Genie, styled as a link, in the header area
  or a section-level link — never a floating action button.
- When an answer implies an action (booking, registering), the frontend may render one link
  beneath the answer to the relevant surface. It never renders a control that would make
  Genie appear to write.

---

## Status and Feedback

### Status vocabulary

The status vocabulary is the **14-state table `ui-tokens.md` already defines** under Semantic
State Tokens. This document does not invent a parallel vocabulary — it maps product concepts
onto that closed set. No status may be added or restyled outside that table.

| Product situation | State used | Pairing | Icon |
|---|---|---|---|
| Room free at a queried time | `available` | `--color-success` on `--color-success-subtle` | `circle-check` |
| Room booked at a queried time | `unavailable` | `--color-error` on `--color-error-subtle` | `circle-x` |
| Teacher free at a queried time | `available` | (as above) | `circle-check` |
| Teacher busy at a queried time | `unavailable` | (as above) | `circle-x` |
| Event scheduled, not yet started | `upcoming` | `--color-primary` on `--color-primary-subtle` | `calendar` |
| Event currently in its time window; a count updating live | `ongoing` / `live` | `--color-accent-text` on `--color-accent-subtle` | `radio` (pulsing dot glyph) |
| Past event | `completed` | `--color-text-muted` on `--color-surface-sunken` | `check` |
| Cancelled event/booking | `cancelled` | `--color-text-muted` on `--color-surface-sunken`, strikethrough | `ban` |
| A write in flight (rare — writes are synchronous) | `pending` | `--color-warning` on `--color-warning-subtle` | `clock` |
| Confirmed booking | `confirmed` | `--color-success` on `--color-success-subtle` | `circle-check` |
| Booking conflict (409) | `conflict` | `--color-error` on `--color-error-subtle` | `alert-triangle` |
| No events / no matching rooms | `empty` | `--color-text-muted` on `--color-surface` | `inbox` |
| Any in-flight request | `loading` | `--color-text-muted` | spinner |
| Failed request (502) | `error` | `--color-error` on `--color-error-subtle` | `alert-circle` |
| Genie found no governed answer | `no_answer` | `--color-info` on `--color-info-subtle` | `help-circle` |

`full` is defined in `ui-tokens.md` for future capacity features and is **not used** anywhere
in this scope — do not render it.

Rules:

- Every status is text (`--text-label`) plus its icon; colour is always the third cue, per
  `ui-tokens.md`'s "state differentiation beyond color" accessibility requirement.
- The same status uses the same label, pairing, and icon everywhere in the product.
- "Free"/"Available" is the half-open-interval definition from `data-contracts.md`; the UI
  states the instant it applies to ("Free at 15:00", "Free now") rather than implying an
  open-ended state.

### Feedback surfaces

Two feedback surfaces only, per the product's flat structure:

1. **Banner** — full width of its section, top-aligned, persistent until superseded. Carries
   the relevant state's pairing, its icon, a short bold `--text-body-medium` first line, and
   one `--text-body` line of detail or next step. Used for write results, permission
   problems, section-level failures, and conflicts, and rendered inside the section it
   concerns.
2. **Inline field error** — below a form field, `--text-caption` `--color-error`, replacing
   helper text.

There are no toasts and no snackbars anywhere in the product.

---

## Loading and Async Behaviour

### Principles

- The shell and page header render immediately and never enter a loading state.
- Loading states occupy the space the final content will occupy, to minimise layout shift.
- A fetch resolving in under roughly 300ms does not flash a loading state.

### Per-operation rules

| Operation | Rule |
|---|---|
| **Initial page load** | Each section loads independently with skeletons shaped like its final content (three event card skeletons at `--card-min-width`; table-row skeletons at `--table-row-height`). One slow section never blocks another. |
| **Data refresh (poll or manual)** | Existing content stays visible and interactive; a quiet "Updating…" indicator (`--color-text-muted`) sits in the section's control row. Content is replaced only when new data arrives. |
| **Genie query** | User message appears immediately; assistant placeholder follows in the settled answer-panel styling; input disabled; no page-level spinner. |
| **Form submission** | Button loading state, inputs disabled, no overlay. |
| **Attendance updates** | Newsletter Home polls the event list and room availability every 15 seconds while the tab is visible, pausing when hidden. A manual "Refresh" secondary button and a freshness stamp ("Updated just now" / "Updated 12s ago") always sit in the page header's action slot. |
| **Booking operations** | On success, re-fetch room availability before rendering the success banner, so the banner and the table cannot disagree. |

### Change highlighting

This is fully specified in `ui-tokens.md`'s Motion section and is applied exactly as written:
when a live value updates (an attendance count rising), use **one** brief highlight — a
`--duration-base` background flash from `--color-accent-subtle` back to transparent — "rather
than a bouncing number, confetti, or any attention-grabbing animation." This is the single
"live update" pattern in the product and is not varied per surface. The list is never
re-sorted or re-mounted as a result; reading position is preserved.

### Retry

- Every error state that could succeed on a second attempt carries an explicit "Try again"
  control. No automatic retries, no backoff, no silent re-requests.
- A failed poll leaves the last good data on screen, marks the freshness stamp stale ("Last
  updated 2m ago — couldn't refresh"), and keeps polling on schedule.

---

## Empty and Error States

### Anatomy

Every state renders, in order: a short heading of what is true (using the relevant state's
icon and pairing), one sentence of why or what's next, and — where an action exists — one
control. No illustrations, no icon larger than `--icon-lg`, no apologies, no exclamation
marks.

### The states

| Situation | State | Copy pattern | Action |
|---|---|---|---|
| No upcoming events | `empty` | "No upcoming events." / "New events appear here as soon as they're created." | None |
| No free rooms at the requested time | `empty` | "No rooms free at 15:00." / "Every room is booked for that time. Try a different time or room type." | None — this is a valid answer |
| Filter yields nothing | `empty` | "No labs free at 15:00." | "Show all rooms" |
| Genie has no governed answer | `no_answer` | Genie's `message`, verbatim | Suggested question chips |
| Genie / warehouse unreachable | `error` | "Couldn't reach campus data." / "The question wasn't answered. Nothing was changed." | "Try again" |
| Read endpoint fails | `error` | "Live data unavailable." / "Campus data couldn't be loaded just now." | "Try again" |
| Teacher not found (404) | `no_answer` | "No timetable data for that name." / "Check the spelling, or ask Genie using the teacher's full name." | None |
| Permission denied (403) | — | See Permissions and Role-Based UI | Reopen access-code modal |
| Invalid input | — | Field error + form summary | Fix in place |
| Booking conflict (409) | `conflict` | "Already booked." / conflicting event, room, time window | Change the input |

### Non-negotiables

- **An error is never rendered as an empty state**, and an empty result from a successful
  query is never rendered as an error — `empty`, `no_answer`, and `error` are visually
  distinct pairings and stay that way.
- Error copy never blames the user, apologises, speculates about cause, or exposes stack
  traces, endpoint paths, or raw exception text.
- Previously loaded data may remain visible after a failed refresh **only** when marked stale
  by the freshness stamp; otherwise the section shows the `error` state.

---

## Permissions and Role-Based UI

The session role (`student` or `council`) comes from `POST /api/session`. The frontend treats
the server's `role` as the only source of truth and never derives or caches one locally.

### The access-code modal

This is **the one and only modal in the product**, matching the usage `ui-tokens.md`
explicitly scopes to it (`--shadow-modal`, `--radius-lg`: "Modals, the role-code entry
dialog"). No other confirmation, form, or content in the product opens in a modal.

- Opens when a `student` session selects "Council access" in the primary nav, or when a
  write endpoint returns 403 (see below).
- Contents: a heading, one line explaining that creating events and booking rooms requires
  council access, one access-code field (`--size-control-md`), and one primary "Continue"
  button.
- Entrance/exit uses `--duration-slow` (320ms) with `--easing-emphasized`, per
  `ui-tokens.md`'s Motion table.
- An incorrect code returns `role: "student"` from an endpoint that never errors. The modal
  states plainly that the code wasn't recognised and leaves the field ready to retry — no
  error styling, no lockout, no attempt counter.
- On success, the modal closes and, if it was opened to reach the Admin Panel, the Admin
  Panel opens in place.
- Dismissible via its close control or Escape; focus is trapped within it while open and
  returns to the triggering control on close — the only place in the product focus trapping
  is used.

### Visible versus hidden elsewhere

- Outside the modal itself, governed write controls (the two Admin Panel forms) are absent
  from the DOM entirely for a `student` session — a student navigating directly to the Admin
  route sees the access-code modal open over the Newsletter Home rather than a bare form.
- **Never disabled-as-permission.** A write control is never rendered disabled to signal lack
  of permission — see the same rule in Buttons and Actions.
- Read surfaces (Newsletter Home, Ask Genie) have no role-conditional content whatsoever.

### Authorised state

- With a `council` session, the Admin Panel header shows a quiet role badge ("Council
  access") sized `--avatar-sm`, so the elevated context is never ambiguous — the exact usage
  `ui-tokens.md` names for that token ("compact user/role indicator").
- Governed write sections carry a one-line description stating the change applies to live
  campus data and will be visible to everyone.

### When the server disagrees

A 403 from any write endpoint means the session expired or was never valid. The current form
is abandoned, the access-code modal reopens with the same "requires council access" copy, and
the role badge is cleared. No silent re-authorisation is attempted.

### The standing rule

UI role handling is a usability affordance only. **Backend authorisation is the sole
enforcement mechanism** (`architecture.md`, Invariant 4). No frontend behaviour in this
document may be described, implemented, or relied upon as a security control.

---

## Interaction Rules

- **Hover** applies only to elements that do something: buttons, links, the clickable event
  card, table row actions. It is a subtle background/border change over `--duration-fast`
  with `--easing-standard` — never a size change or shadow inversion beyond the one documented
  `--shadow-raised` card-hover case.
- **Focus** uses `2px solid var(--color-focus-ring)` with a `2px` offset, on every
  interactive element, at every breakpoint, never removed without an equivalent visible
  replacement — the exact spec in `ui-tokens.md`'s Accessibility Tokens.
- **Active/pressed** is the hover value at 90% opacity, per `ui-tokens.md`'s interactive-state
  derivation rule.
- **Selected** (an active filter segment, active nav item) is a persistent fill/indicator plus
  the correct ARIA state — never colour alone.
- **Disabled** uses the three-signal definition in Buttons and Actions, always with nearby
  text explaining why.
- **Keyboard:** every action reachable and operable by keyboard alone in logical DOM order.
  Enter/Space activate buttons. Escape closes the access-code modal and collapses an expanded
  evidence disclosure. No keyboard traps outside the modal's intentional focus trap.
- **Confirmation** is required for nothing in the MVP; where ever needed, it is the two-step
  inline confirm in Forms and User Input, not a second modal.
- **Transient feedback** is not a pattern; feedback is persistent and inline (Status and
  Feedback), with the one documented exception of the attendance change highlight.
- **Motion** is limited to: the change highlight (`--duration-base`), the evidence disclosure
  expand/collapse (`--duration-base`), the Genie answer panel and access-code modal entrances
  (`--duration-slow`, `--easing-emphasized`), and loading indicators. No animation exceeds
  `--duration-slow`; no looping/ambient animation beyond an active loading spinner; all
  motion respects `prefers-reduced-motion` by disabling non-essential transitions and keeping
  only opacity changes, per `ui-tokens.md`'s Motion rules.

---

## Accessibility Rules

Requirements, not aspirations. Underlying values come from `ui-tokens.md`'s Accessibility
Tokens section.

### Structure and semantics

- One `h1` per page (`--text-display`); heading levels descend without skipping.
- Landmarks: `header` (top bar), `nav` (primary navigation), `main` (content) — one each per
  page.
- Lists are `ul`/`ol`, tables are `table`, buttons are `button`, links are `a`. No `div` with
  a click handler anywhere.
- A skip link to `main` is the first focusable element on every page.

### Keyboard and focus

- Everything interactive is reachable and operable by keyboard, in DOM order matching visual
  order.
- The focus ring (`2px solid var(--color-focus-ring)`, `2px` offset) is always visible.
- Focus moves programmatically in exactly three cases: to the first invalid field on failed
  validation, to the newest assistant message when a Genie answer arrives, and into the
  access-code modal on open (returning to the trigger on close).

### Forms

- Every input has an associated visible `label`; placeholders never substitute.
- Errors use `aria-invalid` and `aria-describedby` pointing at the message element.
- The form-level error summary is focusable and receives focus on validation failure.
- Required fields carry the `required` attribute in addition to the visual marker.

### Status and live regions

- One polite live region announces: a received Genie answer, a Genie no-answer, a failed
  request, a successful write, and a changed attendance count (at most one message per
  refresh cycle). Poll cycles that change nothing announce nothing.
- `aria-busy` is set on regions and buttons while loading.

### Colour, contrast, and non-colour cues

- All text meets `ui-tokens.md`'s documented contrast ratios against its own background,
  including text inside status pairings and disabled controls.
- **No state is communicated by colour alone anywhere** — every status, active nav item,
  filter selection, and validation error carries a text or icon cue in addition to colour.
- `--color-accent` is never used as text on white, per `ui-tokens.md`'s explicit flag — only
  `--color-accent-text` is used for text/labels on an accent-tinted background.
- Text is never rendered over an image or gradient.

### Touch and pointer

- Interactive targets meet the 40×40px minimum at every breakpoint, not only on mobile (see
  Responsive Rules).
- No interaction depends on hover, long-press, drag, or gesture; every action has a plain
  click/tap equivalent.

### Content

- Icons carrying meaning have accessible text; decorative icons are `aria-hidden`.
- Link text is meaningful out of context ("Register for the AI Workshop", not "here").
- Coded identifiers (`evt_001`) never appear as the only description of a record.

---

## Visual Consistency Rules

1. **No arbitrary colours.** Every colour comes from `ui-tokens.md` by name. No hex literals,
   no `rgba()` opacity hacks, no per-page palettes.
2. **No arbitrary typography.** No font sizes, weights, or line heights outside the
   `--text-*` scale. No all-caps labels. No manual letter-spacing outside the one documented
   table-header convention (`0.02em`).
3. **No arbitrary spacing.** Every margin, padding, and gap is a `--space-*` step. A layout
   that "needs" an in-between value is wrong.
4. **No arbitrary radii, borders, or shadows.** Only `--radius-sm`/`md`/`lg`/`full`, only
   `--border-width` solid, and shadows only where `ui-tokens.md` names them
   (`--shadow-raised` on the one clickable-card pattern; `--shadow-elevated` on the Genie
   answer panel's arrival; `--shadow-modal` on the access-code modal). No shadow on static
   content.
5. **No one-off interaction patterns.** Toasts, drawers, tooltips, accordions beyond the
   evidence disclosure, carousels, tabs, and additional modals are all excluded. A second
   modal, in particular, would exceed what `ui-tokens.md` provisions for and must not be
   introduced without updating that file first.
6. **Reuse before creating.** Check `ui-registry.md` before building a new element; if
   something close exists, use it or add a variant there rather than forking locally.
7. **Preserve patterns across pages.** The same entity, status, timestamp, count, or action
   looks and reads identically everywhere it appears.
8. **One vocabulary.** An action's label, loading label, and success message form one
   consistent phrase family throughout.
9. **No decorative structure.** Borders, dividers, and icons are used only where they encode
   real information. There is no sequence in this product, so no numbered markers are used
   anywhere.
10. **Consistency is checked at integration.** A surface introducing a pattern not described
    here or in `ui-registry.md` is a defect to reconcile, not a local improvement to keep.

---

## Token Reference Index

Every token role this document uses, confirmed present in `ui-tokens.md`:

- **Color:** `--color-bg`, `--color-surface`, `--color-surface-elevated`,
  `--color-surface-sunken`, `--color-primary`, `--color-primary-hover`,
  `--color-primary-subtle`, `--color-accent`, `--color-accent-text`, `--color-accent-subtle`,
  `--color-text`, `--color-text-muted`, `--color-text-disabled`, `--color-border`,
  `--color-divider`, `--color-success`/`-subtle`, `--color-warning`/`-subtle`,
  `--color-error`/`-subtle`, `--color-info`/`-subtle`, `--color-focus-ring`.
- **Type:** `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body`,
  `--text-body-medium`, `--text-label`, `--text-caption`, `--text-mono`.
- **Space:** `--space-1` through `--space-12`.
- **Size:** `--size-control-sm`/`md`/`lg`, `--icon-sm`/`md`/`lg`, `--avatar-sm`/`md`,
  `--card-min-width`, `--table-row-height`, `--nav-height`.
- **Border/radius:** `--border-width`, `--border-style`, `--radius-sm`/`md`/`lg`/`full`.
- **Shadow:** `--shadow-none`, `--shadow-raised`, `--shadow-elevated`, `--shadow-modal`.
- **Motion:** `--duration-fast`/`base`/`slow`, `--easing-standard`, `--easing-emphasized`.
- **Breakpoints:** `--bp-sm`/`md`/`lg`/`xl`; container max-width 1120px (cited by value —
  `ui-tokens.md` does not expose it as a named custom property).
- **Semantic states:** the full 14-row Semantic State Tokens table, reused verbatim.

**Known gaps in `ui-tokens.md`** — deliberately not invented here, per that file's own rule
that new tokens are added there first:

- No dedicated form max-width narrower than the container. Forms currently use the full
  container width; if a narrower form measure is wanted, it should be added to
  `ui-tokens.md` before any form implements one locally.
- No dedicated "reading measure" token for prose/chat line length narrower than the
  container. The Ask Genie conversation currently uses the same container width as every
  other page for this reason.

---

## Rules for This File

1. `ui-tokens.md` is the source of truth for all visual values. This document references
   exact token names only and never restates or overrides a value.
2. `ui-registry.md` is the source of truth for reusable components. This document describes
   behaviour and rules, not a component inventory.
3. Agents must reuse an established UI pattern before creating a new one. New patterns
   require updating this file, or `ui-tokens.md` if a new token is needed, before
   implementation — not after.
4. Product requirements, user flows, and scope come from `project-overview.md`.
5. Application structure, routing, API contracts, and technical constraints come from
   `architecture.md`; where this document appears to conflict with it, `architecture.md`
   wins.
6. Genie's configuration, semantics, answer behaviour, and failure taxonomy come from
   `genie.md`. This document governs only how those results are presented.
7. UI behaviour must be identical across all four workstreams — the same pattern, the same
   token, the same wording, everywhere it recurs.
8. Accessibility is required, not optional.
9. Responsive behaviour must be verified at `--bp-sm`, `--bp-md`, `--bp-lg`, and `--bp-xl`
   for every major surface before it is considered done.
10. These rules are deliberately constrained to what four agents can implement well within a
    twelve-hour build. Anything that increases implementation cost without increasing
    clarity, usability, or accessibility does not belong here.
