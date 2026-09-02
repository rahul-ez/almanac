# UI Registry

## Registry Principles

This registry exists so that four agents building different surfaces of Campus Companion
produce one coherent product, not four dialects of it.

- **Reuse before creation.** If a pattern already exists here, use it. A near-match is a
  reason to extend or parameterize an existing component, not to fork a new one.
- **Consistency over local optimization.** A component behaves identically everywhere it
  appears, even if a page-specific tweak would look marginally better in isolation.
  `ui-rules.md`'s Core UI Principle 3 governs this registry too.
- **Composability.** Components are built from smaller, already-registered pieces
  (badges, buttons, status indicators) rather than duplicating their internals. Composite
  Patterns exist specifically to name these combinations so they aren't reinvented.
- **Accessibility is inherent, not additive.** A component is not "done" until it meets
  the accessibility requirements in `ui-rules.md`; this registry states component-specific
  requirements but never overrides that baseline.
- **Simplicity.** Campus Companion has three surfaces and a small, closed set of data
  shapes. The registry stays just as small — a handful of strong primitives, a handful of
  campus-specific compositions, nothing speculative.
- **Predictable behavior.** The same component name always means the same markup, the same
  states, and the same interaction pattern, regardless of which agent's page uses it.
- **Avoid unnecessary components.** A one-off arrangement of existing primitives used on a
  single page is not registered. Only patterns that recur, or that carry rules important
  enough to standardize (e.g. the one clickable-card pattern), earn an entry.
- **Shared ownership, clear boundaries.** Every registered component has one owning
  workstream (see Ownership and Workstream Boundaries) so changes are coordinated, not
  silently overwritten by whichever agent touches it next.

---

## Component Categories

- **Layout** — shell, container, section, grid.
- **Navigation** — top bar, nav item, skip link.
- **Typography / Content** — page header, section header, definition list.
- **Buttons and Actions** — button (primary/secondary/tertiary), icon button, link.
- **Forms and Inputs** — form field, text input, select, date/time input, segmented
  control, form section, submit control.
- **Data Display** — table, table row, badge/status indicator, empty-state row.
- **Cards** — base card, event card, metadata row.
- **Status / Feedback** — status indicator, banner, inline field error, live region.
- **Loading** — skeleton (card, row), inline loading indicator, freshness stamp.
- **Dialogs / Overlays** — access-code modal (the product's only modal).
- **Genie / Conversation** — chat container, message bubble, query input, suggested-question
  chip, evidence disclosure, Genie result table.
- **Campus-Specific Components** — event card (composition), room availability table,
  attendance datum, teacher availability answer, club reference, live-update highlight,
  role badge.

These categories match what the product actually contains — there is no dashboard-widget,
carousel, tooltip, or generic-component-library category because `ui-rules.md` explicitly
excludes those patterns (Visual Consistency Rule 5).

---

## Component Registry

### Shell

- **Purpose:** The one persistent application frame every page renders inside — skip
  link, top bar, main landmark.
- **When to use:** Exactly once, at the app root. Never re-rendered per page.
- **When NOT to use:** Never nested; never re-instantiated inside a page component.
- **Variants:** None.
- **Required inputs:** `children` (page content).
- **Optional inputs:** None.
- **States:** default only — the shell itself never shows loading/error (`ui-rules.md`,
  Loading and Async Behaviour: "the shell and page header render immediately and never
  enter a loading state").
- **Responsive behavior:** Top bar stays sticky at `--nav-height` at every breakpoint; no
  hamburger menu ever appears (`ui-rules.md` Navigation Rules).
- **Accessibility requirements:** Skip link is the first focusable element; exactly one
  `header`, one `nav`, one `main` landmark.
- **Data expectations:** None — purely structural.
- **Related components:** TopBar, NavItem, Container.
- **Owning workstream:** Frontend.

---

### TopBar

- **Purpose:** Sticky top navigation containing the product name, primary nav, and the
  session/role indicator.
- **When to use:** Inside Shell only.
- **When NOT to use:** As a page-level header — that's PageHeader.
- **Variants:** None (identical on all three pages, per `ui-rules.md` Navigation Rules).
- **Required inputs:** `role` (`"student" | "council"`, from `/api/session`).
- **Optional inputs:** None.
- **States:** default; active-nav-item state per route.
- **Responsive behavior:** Height (`--nav-height`) and item set are fixed at every
  breakpoint — no collapsing.
- **Accessibility requirements:** `nav` landmark; active item marked with
  `aria-current="page"` in addition to color, per `ui-rules.md` Active state rule.
- **Data expectations:** Current route, current session role.
- **Related components:** NavItem, RoleBadge.
- **Owning workstream:** Frontend.

---

### NavItem

- **Purpose:** A single primary navigation destination.
- **When to use:** Only inside TopBar, exactly three instances: Home, Ask Genie, Council
  access.
- **When NOT to use:** For any secondary or in-page navigation — none exists in this
  product.
- **Variants:** default, active.
- **Required inputs:** `label`, `href` (or `onClick`, for "Council access" which opens the
  access-code modal instead of navigating when role is `student`).
- **Optional inputs:** None.
- **States:** default, hover, focus, active(current-page).
- **Responsive behavior:** Identical at every breakpoint (`ui-rules.md`: "Navigation order
  and labels are identical at every breakpoint and on every page").
- **Accessibility requirements:** `aria-current="page"` on the active item; reachable by
  keyboard in DOM order.
- **Data expectations:** None beyond label/href.
- **Related components:** TopBar.
- **Owning workstream:** Frontend.

---

### Container

- **Purpose:** The single centered, max-width content wrapper for a page's content.
- **When to use:** Once per page, directly inside `main`.
- **When NOT to use:** Nested inside another Container (`ui-rules.md`: "never nested inside
  another container").
- **Variants:** None — one max-width (1120px) for every page.
- **Required inputs:** `children`.
- **States:** N/A (purely structural).
- **Responsive behavior:** Side padding `--space-4` below `--bp-md`, `--space-8` at
  `--bp-lg` and above.
- **Accessibility requirements:** None beyond normal document flow.
- **Related components:** Shell, Section.
- **Owning workstream:** Frontend.

---

### PageHeader

- **Purpose:** The opening block of every page: title, one-line supporting text, and an
  optional single page-level action/status slot.
- **When to use:** Once, at the top of every page's content, inside Container.
- **When NOT to use:** For section titles — use SectionHeader instead.
- **Variants:** with/without the action slot (Newsletter Home uses it for refresh +
  freshness stamp; Ask Genie and Admin Panel do not).
- **Required inputs:** `title`, `description`.
- **Optional inputs:** `actionSlot` (at most one item).
- **States:** default only.
- **Responsive behavior:** `--text-display` steps down to `--text-h1` size below `--bp-sm`;
  action slot moves below the description and becomes full-width below `--bp-md`.
- **Accessibility requirements:** `title` renders as the page's single `h1`.
- **Data expectations:** Static copy per page; action slot content is page-specific.
- **Related components:** Container, Section.
- **Owning workstream:** Frontend.

---

### Section

- **Purpose:** A named region of a page's content — the unit pages are built from (at most
  four per page).
- **When to use:** For every distinct content area under a PageHeader (e.g. "Upcoming
  events," "Room availability," "Book a room").
- **When NOT to use:** As a wrapper for a single card or control — that's over-sectioning.
- **Variants:** with/without a control row (filter, refresh) beneath the title.
- **Required inputs:** `title` (renders as `h2` at `--text-h1` size), `children`.
- **Optional inputs:** `description` (one line), `controlRow`.
- **States:** default, loading (per-section skeleton), empty, error — each section's async
  state is independent of its siblings (`ui-rules.md`: "one failing section never blanks
  the page").
- **Responsive behavior:** Section spacing (`--space-8` between sections) is constant;
  content inside adapts per its own component rules (Grid, Table, Form).
- **Accessibility requirements:** `h2` heading; `aria-labelledby` on any table/region inside
  pointing at this heading.
- **Data expectations:** None itself — delegates to its children.
- **Related components:** PageHeader, Grid, Table, EmptyState, ErrorState.
- **Owning workstream:** Frontend.

---

### Grid

- **Purpose:** The fluid multi-column layout for card collections (events only, in this
  product).
- **When to use:** Wrapping EventCard instances in the Newsletter Home event section.
- **When NOT to use:** For tabular data (Table exists for that) or for any single-column
  list (use List).
- **Variants:** None — one grid behavior, breakpoint-driven.
- **Required inputs:** `children` (Card instances).
- **States:** default, loading (skeleton cards in the same grid shape), empty.
- **Responsive behavior:** 1 column below `--bp-sm`, 2 columns `--bp-sm`–`--bp-lg`, 3
  columns at `--bp-lg`+; `--space-6` gaps; items never shrink below `--card-min-width`.
- **Accessibility requirements:** List semantics (`ul`/`li`) wrapping card links.
- **Data expectations:** An array of event records.
- **Related components:** EventCard, Skeleton.
- **Owning workstream:** Frontend.

---

### Button

- **Purpose:** The single button primitive covering all three hierarchy levels.
- **When to use:** Any user-initiated action (submit, refresh, retry, expand evidence,
  ask a question).
- **When NOT to use:** For navigation — use Link instead (`ui-rules.md`: "a link navigates;
  a button acts").
- **Variants:** `primary`, `secondary`, `tertiary` (destructive variant defined but unused
  in MVP scope).
- **Required inputs:** `label` (verb-first, e.g. "Book room"), `onClick`.
- **Optional inputs:** `loadingLabel` (present-participle form, e.g. "Booking room…"),
  `size` (`--size-control-md` default, `--size-control-lg` for the two form submits and
  Genie's send action), `disabled` (only when the action is genuinely impossible right now,
  never for permission — see Permissions in `ui-rules.md`).
- **States:** default, hover, focus, active/pressed, loading (`aria-busy`, label swaps to
  `loadingLabel`), disabled (three-signal: muted text, sunken background, `not-allowed`
  cursor).
- **Responsive behavior:** Minimum 40×40px hit area at every breakpoint; below `--bp-md`
  uses `--size-control-md` even where desktop would use `sm`.
- **Accessibility requirements:** Real `button` element; `aria-label` required if
  icon-only (only the Genie send button qualifies).
- **Data expectations:** None.
- **Related components:** IconButton, FormSection, Banner.
- **Owning workstream:** Frontend.

---

### IconButton

- **Purpose:** An icon-only actionable control.
- **When to use:** Exclusively for the Genie send control — the one icon-only-button
  exception `ui-tokens.md`/`ui-rules.md` permit.
- **When NOT to use:** Anywhere else. Every other action uses a labelled Button.
- **Variants:** None.
- **Required inputs:** `icon`, `ariaLabel`, `onClick`.
- **States:** Same as Button.
- **Responsive behavior:** 40×40px minimum hit area regardless of icon's visual size.
- **Accessibility requirements:** `aria-label` mandatory, not optional.
- **Related components:** Button, GenieQueryInput.
- **Owning workstream:** Frontend.

---

### Link

- **Purpose:** In-body or structural navigation to another location (in-app route or the
  one external destination).
- **When to use:** Primary nav items, the event-card stretched link, the Newsletter→Ask
  Genie entry point, the Event Registration external link.
- **When NOT to use:** For actions that mutate data — those are Buttons.
- **Variants:** `internal`, `external` (external adds the `lucide-react` external-link icon
  and "(opens in a new tab)" accessible-name suffix, `rel="noopener noreferrer"`).
- **Required inputs:** `label` (meaningful out of context), `href`.
- **States:** default, hover, focus, visited (not separately styled — no visited-state
  requirement in this product).
- **Responsive behavior:** None beyond normal text reflow.
- **Accessibility requirements:** Underlined, `--color-primary`, distinguishable without
  color; external links get the accessible-name suffix.
- **Related components:** EventCard, TopBar entry point.
- **Owning workstream:** Frontend.

---

### FormField

- **Purpose:** The wrapper standardizing label, input, helper text, and error presentation
  for every form control.
- **When to use:** Every input in the Admin Panel forms and the access-code modal.
- **When NOT to use:** For the Genie query input, which has its own registered component
  (GenieQueryInput) with a visually hidden label per `ui-rules.md`.
- **Variants:** text, select, date, time, segmented-control-as-filter (a lighter variant
  used outside forms — see SegmentedControl below).
- **Required inputs:** `label`, `inputId`, `value`, `onChange`.
- **Optional inputs:** `helperText`, `required` (adds visible marker + `required`
  attribute), `errorText` (replaces helper text, sets `aria-invalid`/`aria-describedby`).
- **States:** default, focus, filled, error, disabled (only for a select whose options
  haven't loaded yet — the one legitimate disabled-at-rest case).
- **Responsive behavior:** Single column, full width of form, at every breakpoint.
- **Accessibility requirements:** Programmatic label association; error state wires
  `aria-invalid`/`aria-describedby`.
- **Data expectations:** For selects — options from API data only, no free text
  (club, room, room type).
- **Related components:** FormSection, SegmentedControl.
- **Owning workstream:** Frontend.

---

### SegmentedControl

- **Purpose:** Mutually-exclusive filter among four or fewer options.
- **When to use:** The room-type filter (`All`, `Classroom`, `Lab`, `Auditorium`, `Study
  room`) only — the sole segmented-control use case in this product.
- **When NOT to use:** For more than four options, or for anything that isn't a closed
  enum matching `rooms.type`.
- **Variants:** None.
- **Required inputs:** `options` (fixed to the closed `rooms.type` set plus "All"),
  `selected`, `onChange`.
- **States:** default, selected (persistent fill/indicator + `aria-selected`, never color
  alone), focus.
- **Responsive behavior:** Stays inline; no collapsing to a select at narrow widths (four
  options fit at all breakpoints per the room-availability table's mobile stacking).
- **Accessibility requirements:** `role="tablist"`/`radiogroup` semantics with
  `aria-selected` or `aria-checked`.
- **Data expectations:** The four `rooms.type` values.
- **Related components:** RoomAvailabilityTable.
- **Owning workstream:** Frontend.

---

### Table

- **Purpose:** The dense-data primitive for room availability and Genie result rows.
- **When to use:** Any record set that is "one row of parallel attributes, compared across
  rows" (`ui-rules.md` layout-pattern table).
- **When NOT to use:** For events (always cards) or for short homogeneous strings with no
  metadata (use List).
- **Variants:** `known-shape` (room availability — stacks to label/value blocks below
  `--bp-md`, never scrolls), `arbitrary-shape` (Genie result rows — always horizontally
  scrollable, since column semantics come from generated SQL).
- **Required inputs:** `columns`, `rows`.
- **Optional inputs:** `caption` (required for arbitrary-shape tables reporting total row
  count when capped at 20).
- **States:** default, loading (row-height skeletons), empty (full-width `empty`-styled row
  keeping the header visible), error.
- **Responsive behavior:** Per variant, above. Max six columns on desktop for known-shape
  tables.
- **Accessibility requirements:** Real `table`/`thead`/`th scope="col"` markup;
  `aria-labelledby` pointing at the owning Section's heading; missing values render as an
  em dash with accessible text "not available."
- **Data expectations:** Column order: identity → classifying attributes → status →
  actions.
- **Related components:** RoomAvailabilityTable, GenieResultTable, StatusIndicator.
- **Owning workstream:** Frontend.

---

### List

- **Purpose:** A plain vertical list of short homogeneous strings with no metadata.
- **When to use:** E.g. a list of free room names inside a Genie answer's inline summary.
- **When NOT to use:** For anything with per-item metadata or actions — that's Table or
  Grid.
- **Variants:** None.
- **Required inputs:** `items` (strings).
- **States:** default, empty (falls back to the `empty` state pairing).
- **Responsive behavior:** Reflows naturally; capped at ten items on a browse surface with
  a visible "Showing N of M" count — no pagination.
- **Accessibility requirements:** Real `ul`/`li`.
- **Related components:** GenieMessage.
- **Owning workstream:** Frontend.

---

### DefinitionList

- **Purpose:** Short parallel label/value pairs with no actions.
- **When to use:** Card metadata rows, the booking-success summary.
- **When NOT to use:** For data with actions attached, or more than roughly four pairs.
- **Variants:** None.
- **Required inputs:** `pairs` (array of `{label, value}`).
- **States:** default only.
- **Responsive behavior:** Stacks naturally; no horizontal variant needed at this scale.
- **Accessibility requirements:** Real `dl`/`dt`/`dd`.
- **Related components:** Card, Banner (success variant).
- **Owning workstream:** Frontend.

---

### Card (base)

- **Purpose:** The generic single-record surface: outline at rest, `--radius-md`,
  `--space-4` padding.
- **When to use:** As the base every specific card (currently only EventCard) extends.
- **When NOT to use:** As a page-region wrapper — Section covers that; Card always
  represents one record.
- **Variants:** static, clickable (the one clickable-card pattern — see EventCard).
- **Required inputs:** `children` composed per the Universal card anatomy in `ui-rules.md`
  (status indicator → title → metadata row → body → primary datum → actions, in that
  order; slots may be omitted, order may not change).
- **States:** default, hover/focus (clickable variant only — `--shadow-raised`), equal
  height per grid row.
- **Responsive behavior:** Never shrinks below `--card-min-width`; wraps to next row in
  Grid.
- **Accessibility requirements:** If clickable, the entire card is one stretched link with
  no nested interactive elements inside it.
- **Data expectations:** Up to four metadata values; body clamped to two lines.
- **Related components:** Grid, EventCard, StatusIndicator, DefinitionList.
- **Owning workstream:** Frontend.

---

### StatusIndicator

- **Purpose:** The single reusable rendering of the 14-state semantic vocabulary from
  `ui-tokens.md` — text label + icon + color pairing, never color alone.
- **When to use:** Anywhere a state from the Semantic State Tokens table needs to be shown
  (event status, room/teacher availability, booking outcome, Genie's `no_answer`/`error`).
- **When NOT to use:** For a new/unlisted state — extend `ui-tokens.md` first; this
  component never invents a pairing locally.
- **Variants:** One per state in the table (`available`, `unavailable`, `upcoming`,
  `ongoing`/`live`, `completed`, `cancelled`, `pending`, `confirmed`, `conflict`, `empty`,
  `loading`, `error`, `no_answer`; `full` is defined but unused).
- **Required inputs:** `state` (enum), `label`.
- **States:** N/A — this component *renders* a state, it doesn't itself have interactive
  states beyond default.
- **Responsive behavior:** None beyond text reflow.
- **Accessibility requirements:** Text label is always present alongside the icon; icon is
  `aria-hidden` since the text carries the meaning.
- **Related components:** Card, Table, Banner, GenieMessage.
- **Owning workstream:** Frontend.

---

### Banner

- **Purpose:** Full-width, section-scoped persistent feedback (write results, permission
  problems, conflicts, section-level failures).
- **When to use:** After any form submission (success or error), and for a section's
  load-failure state.
- **When NOT to use:** For transient/toast-style feedback — there are no toasts in this
  product.
- **Variants:** `success`, `error`, `conflict` (distinct `alert-triangle` pairing from
  plain `error`'s `alert-circle`), `warning`, `info`.
- **Required inputs:** `variant`, `heading` (bold first line), `detail` (one line).
- **Optional inputs:** `action` (e.g. "Try again").
- **States:** persistent until superseded by the next relevant event — never
  auto-dismissed.
- **Responsive behavior:** Full width of its section at every breakpoint.
- **Accessibility requirements:** Rendered inside the polite live region for success/error
  announcements.
- **Data expectations:** Plain-language copy in the user's vocabulary (never raw error
  text, stack traces, or endpoint paths).
- **Related components:** StatusIndicator, FormSection.
- **Owning workstream:** Frontend.

---

### Skeleton

- **Purpose:** Loading placeholder shaped like the final content, to avoid layout shift.
- **When to use:** Initial load of any Section (three card skeletons for the event grid,
  row-height skeletons for tables).
- **When NOT to use:** For fetches resolving in under ~300ms (no flash), or for
  poll/refresh cycles (those use the "Updating…" indicator instead, keeping old content
  visible).
- **Variants:** `card`, `row`.
- **Required inputs:** `count`.
- **States:** N/A — a skeleton is itself a loading state for its parent.
- **Responsive behavior:** Matches the shape of whatever it stands in for (Grid or Table).
- **Accessibility requirements:** `aria-busy` on the containing region.
- **Related components:** Grid, Table, Section.
- **Owning workstream:** Frontend.

---

### AccessCodeModal

- **Purpose:** The product's one and only modal — lets a student enter the council access
  code to become a `council` session.
- **When to use:** Opened from "Council access" in TopBar when role is `student`, or when
  any write endpoint returns 403.
- **When NOT to use:** Never repurposed for any other confirmation or content — `ui-rules.md`
  explicitly forbids a second modal without first updating `ui-tokens.md`.
- **Variants:** None.
- **Required inputs:** `onSubmit(code)`, `onClose`.
- **States:** default, submitting, "code not recognized" (plain restatement, never styled
  as an error — no lockout, no attempt counter).
- **Responsive behavior:** Same layout at every breakpoint; `--radius-lg`, `--shadow-modal`.
- **Accessibility requirements:** Focus trapped while open, returns to the triggering
  control on close; dismissible via close control or Escape.
- **Data expectations:** A single access-code string; never a token the frontend
  interprets — the server alone decides the resulting role.
- **Related components:** Button, RoleBadge.
- **Owning workstream:** Frontend.

---

## Campus-Specific Components

Only the patterns below are justified as standalone, reusable, campus-domain components —
everything else in the product is a composition of the generic primitives above.

### EventCard

- **Purpose:** The one and only card-grid content type in the MVP; represents a single
  event on the Newsletter Home.
- **When to use:** Every event shown in the Newsletter Home's event section.
- **When NOT to use:** Nowhere else — events are never rendered as table rows (per
  `ui-rules.md`: "events are deliberately cards everywhere").
- **Variants:** `upcoming` (clickable, stretched link to registration), `ongoing`/`live`
  (attendance datum uses the live pairing), `cancelled` (not a link, `cancelled` pairing,
  strikethrough), `completed`.
- **Required inputs:** `name`, `startTs`, `club`, `attendanceCount`, `status`.
- **Optional inputs:** `room` (or renders "Room not booked"), `description`.
- **States:** As Card (base), plus the live-update highlight on `attendanceCount` when it
  changes (single `--duration-base` flash, `--color-accent-subtle` → transparent).
- **Responsive behavior:** Follows Grid's column rules; card content itself doesn't change
  shape across breakpoints.
- **Accessibility requirements:** As Card (base) — single stretched link, no nested
  interactive elements.
- **Data expectations:** Matches the `GET /api/events` contract shape exactly
  (`event_id`, `name`, `club`, `start_ts`, `room`, `attendance_count`).
- **Related components:** Card, StatusIndicator, Grid, LiveUpdateHighlight.
- **Owning workstream:** Frontend.

---

### RoomAvailabilityTable

- **Purpose:** The authoritative, reused-everywhere rendering of room availability at a
  given time.
- **When to use:** Newsletter Home's room snapshot and the Admin Panel's pre-booking check.
- **When NOT to use:** Never as cards — rooms are "deliberately tabular everywhere"
  (`ui-rules.md`).
- **Variants:** `snapshot` (Newsletter Home, current time), `check` (Admin Panel,
  arbitrary queried time, feeding into the booking form).
- **Required inputs:** `at` (ISO timestamp), `rooms` (from `GET /api/rooms/availability`).
- **Optional inputs:** `typeFilter` (bound to SegmentedControl).
- **States:** default, loading, empty (styled as a correct answer — "No rooms free at
  15:00" — never an error), error.
- **Responsive behavior:** Stacks to label/value blocks below `--bp-md`; standard table at
  `--bp-md`+, per Table's known-shape variant.
- **Accessibility requirements:** As Table; status column uses StatusIndicator
  (`available`/`unavailable`), never color alone.
- **Data expectations:** Matches `GET /api/rooms/availability` exactly (`room_id`, `name`,
  `type`).
- **Related components:** Table, SegmentedControl, StatusIndicator.
- **Owning workstream:** Frontend.

---

### AttendanceDatum

- **Purpose:** The standardized rendering of an attendance count as "the point of an
  element" — number-then-noun, never a bare label/value pair.
- **When to use:** EventCard's primary datum slot; any Genie answer surfacing an
  attendance number.
- **When NOT to use:** As a standalone page surface — attendance is never browsed on its
  own (`ui-rules.md`: "never a standalone surface").
- **Variants:** static (`"42 registered"`), live (adds the `ongoing`/`live` StatusIndicator
  pairing while the event is in its time window).
- **Required inputs:** `count`.
- **Optional inputs:** `isLive` (boolean).
- **States:** default, live-update-highlight (on change).
- **Responsive behavior:** None beyond text reflow.
- **Accessibility requirements:** Announced once via the polite live region when it
  changes; at most one announcement per refresh cycle.
- **Data expectations:** Raw `attendance_count` per `data-contracts.md` (never
  `distinct_attendee_count` unless the surface explicitly labels it "unique").
- **Related components:** EventCard, LiveUpdateHighlight, GenieMessage.
- **Owning workstream:** Frontend.

---

### TeacherAvailabilityAnswer

- **Purpose:** Not a card or table — a conversational rendering pattern (StatusIndicator +
  sentence) used only inside Genie answers, since "no teacher card exists"
  (`ui-rules.md`).
- **When to use:** Whenever a Genie answer resolves a teacher-availability question.
- **When NOT to use:** As a standalone browsable surface — none exists for teachers.
- **Variants:** `available`, `unavailable`, `not_found` (uses the `no_answer` pairing —
  "No timetable data for that name").
- **Required inputs:** `teacherName`, `at`, `state`.
- **States:** As StatusIndicator.
- **Responsive behavior:** Inline within GenieMessage; wraps normally.
- **Accessibility requirements:** As StatusIndicator.
- **Data expectations:** Sourced entirely from the Genie answer text/rows — this component
  formats, it does not independently query.
- **Related components:** GenieMessage, StatusIndicator, GenieResultTable (evidence).
- **Owning workstream:** Frontend.

---

### ClubReference

- **Purpose:** The minimal, non-clickable rendering of a club name — appears only as
  metadata, never as its own surface ("no club surface exists," `ui-rules.md`).
- **When to use:** EventCard's metadata row; Genie answer text referencing a club.
- **When NOT to use:** As a link or a card — clubs have no dedicated page.
- **Variants:** None.
- **Required inputs:** `name`.
- **States:** default only.
- **Related components:** EventCard, DefinitionList.
- **Owning workstream:** Frontend.

---

### BookingSummary

- **Purpose:** The DefinitionList composition shown after a successful booking, and the
  conflict-detail rendering on a 409 — bookings have "no bookings browse surface"
  (`ui-rules.md`), so this is the only place a booking's fields are shown.
- **When to use:** Inside the success Banner after `POST /api/bookings` succeeds, and
  inside the conflict Banner when it returns 409.
- **When NOT to use:** As a standalone list/table of bookings — does not exist in scope.
- **Variants:** `success` (room, event, time window), `conflict` (the *conflicting*
  booking's event, room, and time window).
- **Required inputs:** `room`, `event`, `startTs`, `endTs`.
- **States:** N/A — rendered once per outcome, not interactive.
- **Data expectations:** Matches the `POST /api/bookings` success/409 response shapes
  exactly.
- **Related components:** Banner, DefinitionList, FormSection.
- **Owning workstream:** Frontend.

---

### LiveUpdateHighlight

- **Purpose:** The single, product-wide "this value just changed" animation — a behavior
  wrapper, not a visual component with its own chrome.
- **When to use:** Wrapping AttendanceDatum (and any other live-polled numeric value) on
  the moment its value changes.
- **When NOT to use:** For any other kind of feedback — this is not a generic attention
  animation; it is reserved for live-data change only, per `ui-tokens.md` Motion.
- **Variants:** None — one flash pattern (`--duration-base`, `--color-accent-subtle` →
  transparent) everywhere it's used.
- **Required inputs:** `value`, `children`.
- **States:** default, flashing (triggered on value change, never looping).
- **Responsive behavior:** None — purely a timing/opacity effect.
- **Accessibility requirements:** Paired with a single polite live-region announcement of
  the new value; respects `prefers-reduced-motion` (opacity-only fallback).
- **Related components:** AttendanceDatum.
- **Owning workstream:** Frontend.

---

### RoleBadge

- **Purpose:** The compact indicator that a session currently holds `council` access.
- **When to use:** Admin Panel header, once a `council` session exists.
- **When NOT to use:** For `student` sessions — no badge is shown; absence of the badge is
  itself the signal.
- **Variants:** None (`council` only — there is no `student` badge).
- **Required inputs:** `label` ("Council access").
- **States:** default only.
- **Responsive behavior:** `--avatar-sm`, unaffected by breakpoint.
- **Accessibility requirements:** Text label present (not icon-only).
- **Related components:** TopBar, AccessCodeModal.
- **Owning workstream:** Frontend.

---

## Composite Patterns

### Newsletter Event Listing

- **Purpose:** The full "what's happening on campus" browse experience.
- **Composition:** Section (title "Upcoming events") → Grid → EventCard × N, with
  Skeleton/EmptyState/ErrorState covering the section's three non-default states.
- **Typical usage:** Newsletter Home, the only place this pattern appears.
- **Variations:** None — one listing, one filter-free arrangement (no filters on events in
  MVP scope).
- **Constraints:** Cards never exceed four metadata values; list is capped with a visible
  "Showing N of M" if it ever exceeds ten (not expected at hackathon data volumes, but the
  rule is inherited from List/Grid regardless).

---

### Room Availability Snapshot

- **Purpose:** "What's free right now" at a glance, and the pre-booking check inside the
  Admin Panel.
- **Composition:** Section (title "Room availability", control row = SegmentedControl for
  room type) → RoomAvailabilityTable.
- **Typical usage:** Newsletter Home (read-only snapshot at current time); Admin Panel's
  booking form (same table, driven by the form's chosen time, informing but not gating
  submission — the server is still the source of truth for conflicts).
- **Variations:** `at` time is "now" on Newsletter Home, form-driven in the Admin Panel.
- **Constraints:** Never cards; filter is the closed four-value enum only; empty result is
  a valid, correctly-worded answer, not an error.

---

### Governed Write Form

- **Purpose:** The shared shape of both Admin Panel forms (create event, book a room).
- **Composition:** Section (`h2` + one-line description) → FormSection → FormField × N
  (single column, `--space-4` apart) → Button (primary, size `lg`) → Banner
  (success/error/conflict feedback, appearing above the form fields).
- **Typical usage:** Admin Panel only, once per governed write.
- **Variations:** Create-event form omits the booking-conflict Banner variant unless a
  room was supplied at creation (per `data-contracts.md`'s create-event write contract);
  book-room form always includes it.
- **Constraints:** Never disables the submit button to signal invalid input; on 403, the
  form is abandoned and AccessCodeModal reopens rather than showing an inline error; on
  success, no navigation occurs and the relevant read data (RoomAvailabilityTable /
  Newsletter Event Listing) is re-fetched before the banner renders.

---

### Genie Question-and-Answer Exchange

- **Purpose:** One turn of the Ask Genie conversation — the unit the whole surface is built
  from.
- **Composition:** GenieMessage (user, right-aligned) → GenieMessage (assistant,
  left-aligned) containing GenieAnswerText + GenieEvidenceDisclosure (which contains
  GenieResultTable when expanded).
- **Typical usage:** Ask Genie surface, repeated once per question, oldest to newest.
- **Variations:** Assistant message renders as a plain answer (`ok`), a `no_answer`
  StatusIndicator + SuggestedQuestionChip row, or an `error` StatusIndicator + "Try again"
  Button — see Genie UI Registry below.
- **Constraints:** Evidence disclosure is present on every `ok` answer and absent on
  `no_answer`/`error`; disclosure state resets per message; the frontend never composes or
  supplements the `answer` text.

---

### Empty / Error Section

- **Purpose:** The shared shape for a Section that has nothing to show or failed to load.
- **Composition:** StatusIndicator (icon + pairing) → one sentence of why/what's next →
  optional single Button.
- **Typical usage:** Any Section's body when its data fetch returns empty or fails —
  Newsletter Home's event/room sections, Genie's `no_answer`/`error` messages (via
  GenieMessage instead of a full Section, but the same anatomy).
- **Variations:** `empty` (no action, e.g. "No upcoming events"), `empty` with a clear-filter
  action (e.g. "No labs free at 15:00" → "Show all rooms"), `error` (always with "Try
  again").
- **Constraints:** Never rendered centered except this one block; never mixes the `empty`
  and `error` pairings; never shows raw error/exception text.

---

## Genie UI Registry

These patterns are presentation-only and must stay consistent with the behavior and
failure taxonomy `genie.md` defines — this registry never redefines what Genie answers or
how it decides to answer; it only names how the answer is rendered.

### GenieChatContainer

- **Purpose:** The one bounded panel holding the entire conversation and the query input.
- **When to use:** Ask Genie surface only, once.
- **Variants:** None.
- **Required inputs:** `messages` (ordered), `onSubmit`.
- **States:** default; persists across navigation within the same session
  (`ui-rules.md`: "the Genie conversation persists in memory ... and is restored").
- **Responsive behavior:** Always single-column, full-height, at every breakpoint; only
  side padding changes.
- **Accessibility requirements:** Contains the one polite live region for answer/no-answer/
  error/attendance announcements.
- **Related components:** GenieMessage, GenieQueryInput.
- **Owning workstream:** Frontend.

---

### GenieMessage

- **Purpose:** One turn in the conversation — user question or assistant answer.
- **When to use:** Every exchange inside GenieChatContainer.
- **Variants:** `user` (right-aligned, `--color-primary-subtle`), `assistant-ok`
  (left-aligned, `--color-surface-elevated`, arrives with `--shadow-elevated` /
  `--duration-slow`), `assistant-no_answer` (`no_answer` pairing, no evidence disclosure,
  shows SuggestedQuestionChip row again), `assistant-error` (`error` pairing, "Try again"
  Button that resends the same question), `assistant-loading` (settled-panel styling +
  "Checking campus data…", no spinner-as-personality).
- **Required inputs:** `role`, `content`.
- **States:** As listed in Variants — these map 1:1 to Genie's `status` field
  (`ok`/`no_answer`/`error`) per the Ask Genie contract in `architecture.md`.
- **Responsive behavior:** Never wider than three-quarters of the container; wraps long
  text normally.
- **Accessibility requirements:** Newest assistant message receives programmatic focus
  when it arrives.
- **Data expectations:** Directly reflects one `POST /api/genie/ask` response — never
  transformed or supplemented.
- **Related components:** GenieEvidenceDisclosure, StatusIndicator, SuggestedQuestionChip.
- **Owning workstream:** Frontend.

---

### GenieQueryInput

- **Purpose:** The single-line-growing textarea + send control pinned to the chat
  container's bottom.
- **When to use:** Once, inside GenieChatContainer.
- **Variants:** None.
- **Required inputs:** `value`, `onChange`, `onSubmit`.
- **States:** default, disabled (while a question is in flight), refocused on answer
  arrival.
- **Responsive behavior:** Sticky to viewport bottom on mobile; `--size-control-lg` minimum
  height at every breakpoint.
- **Accessibility requirements:** Visually hidden label (placeholder is an example, never
  the label itself); Enter submits, Shift+Enter inserts a newline.
- **Related components:** IconButton (send), GenieChatContainer.
- **Owning workstream:** Frontend.

---

### SuggestedQuestionChip

- **Purpose:** A tappable example question.
- **When to use:** Genie's empty state (four chips: rooms, teachers, attendance, events)
  and re-shown after a `no_answer` response.
- **When NOT to use:** As a generic tag/filter component elsewhere — chips are reserved for
  this one Genie use case (`ui-rules.md` layout-pattern table: "Chips — Genie suggested
  questions only").
- **Variants:** None.
- **Required inputs:** `question` (text), `onSelect`.
- **States:** default, hover, focus, pressed (selecting submits immediately).
- **Responsive behavior:** Wraps naturally; no horizontal scroll needed at four items.
- **Accessibility requirements:** Real `button`, `--radius-full`.
- **Data expectations:** Drawn from the benchmark question set in `genie.md`.
- **Related components:** GenieMessage (empty and `no_answer` states).
- **Owning workstream:** Frontend.

---

### GenieEvidenceDisclosure

- **Purpose:** The tertiary, collapsed-by-default control revealing the SQL/data basis —
  the product's grounding guarantee, present on every successful answer.
- **When to use:** Every `assistant-ok` GenieMessage, without exception.
- **When NOT to use:** On `no_answer`/`error` messages — there is nothing to disclose.
- **Variants:** collapsed (default), expanded.
- **Required inputs:** `sql`, `rows`, `rowCount`.
- **States:** collapsed, expanded (`--duration-base` expand/collapse).
- **Responsive behavior:** Expanded SQL block and result table each scroll within
  themselves and never widen the page.
- **Accessibility requirements:** Real disclosure semantics (`button` +
  `aria-expanded`); Escape collapses it.
- **Data expectations:** SQL rendered in `--text-mono` inside a `--color-surface-sunken`
  block; a zero-row `ok` result still shows the disclosure, stating the query returned no
  rows.
- **Related components:** GenieMessage, GenieResultTable.
- **Owning workstream:** Frontend.

---

### GenieResultTable

- **Purpose:** Renders the arbitrary-shape result rows Genie returns, inside an expanded
  GenieEvidenceDisclosure.
- **When to use:** Whenever `rows.length > 0` inside an expanded disclosure.
- **When NOT to use:** Standalone outside the disclosure — it is always evidence, never a
  primary answer surface.
- **Variants:** This *is* Table's arbitrary-shape variant — no separate implementation.
- **Required inputs:** `rows` (arbitrary column shape from Genie's SQL).
- **States:** As Table.
- **Responsive behavior:** Horizontally scrollable at every breakpoint; capped at the first
  20 rows with a caption stating the total.
- **Accessibility requirements:** As Table.
- **Data expectations:** Directly the `rows` array from the Ask Genie contract response —
  no column-name inference or relabeling.
- **Related components:** Table, GenieEvidenceDisclosure.
- **Owning workstream:** Frontend.

---

## Component States

Defined once here; individual entries above reference this list rather than repeating it.

| State | Applies to | Notes |
|---|---|---|
| `default` | All | Resting appearance. |
| `hover` | Buttons, links, clickable cards, table row actions | Subtle background/border change, `--duration-fast`; never a size change. |
| `focus` | All interactive elements | `2px solid var(--color-focus-ring)`, `2px` offset; never removed without a visible replacement. |
| `active`/`pressed` | Buttons, links, chips | Hover value at 90% opacity. |
| `selected` | NavItem, SegmentedControl option | Persistent fill/indicator + ARIA state, never color alone. |
| `disabled` | Button, FormField (select only) | Three simultaneous signals; never used to signal permission. |
| `loading` | Section, Table, Grid, Button, GenieMessage | Skeleton or in-place indicator per component; never a page-level overlay. |
| `success` | Banner | Persists until superseded. |
| `warning` | Banner, StatusIndicator | Reserved for non-blocking cautions; not heavily used in MVP scope. |
| `error` | Banner, Section, GenieMessage, FormField | Visually distinct from `empty`/`no_answer`; never blames the user. |
| `empty` | Grid, Table, List, GenieMessage-adjacent | A valid, correctly-worded answer — not an error. |
| `unavailable`/`available` | StatusIndicator (room/teacher) | The half-open-interval definition from `data-contracts.md`, always with an explicit instant ("Free at 15:00"). |

Not every component supports every state — a component's own entry above is authoritative
for which states it actually implements.

---

## Responsive Component Rules

Full responsive principles live in `ui-rules.md`'s Responsive Rules section; this section
only maps registered components onto those rules so an agent doesn't have to cross-reference
during implementation.

- **Resizing/stacking:** Grid (event cards) steps 1 → 2 → 3 columns at `--bp-sm`/`--bp-lg`.
  RoomAvailabilityTable and GenieResultTable both use Table but resolve overflow
  differently — known-shape stacks to label/value blocks below `--bp-md`; arbitrary-shape
  always scrolls horizontally, at every breakpoint, per `ui-rules.md`.
- **Collapsing:** No component ever collapses into a hamburger/drawer — TopBar's three nav
  items stay inline always.
- **Overflow:** GenieEvidenceDisclosure's SQL block and GenieResultTable scroll within
  themselves, never widening the page; long strings (emails, identifiers) wrap or scroll in
  place.
- **Mobile alternatives:** FormField stays single-column at every breakpoint (no
  desktop-only multi-column form layout to diverge from). GenieQueryInput becomes sticky to
  the viewport bottom on mobile.
- **Dense information:** Card metadata caps at four values, Table caps at six columns on
  desktop, regardless of breakpoint — density is reduced by dropping content, never by
  shrinking spacing/type below the token scale.
- **Touch targets:** Every interactive component (Button, IconButton, NavItem,
  SegmentedControl option) guarantees 40×40px minimum below `--bp-md`, even where a denser
  desktop size would otherwise apply.

---

## Component Naming Convention

- **Names are semantic and PascalCase** (this is a React/TypeScript codebase per
  `architecture.md`): `EventCard`, `RoomAvailabilityTable`, `GenieQueryInput`.
- **Names describe what the component is, not which page uses it.** A component is never
  named after a route or page (no `NewsletterCard`, no `AdminForm`, no `GeniePageChat`) —
  the same rule `ui-tokens.md` applies to tokens applies here to components.
- **Generic primitives use plain, framework-neutral nouns:** `Button`, `Card`, `Table`,
  `Banner`, `Skeleton` — not `PrimaryButton1` or `MyCard`.
- **Campus-domain components are prefixed with their domain noun, not abbreviated:**
  `EventCard`, `RoomAvailabilityTable`, `TeacherAvailabilityAnswer`, not `EvtCard` or
  `RoomAvail`.
- **Genie components are prefixed `Genie` consistently:** `GenieChatContainer`,
  `GenieMessage`, `GenieQueryInput`, `GenieEvidenceDisclosure`, `GenieResultTable` — an
  agent can grep `Genie` and find every relevant component.
- **Variant names are lowercase, hyphenless words used as prop values,** not separate
  component names: `<StatusIndicator state="available" />`, not `<AvailableIndicator />`.

**Correct:** `EventCard`, `RoomAvailabilityTable`, `GenieEvidenceDisclosure`,
`SuggestedQuestionChip`.
**Incorrect:** `NewsletterEventBox` (page-named), `Card2` (non-semantic), `genie-msg`
(wrong case/convention), `AvailableRoomsGreenTable` (encodes color/appearance in the name).

---

## Ownership and Workstream Boundaries

Only the Frontend workstream owns `frontend/src/components/` per `architecture.md`'s
folder structure — every component in this registry is therefore Frontend-owned by
default; other workstreams *consume* the components' data contracts but do not modify
component code.

- **Owning workstream:** Frontend, for every component listed above. Data Platform,
  Backend, and Ingestion workstreams never touch `frontend/src/`, per `architecture.md`'s
  System Boundaries table.
- **Consumers:** All three pages (`NewsletterHome.tsx`, `AskGenie.tsx`, `AdminPanel.tsx`)
  consume the same registered components. A page file composes registered components; it
  does not define its own copy of one.
- **Modification rules:**
  - Any change to a shared component (Button, Card, Table, StatusIndicator, Banner, etc.)
    is made once, in its single implementation, and takes effect everywhere it's used —
    never patched per-page.
  - A change that would alter a component's visible behavior (new variant, new required
    prop, new state) must be reflected in this file in the same change, so the other three
    agents see it without needing to read a diff.
  - A change to what a component *looks like* still must trace back to `ui-tokens.md` — if
    the desired look needs a token that doesn't exist, `ui-tokens.md` is updated first (per
    its own Rules for This File), then the component.
- **Avoiding silent forks:** If an agent believes an existing component can't satisfy a new
  need, they extend it (new variant/prop) in place rather than creating a parallel
  component with a different name that does almost the same thing. Two components serving
  the same purpose is treated as a defect to reconcile, per `ui-rules.md` Visual
  Consistency Rule 10.
- **Since all four agents work inside one frontend codebase for UI purposes** (Data
  Platform, Backend, and Ingestion don't produce UI code), the practical coordination
  mechanism is this registry itself: before writing a new component, check here; before
  landing a change to a shared one, update the entry here in the same commit.

---

## Adding a New Component

A new component is added only when **all** of the following hold:

1. No existing component, or existing component plus a new variant/prop, can reasonably
   satisfy the need.
2. The pattern will recur (used on more than one page, or carries a rule important enough
   to standardize even if used once — e.g. AccessCodeModal).
3. Its purpose, inputs, and states can be stated as concisely as the entries above — if it
   can't be described in a few lines, it's probably several smaller components.
4. It does not duplicate an existing component's purpose under a different name.
5. It draws only from `ui-tokens.md` values and follows `ui-rules.md` behavior — it does
   not require a new token or a new interaction pattern to be invented on the spot (if it
   does, resolve that in `ui-tokens.md`/`ui-rules.md` first).
6. It doesn't add implementation cost disproportionate to the 12-hour build.

**Process (lightweight, no approval gate):**

1. Check this registry and `ui-registry.md`'s Component Registry / Campus-Specific
   Components / Composite Patterns sections for a near-match.
2. If none exists, implement the component following the same entry shape used above
   (Purpose, When to use, When NOT to use, Variants, Required/Optional inputs, States,
   Responsive behavior, Accessibility requirements, Data expectations, Related components).
3. Add that entry to this file in the same change that introduces the component, in the
   correct category.
4. If the component needs a visual value `ui-tokens.md` doesn't define, add the token there
   first, per that file's own rules — never inline a one-off value.
5. No sign-off is required beyond this — the registry entry itself is the notice to the
   other three agents.

---

## Rules for This File

1. This registry is the canonical inventory of reusable UI components and patterns for
   Campus Companion.
2. Agents must search this registry before creating a new reusable component.
3. `ui-tokens.md` defines visual values; this file never restates or overrides one.
4. `ui-rules.md` defines UI behavior and interaction rules; this file describes components
   built to those rules, not a competing rule set.
5. `project-overview.md` defines product scope; a component here exists only because a
   flow or surface in that document requires it.
6. `architecture.md` defines technical boundaries (React/TypeScript, the REST contract
   each component's data expectations must match).
7. `genie.md` defines Genie's backend/configuration behavior; the Genie UI Registry section
   here governs presentation only and must stay consistent with `genie.md`'s failure
   taxonomy (`ok`/`no_answer`/`error`).
8. Components should be reusable across workstreams where practical — in this project, that
   means reusable across the three pages within the Frontend workstream.
9. Duplicate components serving the same purpose must not be created; a duplicate found
   during integration is a defect to reconcile, not a variant to keep.
10. Components should remain small enough to implement and integrate within the 12-hour
    hackathon — this registry deliberately stays a small, coherent set rather than a
    generic component-library catalog.
11. Shared components have one owning workstream (Frontend) and are modified in one place,
    with this file updated in the same change.
12. This registry itself stays concise and practical — it names what exists and how to use
    it, and defers implementation detail to the actual component code.
