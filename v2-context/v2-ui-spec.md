# V2 UI Specification

## 0. Purpose, Sources, and a Note on Missing Files

This is the shared UI/UX implementation specification for Campus Companion **V2**. It
tells frontend agents what screens, layouts, navigation, components, interactions, states,
and flows to build. It does not redesign the architecture, does not introduce a new design
system, and treats `ui-tokens.md`, `ui-registry.md`, and `ui-rules.md` as the visual/design
authority throughout — every new pattern below is checked against those three files, and
every place V2 needs something they don't yet provide is flagged explicitly rather than
invented silently.

**On sources:** this document was built from `project-overview.md`, `architecture.md`,
`data-contracts.md`, `genie.md`, `ui-tokens.md`, `ui-registry.md`, `ui-rules.md`,
`code-standards.md`, `build-plan.md`, `progress-tracker.md`, `v2-product-plan.md`, and
`v2-api-contracts.md` — all of which were available and read in full. **`Additional-
features.txt`, `deep-research-report (2).md`, and `Campus_Companion2.pptx` were not present
in the available context and could not be read.** Nothing below is derived from or
attributed to those three files. If they contain requirements not already reflected in
`v2-product-plan.md`, that is a gap this document cannot see — flagged here once, rather
than guessed at.

**Every API reference below cites the specific endpoint from `v2-api-contracts.md`.** No
UI feature in this document assumes an endpoint that file doesn't define; where one would
be useful but isn't defined, it's marked **API dependency — requires addition to
`v2-api-contracts.md`**, per that instruction.

---

## 1. Core UI Philosophy

Campus Companion V2 is still: *a calm, trustworthy, modern campus utility with a live
pulse* — the exact phrase `ui-tokens.md`'s Design Direction already uses. V2 must read as
a more complete version of the same product, not a different one. Concretely, unchanged
from V1:

- Single light theme (`ui-tokens.md` Color System) — **no dark mode in V2.**
- Typography: `Playfair Display` for display/headings, `Public Sans` for body/functional
  text, monospace only for SQL/data-basis blocks. (Note: `ui-tokens.md`'s actual font
  stack is `Public Sans`, not `Inter` — this document defers to `ui-tokens.md` as
  authoritative and does not introduce `Inter`, even though it was mentioned in the
  brief for this file. This is a case of "use the existing tokens," applied literally.)
- The existing color, spacing, radius, shadow, and motion token scales — no new token is
  introduced anywhere in this document without saying so explicitly and citing the gap.
- Cards for event discovery; tables for room availability — never inverted.
- One persistent top bar; no sidebar; no hamburger menu at any breakpoint.
- Restrained hierarchy: one dominant thing per view, borders over resting shadows,
  `lucide-react` icons only, 1.5px stroke.
- Full responsive, accessible, and explicit loading/empty/error state coverage on every
  new surface, to the same standard V1 already holds itself to.

V2 does not introduce gradients, glassmorphism, hero sections, decorative illustration, a
second icon library, or a second modal. Where V2's new surfaces genuinely need a pattern
`ui-rules.md`/`ui-registry.md` doesn't yet have (a calendar view, a multi-area Control
Center), this document proposes the smallest extension of an *existing* pattern first, and
only proposes something new when no existing pattern fits — each such case is called out
under **Required registry/rules update** so it isn't a silent drift.

---

## 2. Existing UI Baseline

### Existing UI (V1 — implemented, per `progress-tracker.md` and `ui-registry.md`)

| Surface | Composition |
|---|---|
| **Newsletter Home** | PageHeader (with refresh + freshness stamp action slot) → Section "Upcoming events" (Grid of EventCard) → Section "Room availability" (SegmentedControl room-type filter → RoomAvailabilityTable, `snapshot` variant) |
| **Ask Genie** | PageHeader → GenieChatContainer (GenieMessage turns, GenieQueryInput, SuggestedQuestionChip empty state, GenieEvidenceDisclosure, GenieResultTable) |
| **Council/Club Admin Panel** | PageHeader → Section "Create event" (Governed Write Form) → Section "Book a room" (Governed Write Form, including Room Availability Snapshot as pre-check) → AccessCodeModal (the product's one modal) |

Navigation (V1): three flat `NavItem`s in `TopBar` — **Home**, **Ask Genie**, **Council
access** — visible to every session regardless of role, per `ui-rules.md`'s explicit rule
that "Council access" must be visible to everyone so a student has a way to identify as
council in the first place.

### V2 UI additions (this document's scope)

| Surface | Status |
|---|---|
| Entry / role selection screen | **New** |
| Home (evolved from Newsletter Home) | **Modified** — adds Campus Pulse, keeps the event/room sections |
| Events (Grid + Calendar) | **New dedicated surface** — the event grid moves here from Home; Home shows a trimmed preview |
| Event Detail | **New** |
| Ask Genie | **Modified** — adds Genie → Action rendering; conversation structure unchanged |
| Council Control Center (evolved from Admin Panel) | **Modified/expanded** — Overview, Events, Rooms, Analytics, Activity |

V2 does not replace Newsletter Home, Ask Genie, or the Admin Panel wholesale — it evolves
each one, consistent with `v2-product-plan.md`'s framing that "V2 does not re-architect
[the MVP]. It adds surfaces, actions, and polish on top of it."

---

## 3. Global Navigation

### Structure

```
Campus Companion          Home   Events   Ask Genie                    [Student]
```

```
Campus Companion          Home   Events   Ask Genie   Control Center   [Council]
```

Four items maximum, always inline, at every breakpoint — no hamburger, no drawer, matching
`ui-rules.md`'s Navigation Rules exactly ("no menu button, ever"). This is one more item
than V1's three-item nav; it stays within `ui-rules.md`'s implicit "should remain
understandable within seconds" spirit and does not scale further in V2 (no additional
top-level items are added for Analytics, Activity, etc. — those live inside Control
Center, per Section 12).

### Item behavior

| Item | Student session | Council session |
|---|---|---|
| Home | Visible, links to Home | Visible, links to Home |
| Events | Visible, links to Events (Grid default) | Visible, same |
| Ask Genie | Visible | Visible |
| Council access / Control Center | **Visible to everyone**, per the existing rule. For a `student` session, label reads "Council access" and opens the entry screen's council path (Section 4) inline. Once a `council` session exists, the same nav slot relabels to "Control Center" and links directly there. | Visible as "Control Center" |

This preserves the exact existing rule from `ui-rules.md` ("visible to everyone... a
student needs a way to identify as council in the first place") while accommodating V2's
renamed surface — the nav item's *destination* changes with role, its *presence* does not.

### Active state, hover/focus

Unchanged from `ui-registry.md`'s `NavItem`: `aria-current="page"` plus a persistent
`--color-primary`/`--color-primary-subtle` indicator (never color alone); hover/focus per
the existing `--duration-fast` interaction rule. No new states are introduced for the
fourth nav item.

### Role-aware visibility

Read-surface visibility is unchanged (`ui-rules.md`'s existing rule: "Read surfaces...
have no role-conditional content whatsoever" continues to apply to Home, Events, Ask
Genie). Only the fourth nav item's label/destination is role-conditional, and — restating
the standing rule this document does not relax anywhere — **this is a UX convenience
only; the backend independently re-verifies role on every write regardless of which nav
path was used to reach it** (`architecture.md` Invariant 4).

### Session/role indicator

Unchanged: `RoleBadge` ("Council access"), shown only in a `council` session's Control
Center header, per `ui-registry.md`. No badge for `student` — absence is the signal,
exactly as documented.

### Session-end behavior

If `POST /api/session/end` (`v2-api-contracts.md` Section 2.3, marked optional there) is
implemented, expose it as a tertiary text action next to the `RoleBadge` in the Control
Center header, labeled **"Switch to student view"** (verb-first, describes the outcome,
not the mechanism — never "Logout," since there are no accounts). Selecting it calls the
endpoint, clears the badge, and returns the nav's fourth item to "Council access." If the
endpoint is not implemented, this control is simply omitted — there is no requirement to
build it; it does not block Definition of Done (Section 28).

### Responsive behavior

Identical to V1: `--nav-height` sticky at every breakpoint, four items always inline (per
`ui-tokens.md`'s Breakpoints table, the four fixed nav items already fit at every
documented breakpoint down to `--bp-sm`; below that, item labels stay as-is — no
truncation or iconification is introduced, since `ui-rules.md` never uses icon-only nav
items).

---

## 4. Entry / Role Selection

**New screen**, shown once per browser session before any surface is reached (i.e., the
first thing a fresh session sees; a session that already resolved a role via `GET
/api/session` — `v2-api-contracts.md` Section 2.2 — skips straight to Home).

### Layout

```
  Welcome to Campus Companion
  One place to ask, discover, and act on what's happening on campus.

  [ Continue as student ]

  ── or ──

  Council / club admin?  [ Enter access code ]
```

- Centered content, single column, within the existing 1120px container — this is the one
  documented exception in `ui-rules.md` where centered content is allowed ("except an
  empty-state block inside an otherwise empty section"); this screen is treated the same
  way, as a full-page equivalent of that block, not a new centering pattern for ordinary
  content elsewhere.
- No hero image, no illustration — one `--text-display` heading, one `--text-body`
  supporting line, per the Page Header conventions already defined.
- **"Continue as student"** is the primary button (`--size-control-lg`), calls
  `POST /api/session` with no `access_code` (per `v2-api-contracts.md` Section 2.1) and
  proceeds to Home.
- **"Enter access code"** is a secondary/tertiary action that reveals an inline
  `FormField` (access code, `--size-control-md`) with a primary "Continue" button — this
  reuses the exact same code-entry pattern `AccessCodeModal` already implements
  (`ui-registry.md`), just presented inline on the entry screen instead of in a modal, so
  no second modal pattern is introduced (`ui-rules.md`'s explicit "no additional modal"
  rule is preserved). `AccessCodeModal` itself is unchanged and still exists for the
  in-context "Council access" nav trigger from Section 3.

### Optional student name/email capture

Per `v2-api-contracts.md` Section 2.1, `POST /api/session` accepts optional
`display_name`/`display_email` for a student session. On the entry screen, this is **not**
a required field — it is offered as a collapsed, clearly-optional pair of `FormField`s
beneath "Continue as student" (e.g. a tertiary disclosure: "Add your name and email to
speed up registration later — optional"). If left blank, "Continue as student" proceeds
with no `display_name`/`display_email` sent at all. This must never be presented as a
login or required step — it is explicitly UX convenience only, per `v2-api-contracts.md`'s
own framing, and the copy must not imply an account is being created.

### States

| State | Behavior |
|---|---|
| Default | As above |
| Access code field expanded, submitting | "Continue" enters its loading state ("Continuing…"), field disabled |
| Incorrect/unrecognized code | Per the existing rule (`ui-rules.md`, Permissions): the endpoint never errors — an incorrect code silently resolves to `role: "student"`. The entry screen states this plainly ("That code wasn't recognized — continuing as a student.") and proceeds to Home as a student, exactly matching `AccessCodeModal`'s existing "no error styling, no lockout, no attempt counter" behavior. |
| Successful council entry | Proceeds directly to Control Center (Overview), not Home — since the user explicitly asked for council access, honoring intent rather than making them navigate again, consistent with `ui-rules.md`'s existing "if it was opened to reach the Admin Panel, the Admin Panel opens in place" rule for `AccessCodeModal`. |
| Successful student entry | Proceeds to Home. |
| Role indicator after entry | Handled by Section 3's nav — no separate confirmation screen. |

### Future direction (explicitly not built here)

Campus SSO is mentioned in `v2-product-plan.md` Section 14 as future production direction
only. **No SSO UI, provider button, or redirect flow is designed in this document.** The
entry screen above is self-contained and must not be built in a way that assumes a future
SSO step will be inserted into this exact flow later.

---

## 5. Student Home

Home evolves from Newsletter Home. Structure:

```
PageHeader ("Home" / one-line supporting text)

Campus Pulse                         (Section 6)

Ask Genie entry point                (a Link, styled per ui-rules.md's existing rule:
                                       "never a floating action button")

Events preview                       (Section, title "Upcoming events", Grid of
                                       EventCard, capped — "Showing N of M" if it exceeds
                                       the cap — with a Link to the full Events surface;
                                       this is the same Grid/EventCard V1 already uses,
                                       just capped and cross-linked rather than being the
                                       full browse surface)

Room availability snapshot           (unchanged from V1 — Section "Room availability",
                                       SegmentedControl room-type filter,
                                       RoomAvailabilityTable `snapshot` variant)
```

**Internships and any other already-implemented governed data not covered by
`v2-product-plan.md`:** the brief for this document asks Home to surface "Internships /
other existing campus content where already implemented." Per the correction already
logged in `v2-api-contracts.md` Section 16, `internships` is real, governed, implemented
data — but **no REST endpoint or UI component for it is defined in `v2-api-contracts.md`
or `ui-registry.md`**, because `v2-product-plan.md` does not scope any internships-facing
surface. This document does not invent one. It is marked here:

> **API dependency — requires addition to `v2-api-contracts.md`.** An "Internships"
> section on Home (or its own surface) needs a defined `GET /api/internships` (and
> likely `GET /api/internships/{id}`) contract before any UI component can be specified
> against it. Until that contract exists, Home does not include an internships section in
> V2, and this gap should be raised as a product-scope question rather than resolved by
> inventing a component with no backing contract.

Everything else on Home already has a defined source: Campus Pulse (`v2-api-contracts.md`
§4), Events preview (`GET /api/events`, §3.1), Room availability (existing `GET
/api/rooms/availability`, unchanged).

**No fabricated data.** If a metric or section has no backing endpoint, it is omitted from
Home entirely, not stubbed with placeholder numbers — consistent with `ui-rules.md`'s
"never fabricate" principle extended to every new surface.

---

## 6. Campus Pulse

**New composite component**, backed by `GET /api/campus/pulse` (`v2-api-contracts.md`
§4.1).

### Purpose

A compact, high-signal "what's true on campus right now" block — not a dashboard. It is
the single most important piece of new visual identity in V2, since it's what makes the
product "feel live" per `v2-product-plan.md` Section 6.5.

### Layout

A row of small metric tiles inside one Section (title "Campus Pulse", no separate
sub-heading per tile beyond its own label), using the **Card (base)** primitive's existing
"primary datum" slot — this is exactly what that slot is for ("where one number matters
... gets its own slot at `--text-h2`"), so **no new primitive component is required**,
only a composition of already-registered Card instances in a row/grid:

```
[ Happening now      ]  [ Coming up          ]  [ Rooms free          ]  [ Registered today ]
[ AI Workshop · Aud.  ]  [ Robotics Meetup    ]  [ 5 of 9              ]  [ 12                ]
[  live pairing       ]  [ 6:00 PM            ]  [                     ]  [                   ]
```

- **"Happening now"** tile — `events_now[0]` (if more than one, show the first with a
  "+N more" tertiary link to Events, Grid, filtered to today); uses the `ongoing`/`live`
  StatusIndicator pairing on the tile, matching `AttendanceDatum`'s existing live
  treatment.
- **"Coming up"** tile — `next_major_event`; uses the `upcoming` pairing.
- **"Rooms free"** tile — `rooms_available_count` of `rooms_total_count`, `--text-h2`
  primary datum, `available`/`unavailable` pairing is not applicable here (it's a count,
  not a binary state) — render as plain `--text-h2` per the existing "numbers that are the
  point of an element" typography rule, with a tertiary link to Events/Room availability.
- **"Registered today"** tile — `registrations_today`, same plain `--text-h2` treatment.
  This must not be confused with any single event's `attendance_count` — the tile label
  makes clear it's a campus-wide, today-scoped figure.

### Information hierarchy

Four tiles, equal visual weight, `--space-6` gaps, in a row that wraps per the existing
Grid column rules (1 → 2 → 4 depending on breakpoint, following the same step logic as the
event Grid rather than inventing a new breakpoint table). No tile is visually dominant
over another — Campus Pulse itself is one "dominant thing" on the page (per Core UI
Principle 2), not four competing things.

### States

| State | Behavior |
|---|---|
| Loading | Four Card skeletons in the same tile layout, per `Skeleton`'s `card` variant |
| Empty (e.g. `events_now: []`, all rooms free) | Each tile renders its own honest zero/empty value ("Nothing right now" for the live tile, "9 of 9" for rooms) — never hidden, since a quiet campus is still real information, not a failure |
| Error (502) | The whole Section shows the `error` state (per `ui-rules.md`'s Empty/Error Section composite pattern) — Campus Pulse fails as one unit, matching `v2-api-contracts.md`'s note that a partial payload is never returned |
| Stale/unavailable | Not separately defined for Campus Pulse in V2 — unlike Newsletter Home's polling freshness stamp, Campus Pulse is fetched fresh on Home load and is not polled continuously in V2 (polling remains scoped to the existing event/room live-update loop, per `ui-rules.md`'s existing 15s polling rule, which is not extended to Campus Pulse in this document — **TBD** if a future revision wants Campus Pulse polling too) |

### Responsive behavior

Tiles stack to 1 column below `--bp-sm`, 2 at `--bp-sm`–`--bp-lg`, matching the existing
Grid breakpoint steps (Section is capped at 4 tiles, so it never needs a 3-column step).

---

## 7. Events Experience

**New dedicated surface**, reached via the "Events" nav item. Default view: **Grid**.
Secondary view: **Calendar**, reached via an explicit toggle.

### Required registry/rules update

`ui-registry.md`'s `SegmentedControl` entry currently states it is used "only" for the
room-type filter — "the sole segmented-control use case in this product." V2 needs a
second, structurally identical use (a closed, ≤4-option, mutually-exclusive choice) for
the Grid/Calendar toggle. Per `ui-registry.md`'s own extension rule ("extend it... in
place rather than creating a parallel component"), **this document specifies extending
`SegmentedControl`'s registry entry to cover this second use, not introducing a new tab or
toggle component.** The "sole use case" language in that entry must be updated to name
both uses in the same change that implements this. This is the same, single component;
its options are `Grid` / `Calendar` instead of the four room types.

### 7.1 Event Grid

Identical to V1's event grid, relocated: `Section` (control row = the SegmentedControl
above) → `Grid` → `EventCard` × N, using the existing card anatomy exactly as
`ui-registry.md` defines it — no new card fields, no denser layout.

**Fields shown (all already defined in `EventCard`'s Data Sources and `v2-api-contracts.md`
§3.1):** event name, club (`ClubReference`), start time, room (or "Room not booked"),
`attendance_count` (via `AttendanceDatum`, live-pairing while `ongoing`), `status`
(`StatusIndicator`, only shown for non-default states like `cancelled`). Registration
action is the card's stretched-link behavior, unchanged.

**Filtering, using the new `GET /api/events` query params (`v2-api-contracts.md` §3.1):**
a control row above the Grid offering:
- **Club filter** — a `select` populated from known clubs (reuses `FormField`'s select
  variant, per the existing "closed sets... populated from API data" rule); maps to
  `club_id`.
- **Search** — a single text input; maps to `q`. This is the one net-new input pattern on
  this page; it is a plain text `FormField`, not a new component.
- **Status** — implicit, not a user-facing control in V2: the Grid defaults to
  `upcoming=true` (excluding cancelled), matching V1's existing default framing. A
  separate "show cancelled/past events" toggle is **not** specified here — flagged as
  **Nice to Have, not required for Definition of Done** — the existing default is
  sufficient for V2's Must Ship scope per `v2-product-plan.md`.

No new card style is introduced; the Grid/EventCard combination is reused verbatim from
`ui-registry.md`, only its data source (query params) changes.

### 7.2 Calendar

**New component: `CalendarView`.** No existing component in `ui-registry.md` covers this;
it must be added there in the same change that implements it, following that file's
"Adding a New Component" process (Purpose, When to use, Variants, states, etc.).

**Scope, deliberately minimal per the brief's own instruction ("prefer a simple, usable
calendar over a feature-heavy calendar library"):**

- **Granularity: Week view only for V2.** A day/month view is explicitly **not** required
  — "day/week/month behavior only if justified," and week is the one granularity that
  matches both "planning" (see more than one day) and mobile feasibility (doesn't need
  the density a month grid requires). Month view is flagged **Nice to Have**, not Must
  Ship.
- **Date navigation:** two tertiary icon-adjacent buttons ("Previous week" / "Next week",
  each a labelled `Button`, not icon-only — per `ui-rules.md`'s icon-only-button
  restriction, which reserves icon-only controls for the Genie send action alone) plus a
  "Today" secondary button that resets to the current campus-local week.
- **Data source:** `GET /api/events` with `from`/`to` set to the visible week's bounds
  (`v2-api-contracts.md` §3.3) — no separate calendar endpoint.
- **Event positioning:** each day is a column; events render as compact blocks positioned
  by `start_ts`/`end_ts` within the day, using the existing half-open-interval convention
  (an event ending at `17:00` does not visually overlap one starting at `17:00`). Blocks
  use the same `StatusIndicator` pairings as the Grid (`upcoming`, `ongoing`/`live`,
  `cancelled`) so status reads identically across both views, per `ui-rules.md`'s "same
  entity... looks and reads identically everywhere" rule.
- **Event click behavior:** selecting a block navigates to Event Detail
  (`GET /api/events/{event_id}`, Section 8) — the same destination the Grid's stretched
  link goes to, for consistency.
- **Current-day indication:** the current campus-local day's column gets a subtle
  `--color-primary-subtle` background tint on its header cell — a "third cue" is not
  strictly needed here since it's not a status pairing subject to the color-alone rule,
  but the column header also carries the literal date/weekday label, so the day is never
  identified by color alone in practice.
- **Cancelled-event behavior:** rendered with the `cancelled` pairing (strikethrough,
  muted), same as the Grid — cancelled events are shown, not hidden, in Calendar (since a
  planning view benefits from seeing what *was* scheduled), unlike the Grid's default
  exclusion. This is a deliberate, documented difference between the two views' default
  filtering, not an inconsistency: Grid defaults to `upcoming=true` (discovery — show
  what's actually happening), Calendar defaults to showing the full week including
  cancellations (planning — show the whole picture for the visible range).
- **Empty dates:** a day column with no events shows quiet empty space, not an `empty`
  state block per day (that treatment is reserved for a whole Section having nothing to
  show, per `ui-rules.md`; an individual empty day in a week view is normal, expected, and
  not itself a state to call out).

### States (Events surface, both views)

| State | Grid | Calendar |
|---|---|---|
| Loading | 3 EventCard skeletons | Skeleton week grid (7 empty columns, header dates visible) |
| Empty | `empty` Section state, "No upcoming events." | Empty week (no per-day empty state, see above) |
| Filtered empty (club/search) | `empty` state naming the filter, "Show all events" action | N/A — Calendar has no club/search filter in V2 (flagged **Nice to Have**, not required) |
| Error | `error` Section state, "Try again" | Same |

### Responsive/mobile behavior

**Required addition to `ui-rules.md`'s Responsive Rules table:** below `--bp-md`, the
7-column week grid does not fit legibly (mirroring the exact reasoning `ui-rules.md`
already applies to Admin Panel tables — "dense tabular data does not work well at phone
widths and should not be force-fit"). `CalendarView` collapses below `--bp-md` into a
**vertical agenda list**: one label/value block per day (day label as a `--text-h3`
sub-heading, that day's events listed beneath it using the same compact block styling),
reusing the existing `List`/stacked-block pattern rather than inventing a mobile-only
calendar widget. This is the same collapse strategy `RoomAvailabilityTable` already uses
for its own responsive rule, applied to a second component for consistency.

---

## 8. Event Details

**New page, new route** (e.g. `/events/:event_id`), backed by `GET /api/events/{event_id}`
(`v2-api-contracts.md` §3.2).

### Composition

```
PageHeader-equivalent (event name as h1, StatusIndicator if non-default state)

DefinitionList: club · date · time · room

Body: description (if present)

Primary datum: AttendanceDatum (attendance_count, live pairing if ongoing)

Actions: Register (student) / management actions (council, see below)
```

This reuses `DefinitionList`, `AttendanceDatum`, `StatusIndicator`, and `Button` — all
already registered — composed into a new page-level arrangement. No new primitive is
required; this may be registered as a lightweight composite pattern ("Event Detail View")
in `ui-registry.md`'s Composite Patterns section, analogous to how "Newsletter Event
Listing" is already documented there.

### Entry points

- Event Grid card's stretched link (Section 7.1).
- Calendar block click (Section 7.2).
- Genie → Action's "View Event" control (Section 10).
- Campus Pulse's "Happening now"/"Coming up" tiles (Section 6), if a specific event is
  shown there.

### Navigation

Standard route; browser back returns to whichever entry point was used (Grid, Calendar,
Genie, or Campus Pulse) — no breadcrumb is introduced, per `ui-rules.md`'s explicit "no
breadcrumbs" rule, which this document does not relax.

### Primary CTA

- **Student, event `scheduled` and not cancelled:** **"Register"** — a `Link` (not a
  `Button`, since it navigates externally, per `ui-rules.md`'s "a link navigates; a button
  acts" rule) to the existing shared Google Form, parameterized with the event's identity,
  exactly matching the existing registration convention (see the note on registration URLs
  in `v2-api-contracts.md` §3.2).
- **Student, event `cancelled`:** no primary CTA; the `cancelled` `StatusIndicator`
  appears instead, and no registration link is shown, matching `EventCard`'s existing
  "not a link" treatment for cancelled events.

### Secondary actions (council only)

- **"Cancel event"** — invokes `PATCH /api/events/{event_id}` (`v2-api-contracts.md` §8.2,
  cancel-only scope). Rendered as a tertiary/destructive-leaning action, using the
  existing two-step inline confirm pattern from `ui-rules.md`'s Forms section ("button
  becomes 'Confirm cancel'... reverting on blur") — **not** a second modal, since the
  product's only modal remains the access-code dialog.
- **"Book room for this event" / "Change room"** — deep-links into Control Center → Rooms
  (Section 15) with the event pre-selected, rather than duplicating the booking form on
  this page. This avoids a second implementation of the Governed Write Form pattern.
- Full field editing (rename, reschedule) is **not** available here — per
  `v2-api-contracts.md` §8.2's own note, that requires a `data-contracts.md` amendment not
  yet made, and is out of scope for this page until that decision exists.

### States

| State | Behavior |
|---|---|
| Loading | Skeleton matching the page's final shape (title bar, definition list rows, action row) |
| Not found (404) | `error`/`empty`-adjacent full-page state: "This event doesn't exist." with a link back to Events — not a blank page |
| Cancelled | Renders normally, with the `cancelled` pairing replacing the primary CTA, per above |
| Error (502) | `error` state, "Try again" |

---

## 9. Ask Genie Experience

**Unchanged core**, exactly as `ui-rules.md`'s Genie / Conversational Interface section
and `ui-registry.md`'s Genie UI Registry already define: one bounded chat container,
`GenieMessage` turns in the three existing states (`ok`/`no_answer`/`error`), evidence
disclosure on every `ok` answer, the exact `POST /api/genie/ask` contract (unchanged in
`v2-api-contracts.md` §7.1).

```
User → Frontend → Backend → Genie → Backend → Frontend
```

No component in this section is redesigned. V2's only change to Ask Genie is additive —
Section 10 below.

---

## 10. Genie → Action UI

Genie remains strictly read-only; the UI never implies otherwise. This section defines how
an `ok` answer's already-returned `rows` can render actions, per the mechanism
`v2-api-contracts.md` §7.2 defines at the API layer — this section covers only the
*presentation*.

### Required rules update

`ui-rules.md`'s Genie section currently says: "When an answer implies an action... the
frontend may render **one link** beneath the answer to the relevant surface." V2 needs
more than one action in some cases (e.g. multiple free rooms, each independently
bookable). **This document specifies extending that rule from "one link" to "a group of
action controls, one per relevant row, using `Button`s (not links) for actions that
initiate a flow (Book Room) and `Link`s for actions that only navigate (View Event,
Register)"** — the underlying "link navigates, button acts" distinction is preserved
exactly; only the "at most one" cardinality limit is relaxed, and only for this specific,
row-driven case.

### Rendering pattern

Beneath a rendered `assistant-ok` `GenieMessage` (below the answer text, before or after
the collapsed evidence disclosure — evidence stays where it already is, per
`ui-registry.md`), when the frontend recognizes an actionable row shape
(`v2-api-contracts.md` §7.2's heuristic), render one compact action row per recognized
record:

**Event query result:**
```
AI Workshop
3:00 PM · Auditorium

[ View Event ]   [ Register ]
```
- **View Event** — tertiary `Link` to Event Detail (Section 8).
- **Register** — tertiary `Link` to the external registration form, same convention as
  Event Detail's primary CTA. Shown to every session (registration isn't role-gated).

**Room query result:**
```
Lab 204
Available now

[ View availability ]
```
plus, **only for a `council` session:**
```
[ Book room ]
```
- **View availability** — tertiary `Link` to Events → Room availability (or Control
  Center → Rooms for a council session), a plain navigation.
- **Book room** — secondary `Button` (not primary — it's a shortcut into an existing flow,
  not the page's dominant action). Selecting it navigates to Control Center → Rooms
  (Section 15) with the room and the queried time window **pre-filled** into the existing
  booking form. It does **not** submit `POST /api/bookings` directly from the Genie panel,
  per `v2-api-contracts.md` §7.2's explicit safety boundary (booking requires an
  `event_id` the Genie answer doesn't have). The council user still selects an event and
  explicitly submits.

### Authorization-dependent actions

Only **Book room** is role-conditional; it is simply absent (not disabled) for a `student`
session, matching the existing rule that write controls are never rendered
disabled-as-permission. **View Event**, **Register**, and **View availability** are shown
to every session.

### Success / conflict / failure states

Since **Book room** only pre-fills the existing booking form rather than submitting
directly from the Genie panel, its outcome states are exactly the ones already defined for
Control Center → Rooms (Section 15): the existing success banner, the existing `409`
conflict banner, the existing `502` error banner. **No new success/conflict/failure state
is introduced specifically for Genie → Action** — this is intentional: it reuses proven UI
rather than duplicating it, and it means a booking made via this path is visually
indistinguishable in outcome from one made directly in Control Center, which is the
correct behavior since it's the same write.

### Confirmation

No additional confirmation step beyond what the destination flow already requires (the
booking form's own submit). Navigating from Genie to the pre-filled form is not itself a
committing action and needs no confirmation.

### What the UI must never do

- Never render an action control that fires a write directly from the Genie message
  itself.
- Never label an action in a way that implies Genie performed it ("Genie booked your
  room" is never valid copy — the copy is always in terms of the resulting state, e.g. "
  Booked Lab 204," attributed to the form submission, not the question).
- Never render an action for an unrecognized row shape — absence of an action is the safe
  default, per `v2-api-contracts.md` §7.2's documented limitation.

---

## 11. Room Discovery

Room availability keeps its existing tabular treatment everywhere — `ui-rules.md`'s
"rooms are deliberately tabular everywhere" rule is not revisited. V2 does not introduce a
card-based room browser.

- **Fields:** room name, type, capacity (if present), availability at the queried instant
  — all already in `RoomAvailabilityTable`'s data expectations, per `ui-registry.md`.
  Booking information (which event currently holds a room) is **not** shown in the
  student-facing table — that remains council-only context, surfaced instead in Control
  Center → Rooms (Section 15) and the Activity feed (Section 17), not by adding a column
  to the shared table.
- **Student experience:** identical to V1 — informational only, `snapshot` variant on Home
  and the Events surface, `available`/`unavailable` `StatusIndicator`, no booking action
  visible.
- **Council experience:** the same table, `check` variant, embedded in Control Center →
  Rooms (Section 15) as the pre-booking check, exactly as `ui-registry.md`'s "Room
  Availability Snapshot" composite pattern already documents for the Admin Panel. Booking
  actions are obvious there: the table sits directly above the booking form, and the
  Genie → Action "Book room" shortcut lands on this same view.

No new room-specific component is introduced.

---

## 12. Council Control Center

Evolves the Admin Panel into five areas: **Overview, Events, Rooms, Analytics, Activity.**

### Required registry/rules update

`ui-rules.md`'s Visual Consistency Rule 5 explicitly excludes "tabs" as a pattern, and its
Navigation Rules section explicitly excludes "sub-navigation" and "nested routes." Five
areas cannot reasonably live on one flat, unsectioned page, so this needs a resolution
that doesn't silently reintroduce a forbidden pattern under a different name.

**Resolution specified here:** Control Center uses the **same extended `SegmentedControl`
component** already introduced in Section 7 for the Grid/Calendar toggle — a third use of
one already-registered, closed, mutually-exclusive-option control, not a new "tabs"
component. This keeps the *pattern count* at one (`SegmentedControl`, now used three
times: room type, Grid/Calendar, Control Center area) rather than introducing a second,
competing "tab" primitive, which is what Rule 5 is actually protecting against
(`ui-rules.md`'s own stated concern is "no one-off interaction patterns," not "no more
than one view per page"). `ui-registry.md`'s `SegmentedControl` entry must be updated a
second time (see Section 7) to note this third use and to raise its documented option cap
from "four or fewer" if five options are needed — **flagged: this may require raising
`SegmentedControl`'s stated 4-option limit to 5, which is a small, explicit change to that
component's registry entry, not a redesign.**

**On routing:** each area may be its own address (e.g. `/control-center/events`) purely so
it's linkable/shareable and browser-back behaves predictably — this is not the
drill-down, breadcrumb-style "nested routes" `ui-rules.md` is rejecting (there is no
parent-child hierarchy among the five areas; they're flat siblings, like the product's
existing three pages always were). No breadcrumb trail is rendered; the `SegmentedControl`
itself is the only navigational indicator of which area is active, consistent with how
the existing room-type filter needs no breadcrumb either.

### Structure

```
Control Center
[ RoleBadge: Council access ]                    [ Switch to student view ]

[ Overview | Events | Rooms | Analytics | Activity ]   ← extended SegmentedControl

<selected area's content>
```

---

## 13. Council Overview

```
Section: Upcoming events        — small list/count, links to Events
Section: Registrations/attendance — metric tiles (reuses Campus Pulse's Card-tile pattern)
Section: Room utilization        — one metric tile ("rooms booked now / total")
Section: Club activity           — small ranked list (top 3 clubs by event count)
Section: Recent activity         — top 3–5 Activity feed items, "View all" link to the
                                    Activity area
```

Backed by `GET /api/analytics/overview` (`v2-api-contracts.md` §5.1) and `GET
/api/activity` (§6.1, capped preview). This answers exactly the question the brief poses
— "what is happening across campus operations right now" — using the same Card-tile
pattern established in Campus Pulse (Section 6), so the two "at a glance" surfaces (one
student-facing, one council-facing) look and behave identically, differing only in which
metrics they show. **No new component is introduced for Overview.**

States: loading (tile skeletons, per Campus Pulse), empty (each metric shows its honest
zero, e.g. "0 upcoming events" is valid), error (`error` Section state per metric group,
each independent — one failing group never blanks the others, per `ui-rules.md`'s existing
"one failing section never blanks the page" rule extended here).

---

## 14. Council Events

```
Section: Create event    → existing Governed Write Form pattern, unchanged
Section: Manage events    → Grid of EventCard (reused), each card additionally offering
                             the council-only "Cancel event" action inline (or via
                             navigating into Event Detail, Section 8, for the full action
                             set)
```

- **Create event:** identical to V1's existing form — no change.
- **Manage events / view:** reuses the same `GET /api/events` + `Grid`/`EventCard`
  combination Events (Section 7.1) already uses, filtered to no default `upcoming`
  restriction so council can see cancelled/past events too if they navigate there (via the
  existing `status` query param, `v2-api-contracts.md` §3.1) — **flagged as Nice to
  Have**, not required for V2 Must Ship; the Must Ship baseline is simply linking to the
  existing Events surface from here rather than duplicating a second events browser.
- **Edit events:** limited to the cancel transition, per Section 8's Event Detail page —
  Council Events does not duplicate that action; it links into Event Detail for it,
  keeping "Cancel event" implemented in exactly one place.

### Validation / success / failure states

Unchanged from the existing Governed Write Form pattern (`ui-registry.md`): client-side
checks only for what's obviously fixable, server-side validation authoritative, success
banner + re-fetch, 403 reopens the access-code flow, 502 shows a retry banner. No new
validation state is introduced for V2.

---

## 15. Council Rooms

```
Section: Room availability check   → RoomAvailabilityTable (`check` variant), driven by
                                      a date/time input the council user sets (or, when
                                      arriving from Genie → Action, pre-filled)
Section: Book a room                → existing Governed Write Form pattern, unchanged,
                                      pre-filled with room_id/start_ts/end_ts if arriving
                                      from Genie → Action (Section 10) or from an Event
                                      Detail "Book room for this event" link (Section 8)
```

Flow, restated as the brief's numbered steps:

1. **Find a room** — via the availability table's type filter, or arriving pre-scoped from
   Genie → Action or Event Detail.
2. **Check availability** — the table itself, `check` variant, informing but never gating
   (server is authoritative at submit).
3. **Select a time** — the form's existing date/time inputs.
4. **Book it** — existing primary submit button, "Book room" → loading "Booking room…".
5. **Receive confirmation** — existing success `Banner`, `BookingSummary` DefinitionList,
   re-fetched availability table so the banner and table agree, per the existing rule.
6. **See a conflict** — existing `409` `conflict` `Banner`, `BookingSummary` showing the
   *conflicting* booking's details, "Choose another time or room," input preserved.

No UI-side conflict prediction is introduced beyond the existing pre-check table; the
backend remains the sole source of truth for conflicts, exactly as `ui-registry.md`
already states.

---

## 16. Council Analytics

Backed by `GET /api/analytics/events`, `/rooms`, `/clubs` (`v2-api-contracts.md` §5.2–5.4).
Two sub-groups, matching the API's own grouping:

### Event analytics

| Visualization | Question answered | Data required | Presentation | Empty state |
|---|---|---|---|---|
| Popular events | "Which events are drawing the most people?" | `popular_events` | Ranked `Table` (rank implicit in row order, not a numbered marker column — `ui-rules.md` forbids numbered markers) | `empty` state, "No events with attendance yet" |
| Low/zero-attendance events | "Which events need attention?" | `low_attendance_events`, `zero_attendance_events` | Same `Table`, second instance | Same pairing |
| Club activity | "Which clubs are most active?" | `club_activity` | `Table`: club, event count, total registrations | `empty` state |

### Room analytics

| Visualization | Question answered | Data required | Presentation | Empty state |
|---|---|---|---|---|
| Room utilization | "Which rooms get used the most?" | `room_utilization` | `Table`: room, confirmed bookings, total booked hours | `empty` state |
| Peak booking periods | "When do most bookings happen?" | `peak_booking_periods` | `Table`: hour of day, booking count (or a simple horizontal bar rendered from `--space-*` widths if a lightweight visual is wanted — see below) | `empty` state |

### On charts

**No chart/graph component currently exists in `ui-registry.md`.** Per the brief's own
instruction ("do not add decorative charts merely because charts look impressive"), this
document's default recommendation is: **present every Analytics metric as a ranked
`Table`**, reusing the existing dense-data primitive, rather than introducing a new chart
component under V2's time constraints. If a simple visual is wanted for peak booking
periods specifically (the one metric where a shape genuinely helps more than a ranked
list), the lightest option consistent with the existing token system is a row of bars
built from `--space-*`-scaled `div`s in `--color-primary-subtle`, not a charting library —
this is explicitly **optional, Nice to Have**, and if built, it must be added to
`ui-registry.md` as a new, minimal primitive first, per that file's own process. **Flagged
as TBD:** whether this lightweight bar treatment is worth the implementation time is a
call for the Frontend agent at build time, not decided here.

### Authorization and states

All Analytics tables are council-only (403 for student, enforced server-side per
`v2-api-contracts.md` §5). Loading: table-row skeletons. Empty: the existing `empty`
`Table` state (header row visible, one full-width empty row). Error: `error` Section
state per table group, independent per group.

---

## 17. Activity Feed

Backed by `GET /api/activity` (`v2-api-contracts.md` §6.1).

```
Robotics Club booked Lab 204          2 hours ago
AI Club created "AI Workshop"         1 day ago
```

- Reuses `List` (plain, homogeneous, no metadata beyond the timestamp) — no new component.
- Each row: one sentence (club/event/room name interpolated from the row's own fields),
  right-aligned relative timestamp in `--text-caption`.
- Capped at the API's `limit` (default 20); no pagination, matching `List`'s existing
  10-item-cap-with-count convention extended to this feed's own documented limit.

**Explicitly deferred, not built:** per `v2-api-contracts.md` §6.1's own flags, this feed
does **not** include cancellation events or per-user attribution — the backend cannot
reliably provide either without a schema change. The feed's copy is written to only ever
claim what's true: "X created," "X booked" — never "X cancelled" (that information isn't
available) and never "by [name]" (no per-user identity exists). If the underlying data
later supports it, this section updates; until then it is not simulated.

### States

Loading: row skeletons. Empty: `empty` state, "No recent activity." Error: `error` state,
"Try again."

---

## 18. Role-Based UI Behavior

| Feature | Student | Council |
|---|---|---|
| Home | View | View |
| Campus Pulse | View | View |
| Events (Grid/Calendar) | View | View |
| Event Detail | View, Register | View, Register, Cancel event, Book room (link-through) |
| Ask Genie | Ask | Ask |
| Genie → View Event / Register | Yes | Yes |
| Genie → Book room | No | Yes |
| Room availability | View | View |
| Book room | No | Yes |
| Create event | No | Yes |
| Cancel event | No | Yes |
| Edit event (full fields) | No | **Not available to anyone in V2** — see §8, §9.2 of `v2-api-contracts.md` |
| Control Center (all areas) | No — nav item opens the entry flow instead | Yes |
| Analytics | No | Yes |
| Activity | No | Yes |

**Standing rule, restated once more because it is the single highest-risk shortcut:** this
table governs what the frontend *shows*. It is not, and must never be treated as, the
enforcement mechanism. Every write endpoint independently re-verifies role server-side
regardless of what this table says the UI displays, per `architecture.md` Invariant 4 and
`ui-rules.md`'s "UI role handling is a usability affordance only" rule — unchanged, and not
weakened by any V2 addition in this document.

---

## 19. Component Reuse

Checked against `ui-registry.md` before specifying anything below.

| Need | Resolution |
|---|---|
| Grid/Calendar toggle | **Reuse** `SegmentedControl`, extended (Section 7) |
| Control Center area switcher | **Reuse** `SegmentedControl`, extended a second time (Section 12) |
| Campus Pulse | **Composition** of existing `Card` (base) instances in a row — no new primitive |
| Council Overview metric tiles | **Same composition as Campus Pulse** — no new primitive |
| Event grid | **Unchanged** `Grid` + `EventCard` |
| Event Detail | **New composite pattern** (page-level arrangement of `DefinitionList`, `AttendanceDatum`, `StatusIndicator`, `Button`/`Link`) — registered as a Composite Pattern, not a new primitive |
| Calendar | **New primitive: `CalendarView`** — genuinely new, no existing pattern covers it; must be added to `ui-registry.md`'s Component Registry |
| Genie → Action controls | **Reuse** `Button`/`Link` inside the existing `GenieMessage` — no new "ActionCard" component is introduced; the brief's suggested `ActionCard` is deliberately not built, since `Button`/`Link` already cover it |
| Analytics tables | **Reuse** `Table` (arbitrary-shape-adjacent — see note below) |
| Activity feed | **Reuse** `List` |

**Note on Analytics tables:** `ui-registry.md`'s `Table` currently defines two variants,
`known-shape` (room availability) and `arbitrary-shape` (Genie results). Analytics tables
are known-shape (fixed columns per endpoint) but not room availability — this is a third
concrete *use* of the existing `known-shape` variant, not a new variant. No registry change
is needed here, unlike `SegmentedControl`'s case, because `Table`'s `known-shape` variant
was never scoped to "only room availability" the way `SegmentedControl` was scoped to
"only room type."

**Deliberately not created:** `AnalyticsMetric` as a standalone component (Card already
covers it), `ActionCard` (Button/Link already cover it) — consistent with the brief's own
instruction not to automatically create every suggested component name if existing ones
already handle the use case.

---

## 20. Loading, Empty, Error, and Permission States — Summary by Screen

| Screen | Loading | Empty | Error | Unauthorized | Conflict |
|---|---|---|---|---|---|
| Entry | Button loading state on submit | N/A | N/A (session endpoint never errors) | N/A | N/A |
| Home | Section skeletons (Pulse tiles, event cards, room table rows) | Per-section `empty` (e.g. "No upcoming events") | Per-section `error`, independent | N/A | N/A |
| Campus Pulse | Card-tile skeletons | Honest zero values, never hidden | Whole-section `error` | N/A | N/A |
| Events — Grid | 3 EventCard skeletons | `empty`, filter-aware | `error`, "Try again" | N/A | N/A |
| Events — Calendar | Skeleton week grid | Quiet empty days (not a state) | `error`, "Try again" | N/A | N/A |
| Event Detail | Page skeleton | N/A (404 instead) | `error` | N/A | N/A |
| Ask Genie | "Checking campus data…" placeholder | N/A (`no_answer` instead) | `error`, "Try again" | N/A | N/A |
| Genie → Action | N/A (actions appear once the answer renders) | No action rendered if shape unrecognized (silent, not an error) | Destination flow's own error state | Action absent, not disabled, for unauthorized role | Destination flow's own conflict state |
| Room availability | Row skeletons | `empty`, "No rooms free at [time]." styled as a correct answer | `error` | N/A | N/A |
| Control Center (any area) | Area-appropriate skeleton | Per-metric honest zero/`empty` | Per-group `error`, independent | **Entire Control Center unreachable** — nav opens entry flow instead | N/A |
| Council Events (create) | Button loading | N/A | Form-level `error` banner, 502 | 403 reopens access-code flow | N/A |
| Council Rooms (book) | Button loading | N/A | Form-level `error` banner, 502 | 403 reopens access-code flow | `409` `conflict` banner |
| Analytics | Table-row skeletons per group | `empty` table state per group | `error` per group | 403 (page-level, not reached by student nav) | N/A |
| Activity | Row skeletons | `empty`, "No recent activity." | `error`, "Try again" | 403 (page-level) | N/A |

**Never displayed anywhere in V2:** fabricated data standing in for a failed request, an
empty state used to mask a backend error, or a disabled control used to signal missing
permission — all restated, unchanged, from `ui-rules.md`'s existing non-negotiables.

---

## 21. Responsive Behavior

All new V2 surfaces are checked at `--bp-sm`, `--bp-md`, `--bp-lg`, `--bp-xl`, per
`ui-rules.md`'s existing requirement, extended to cover the new surfaces this document
adds:

| Surface | Behavior |
|---|---|
| Nav (4 items) | Inline at every breakpoint, unchanged strategy |
| Entry screen | Single column at every breakpoint, no layout change needed |
| Campus Pulse | 1 → 2 → 4 tile columns, per Section 6 |
| Events — Grid | Existing 1 → 2 → 3 column rule, unchanged |
| Events — Calendar | Full week grid at `--bp-md`+; **collapses to a vertical agenda list below `--bp-md`** (new rule, Section 7.2) — this is the one genuinely new responsive rule V2 introduces and it must be added to `ui-rules.md`'s Responsive Rules table in the same change |
| Event Detail | Single column at every breakpoint (it's a detail page, not a grid) |
| Genie results / actions | Unchanged — action buttons wrap naturally beneath the answer, same container width rules as the existing evidence disclosure |
| Control Center | `SegmentedControl` area switcher wraps/stays inline per its existing behavior (four-or-fewer-options rule now extended to five, per Section 12); each area's content follows its own existing responsive rule (forms stay single-column, tables stack below `--bp-md`) |
| Analytics tables | Same `known-shape` stacking rule as Room Availability — label/value blocks below `--bp-md` |
| Booking forms | Unchanged — single column at every breakpoint |

No separate mobile architecture, no conditional component swap beyond the two documented
collapse rules (Calendar → agenda list, tables → stacked blocks) that already exist as a
pattern in the codebase.

---

## 22. Accessibility

Baseline, unchanged and extended to every new surface:

- Every new interactive control is a real `button`/`a`/native form element — no `div` with
  a click handler, including Calendar's day-block click targets and Analytics' table rows.
- Visible focus ring (`2px solid var(--color-focus-ring)`, `2px` offset) on every new
  control, including `CalendarView`'s date-navigation buttons and the extended
  `SegmentedControl` uses.
- Every form input (entry screen's optional name/email fields, search filter, date/time
  inputs) has a programmatically associated visible label.
- Error/empty/permission messaging is meaningful, never a raw code or stack trace,
  extended to every new endpoint's failure mode per Section 20's table.
- Contrast: all new text uses existing token pairings only (Section 25) — no new color is
  introduced that would need separate contrast verification.
- No icon-only controls without an accessible label anywhere in V2 — this specifically
  rules out an icon-only calendar prev/next control; both must carry visible or
  `aria-label`led text per Section 7.2.
- **Calendar-specific:** the visible week range (e.g. "Sep 1 – Sep 7") is announced via
  the existing polite live region when navigation changes it, so a screen-reader user
  isn't left inferring the new range from day labels alone; arrow-key navigation between
  day columns is supported where practical, but is not a hard blocker for Definition of
  Done given the 12-hour-adjacent build context this product was built under — **flagged
  as a should-have, not a must-have**, consistent with `ui-rules.md`'s own practicality
  principle ("anything that increases implementation cost without increasing clarity...
  does not belong here" applied to full ARIA grid semantics for a V2 hackathon build).
- Genie → Action's rendered buttons/links are reachable in the same DOM/tab order as the
  rest of the message, immediately after the evidence disclosure control.

---

## 23. Navigation Map

```
Entry
 │
 ├── Student
 │    ├── Home
 │    │    ├── Campus Pulse (in-page section)
 │    │    ├── Events preview → Events (Grid)
 │    │    ├── Room availability snapshot (in-page section)
 │    │    └── Ask Genie entry link → Ask Genie
 │    ├── Events
 │    │    ├── Grid (default view, same route)
 │    │    ├── Calendar (same route, view toggled via SegmentedControl)
 │    │    └── → Event Detail (new route, per selected event)
 │    ├── Event Detail (/events/:id)
 │    └── Ask Genie
 │         └── Genie → Action → Event Detail (View Event) / external form (Register)
 │
 └── Council
      ├── Home (same as Student)
      ├── Events (same as Student, plus Cancel action reachable via Event Detail)
      ├── Event Detail (adds Cancel event, Book room link-through)
      ├── Ask Genie
      │    └── Genie → Action → Control Center → Rooms (Book room, pre-filled)
      └── Control Center
           ├── Overview      (SegmentedControl area, same route)
           ├── Events        (create + manage)
           ├── Rooms         (availability + booking)
           ├── Analytics     (event/room/club metrics)
           └── Activity      (feed)
```

**Routes:** Home, Events, Event Detail, Ask Genie, Control Center (one route with an area
query param or five flat sibling routes — implementation detail, not fixed here).
**Views (not separate routes):** Grid vs. Calendar within Events, room-type filter state
within Room availability. **Overlays:** `AccessCodeModal` remains the product's only
modal, still reachable from the nav's fourth item for a `student` session. **No
breadcrumbs, no nested/drill-down routes, no second modal** — all explicitly preserved.

---

## 24. API Dependency Mapping

```
Home
 ├── Campus Pulse API           (GET /api/campus/pulse — v2-api-contracts.md §4.1)
 ├── Events API                 (GET /api/events — §3.1)
 └── Room Availability API      (GET /api/rooms/availability — existing, §1)

Events — Grid
 └── Events API                 (§3.1, with club_id/status/q params)

Events — Calendar
 └── Events API                 (§3.1, with from/to params — no separate calendar endpoint)

Event Detail
 └── Event Detail API           (GET /api/events/{event_id} — §3.2)

Ask Genie
 └── Genie API                  (POST /api/genie/ask — §7.1, unchanged)

Genie → Action
 ├── Genie API                  (§7.1)
 ├── Event Detail API           (View Event)
 ├── existing Booking form + POST /api/bookings (Book room, pre-fill only — §8.3)
 └── existing external registration link (Register)

Council Control Center — Overview
 ├── Analytics Overview API     (GET /api/analytics/overview — §5.1)
 └── Activity API               (GET /api/activity — §6.1, capped preview)

Council Control Center — Events
 ├── Events API                 (§3.1)
 ├── Event Detail API           (§3.2, for Cancel)
 ├── POST /api/events           (existing, §8.1)
 └── PATCH /api/events/{id}     (§8.2, cancel only)

Council Control Center — Rooms
 ├── Room Availability API      (existing, §1)
 └── POST /api/bookings         (existing, §8.3)

Council Control Center — Analytics
 ├── Analytics Events API       (§5.2)
 ├── Analytics Rooms API        (§5.3)
 └── Analytics Clubs API        (§5.4)

Council Control Center — Activity
 └── Activity API               (§6.1)

Entry / role selection
 ├── POST /api/session          (§2.1)
 ├── GET /api/session           (§2.2)
 └── POST /api/session/end      (§2.3, optional)
```

**No endpoint above is invented beyond what `v2-api-contracts.md` defines.** The one
flagged exception — an Internships surface on Home — is explicitly marked **API
dependency — requires addition to `v2-api-contracts.md`** in Section 5 and is not built
until that contract exists.

---

## 25. Design Consistency Rules

Explicitly preserved, unchanged, from `ui-tokens.md`/`ui-rules.md`, across every V2
surface in this document:

- Color palette — every new surface uses only named tokens from `ui-tokens.md`'s Color
  System; no new hex value is introduced anywhere in this document.
- Typography — `--text-display`/`--text-h1`/`--text-h2`/`--text-h3`/`--text-body`/
  `--text-label`/`--text-caption`/`--text-mono`, used per the same size-role mapping
  `ui-rules.md` already defines (the DOM-tag-vs-token-name distinction applies to new
  headings too, e.g. Event Detail's event name is an `h1` at `--text-display`, matching
  the existing "page title" rule since Event Detail is its own page).
- Spacing — `--space-1` through `--space-12` only; no hand-picked value, including inside
  `CalendarView` and Campus Pulse's tile grid.
- Component styles, button hierarchy, form conventions, table conventions, card
  conventions — all reused verbatim per Sections 7–19 above.
- Page container width — 1120px, unchanged, including Control Center and Analytics.
- Icon library — `lucide-react` only, 1.5px stroke, sized from the existing `--icon-*`
  scale; Calendar's navigation icons (if any accompany the labelled buttons) follow the
  same rule.
- Responsive breakpoints — `--bp-sm`/`md`/`lg`/`xl`, unchanged; the two new collapse rules
  (Section 21) use these same tokens, no new breakpoint is defined.

Explicitly not introduced anywhere in this document: gradients, glassmorphism, hero
sections, unnecessary animation beyond the existing motion tokens, excessive shadow, dark
mode, decorative illustration, arbitrary new colors, or a second competing card style.

---

## 26. Hackathon Polish

Details that raise the final-round impression without new technical risk, all achievable
using components/behavior already defined above or in the existing token set:

- **Fast perceived loading:** every new surface's skeleton matches its final layout shape
  exactly (Sections 6, 7, 8, 16, 17) — no generic spinner-only states anywhere new.
- **The existing live-update flash** (`--duration-base`, `--color-accent-subtle` →
  transparent) is reused, not reinvented, for Campus Pulse's "Registered today" tile and
  Council Overview's registration metric, the moment their values change — consistent
  with `ui-tokens.md`'s explicit "one and only live-update pattern" rule.
- **Clear live-state indicators:** the `ongoing`/`live` pairing is used consistently across
  EventCard, Calendar blocks, and Campus Pulse's "Happening now" tile — the same visual
  language for "this is live right now" everywhere it appears.
- **Obvious action hierarchy:** primary vs. secondary vs. tertiary buttons are used exactly
  per `ui-rules.md`'s existing table in every new form and action row (e.g. "Book room"
  from Genie → Action is secondary, never competing with the destination page's own
  primary submit).
- **Consistent spacing/responsive layout:** every new surface passes the same
  `--bp-sm/md/lg/xl` check as existing surfaces (Section 21).
- **Clean event cards:** unchanged — V2 deliberately does not densify `EventCard`.
- **Clear Genie answers:** unchanged core, with the added action row read as a natural
  extension rather than a bolt-on (same message bubble styling, same spacing scale).
- **Strong confirmation states:** the existing success `Banner` + re-fetch pattern is
  reused for every new write path (Cancel event, Book room via Genie pre-fill).
- **Professional analytics:** ranked tables, not decorative charts, per Section 16 —
  clarity over spectacle, matching the product's own stated "utility over polish" design
  direction.
- **Role-aware navigation:** the fourth nav item's relabeling (Section 3) is a small,
  low-risk detail that makes the product feel considered rather than bolted-together.

Nothing in this section trades reliability for visual effect — every item above reuses an
already-specified, already-token-backed pattern.

---

## 27. Implementation Boundaries

This document defines **UI/UX behavior and structure** only. It does not define, and
defers entirely to the named files:

- Database schemas, SQL implementation — `data-contracts.md`, backend `db.py`.
- Genie instructions/synonyms/trusted functions — `genie.md`, Data Platform's
  `data-platform/genie/`.
- Backend implementation details, request/response validation internals — `code-
  standards.md`, `backend/app/`.
- Authentication infrastructure beyond the existing cookie mechanism this document
  consumes as-is — `architecture.md`'s Authentication and Authorization section.
- Deployment infrastructure — `architecture.md`'s Deployment / Runtime Architecture,
  `deploy/`.
- Detailed API request/response schemas — `v2-api-contracts.md`, which this document
  references by section number throughout rather than restating.

---

## 28. Definition of Done (UI)

- A user reaches the product through the entry screen and lands on the correct surface
  for their choice (student → Home; council → Control Center Overview).
- A student sees Home with Campus Pulse, an events preview, and the room availability
  snapshot populated from real (not mocked) data.
- A student can browse events in Grid view (default) and switch to Calendar (week) view
  via the SegmentedControl toggle.
- A student can open Event Detail from the Grid, Calendar, or a Genie answer.
- A student can register for an event where supported, via the existing external form
  link.
- A student can ask Genie questions and see the existing three-state (`ok`/`no_answer`/
  `error`) presentation, unchanged.
- At least one event-shaped and one room-shaped Genie answer render their respective
  recognized actions (View Event/Register; View availability/Book room for council).
- Council can enter the Control Center via the entry screen or the nav's fourth item.
- Council can create an event and cancel an existing event, both reflected immediately
  on the student-facing Events surface (one source of truth, unchanged).
- Council can check room availability and complete a booking; a booking conflict renders
  the existing `409` banner clearly, not a generic error.
- Council can view Analytics (event, room, club) as ranked tables with correct,
  non-fabricated values, including honest zero/empty states.
- Council can view a lightweight Activity feed reflecting only what the data can support
  (creations and bookings; no cancellation timestamps or user attribution, per the
  documented limitation).
- Every screen added or modified in this document has a distinct, correctly-worded
  loading, empty, error, and (where relevant) unauthorized/conflict state — none
  fabricated, none collapsed into another.
- All new surfaces are usable at `--bp-sm`, `--bp-md`, `--bp-lg`, and `--bp-xl`, including
  Calendar's agenda-list collapse below `--bp-md`.
- No new color, font, spacing value, icon library, or component style was introduced
  outside `ui-tokens.md`/`ui-registry.md`, except the two explicitly documented registry
  extensions (`SegmentedControl`'s scope, `CalendarView`'s addition) and the one new
  Composite Pattern (Event Detail) — each called out, not silent.
- The Internships gap (Section 5) remains explicitly flagged as an unresolved API
  dependency, not silently built around or silently dropped from the record.

---

## Appendix: Registry/Rules Changes This Document Requires

Collected here for the Frontend agent's convenience — each is explained in full in its
originating section above:

1. **`ui-registry.md` — `SegmentedControl`:** extend from "the sole segmented-control use
   case" (room type only) to three named uses (room type, Grid/Calendar, Control Center
   area); raise the documented option cap from "four or fewer" to "five or fewer" for the
   Control Center use. (Sections 7, 12)
2. **`ui-registry.md` — new component `CalendarView`:** add a full registry entry
   (Purpose, When to use, Variants, states, responsive behavior, accessibility
   requirements, data expectations) following the file's existing entry shape. (Section 7)
3. **`ui-registry.md` — new Composite Pattern "Event Detail View":** add alongside the
   existing Composite Patterns (Newsletter Event Listing, Room Availability Snapshot,
   etc.). (Section 8)
4. **`ui-rules.md` — Genie section:** relax "the frontend may render one link" to "a group
   of action controls, one per relevant row" for Genie → Action specifically, keeping the
   link-vs-button distinction intact. (Section 10)
5. **`ui-rules.md` — Responsive Rules table:** add Calendar's below-`--bp-md` collapse to a
   vertical agenda list, alongside the existing Room Availability collapse rule it mirrors.
   (Section 7.2, restated Section 21)

No other existing rule, token, or component definition is changed by this document.
