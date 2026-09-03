# Campus Companion V2 Product Plan

## 1. Purpose

Campus Companion's MVP has been implemented and shortlisted for the final round of the
hackathon. This document defines the **V2 product plan**: how the MVP evolves into a
polished, deployable campus product without abandoning the architecture, data contracts,
or product principles that got it shortlisted.

This file is a **product specification**, not an implementation spec. It defines what to
build and why, at a level four implementation agents (Data Platform, Backend, Frontend,
Ingestion & Integration — the same workstream split used for the MVP) can plan against. It
does not define API schemas, database DDL, or pixel-level UI — those belong in follow-up
files identified in Section 15.

**Relationship to existing context.** This file is an extension of the existing project,
not a replacement. Existing technical contracts remain authoritative unless this V2 plan
explicitly identifies a required change. `architecture.md`, `data-contracts.md`,
`genie.md`, `ui-tokens.md`, `ui-registry.md`, `ui-rules.md`, and `code-standards.md` are
not superseded by anything below; where a V2 feature needs something those files don't yet
provide, this document flags it as a required follow-up rather than silently redefining
it.

---

## 2. Current MVP Baseline

The following is the documented, implemented MVP, per `project-overview.md`,
`architecture.md`, `data-contracts.md`, `genie.md`, and `progress-tracker.md`. V2 builds on
exactly this — nothing below should be read as replacing it.

**Surfaces (three, per `project-overview.md`):**
- **Newsletter Home** — browsable view of current events and room availability, drawn from
  the same governed data Genie queries.
- **Ask Genie** — a dedicated natural-language Q&A surface backed by Databricks Genie, with
  every answer showing its SQL/data basis.
- **Council/Club Admin Panel** — a role-gated surface for creating events and booking
  rooms.

**Data (seven governed tables, per `data-contracts.md`):** `clubs`, `students`, `rooms`,
`events`, `room_bookings`, `teacher_timetable`, `event_attendance`. There is no
`internships` entity and no internship-related data source anywhere in the current
architecture or data contracts. Where earlier informal discussion mentioned "internships"
on the Home page, that is **not** part of the documented MVP data model — see Section 17
(V2 Non-Goals) for how this plan treats it.

**Architecture (per `architecture.md`):** a single Databricks App hosting a React SPA and a
FastAPI backend, one Unity Catalog schema, one serverless SQL warehouse, one Genie Space.
Genie is read-only; all writes go through three backend endpoints
(`/api/bookings`, `/api/events`, `/api/ingest/attendance`). Role is a signed, short-lived
session cookie carrying `student` or `council`, issued by `POST /api/session` against a
single shared `COUNCIL_ACCESS_CODE` — there is no account system, no username/password, no
per-user identity.

**Live-update loop (per `project-overview.md`):** a Google Form registration updates
`event_attendance` via a webhook; the new count is visible on the next read, with no cache
to go stale. This is the product's proof of being a real, governed, self-updating system,
not a static demo.

**Status (per `progress-tracker.md`):** all Must Ship and Should Ship MVP features are
implemented and integrated on `main`; Genie Space configuration and benchmark validation
were the last items pending manual Databricks UI setup at time of writing.

V2 does not re-architect any of this. It adds surfaces, actions, and polish on top of it.

---

## 3. V2 Product Vision

> **Campus Companion is an intelligent operating layer for campus life — one place to
> discover what's happening, find campus resources, take action, and ask anything about
> campus.**

The MVP proved the hardest part: natural-language questions answered from governed,
live, auditable campus data. V2's job is to turn that proof into a product a judge (and
eventually a real campus) would actually want to use every day, by closing the loop between
*finding out* something and *doing* something about it.

**The core product loop:**

```
Discover → Ask → Act → Data changes → Campus updates
```

- **Discover** — a student sees what's happening on campus (grid, calendar, Campus Pulse).
- **Ask** — a student or council member asks Genie a plain-English question and gets a
  grounded answer.
- **Act** — the answer leads directly to an action (register, book, view details) instead
  of dead-ending as text.
- **Data changes** — that action is a governed write through the backend, landing in the
  same Unity Catalog tables Genie reads.
- **Campus updates** — every other surface (Newsletter Home, Campus Pulse, the next Genie
  question) reflects the change immediately, because there is still exactly one source of
  truth.

This loop is the differentiator this plan protects. Campus Companion should not become a
generic chatbot (Genie stays scoped to governed campus data), a generic ERP (no course
catalog, grading, admissions, or finance), a generic BI dashboard (analytics stays
campus-specific and grounded in the seven-entity model), or a social network (no feeds,
follows, or user-generated content beyond registration).

---

## 4. Product Principles

V2 inherits every principle already established for the MVP. None of these are
renegotiated by this plan:

- **Databricks remains the source of truth.** All reads (Genie, Newsletter Home, Campus
  Pulse, analytics, Ask Genie actions) and all writes resolve to the same Unity Catalog
  Delta tables via the same SQL warehouse. No cache or secondary store is introduced.
- **Genie remains read-only.** Genie never executes INSERT/UPDATE/DELETE, in V2 or beyond.
  Any action a Genie answer leads to is executed by the backend's existing write endpoints,
  never by Genie itself.
- **The backend owns all writes**, and every write endpoint independently re-verifies role
  from the signed session cookie, server-side, before executing any SQL.
- **The frontend never talks to Databricks or Genie directly** — every network call targets
  a backend `/api/*` endpoint.
- **Authorization is enforced server-side only.** Any frontend role distinction (student
  vs. council) is a UX convenience, never a security boundary.
- **No duplicated business logic across layers** — the overlap/interval formula, role
  checks, and data semantics are each implemented once, per `code-standards.md`.
- **Reuse existing UI components and design tokens** (`ui-tokens.md`, `ui-registry.md`,
  `ui-rules.md`) before inventing new ones; new components follow those files' own
  processes for extension.
- **Stay campus-specific.** No feature should generalize the product into a
  domain-agnostic tool.
- **Prefer visible, trustworthy data over decorative AI.** Every Genie answer keeps its
  SQL/data-basis disclosure; new AI-adjacent features (e.g. Genie → Action) surface data,
  they don't dress up guesses.
- **Fail visibly, never fabricate** — the `ok` / `no_answer` / `error` distinction and the
  documented empty/error states extend to every new surface, not just Ask Genie.
- **Avoid unnecessary architecture changes.** A V2 feature that can be built as a new
  read/action on the existing seven-table model and existing endpoint pattern is preferred
  over one that requires a new subsystem.

---

## 5. Target Users

V2 sharpens, but does not replace, the MVP's two user types from `project-overview.md`.

**Student (primary).** Same population as the MVP: any student, most commonly new or
first-year, who doesn't yet know where campus information lives. V2 gives this user a
richer discovery experience (grid + calendar, event detail, Campus Pulse) and closes the
gap between "Genie told me something" and "I did something about it."

**Club head / student council member (secondary, elevated).** Same population as the MVP.
V2 evolves their single Admin Panel into a fuller Council Control Center — the same
governed writes, plus visibility (analytics, activity) that helps them actually run
campus operations, not just perform two write actions.

**No new user type is introduced in V2.** Teachers and general campus administrators
remain data subjects only, exactly as `project-overview.md` scoped them for the MVP. Full
institutional identity (real accounts, per-user history across devices) is explicitly a
**future production** concern — see Section 6.1 and Section 14 — not a V2 user type.

---

## 6. V2 Feature Set

### 6.1 Role-aware Entry

**Problem it solves.** The MVP's role distinction (student vs. council) exists but has no
dedicated entry moment — a user lands directly on Newsletter Home and only discovers the
council path via the persistent nav item. For a judge or a real first-time user, an
explicit entry step reads as more intentional and product-like, and gives V2 a natural
place to introduce lightweight identification without building real authentication.

**Who uses it.** Every user, once, at the start of a session.

**What it builds on.** The existing session mechanism exactly: `POST /api/session`, the
signed HTTP-only role cookie, and the `student`/`council` role split already defined in
`architecture.md`'s Authentication and Authorization section. Nothing about the
authorization mechanism changes.

**Hackathon V2 implementation.** A lightweight entry screen, shown once per session,
replacing the current implicit "you're a student until you click Council access" flow with
an explicit choice:
- A **student path**: optionally, a name and campus email captured client-side and sent
  with the student session — not for login, but so that surfaces which want to *display* a
  registrant's name (e.g. pre-filling event registration) can do so without asking twice
  per session. This is a UX convenience captured in-session; it does **not** create a
  `students` row, does not persist across sessions, and is not a credential.
- A **council path**: the existing access-code entry, presented as part of this same entry
  screen rather than only reachable via a modal deep in the nav.
- The result in both cases is still exactly `{ "role": "student" | "council" }` from the
  existing session contract. No new authentication architecture, password system, or
  per-user account table is introduced.

**Explicitly out of scope for V2:** username/password accounts, persistent per-user login
across devices/sessions, and any authentication provider integration. These would
contradict `project-overview.md`'s explicit exclusion of account systems and
`architecture.md`'s Authentication and Authorization section, which this plan does not
override.

**Future production direction.** Campus SSO / institutional identity (e.g. SAML/OAuth
against the campus's existing identity provider) is the credible production path,
identified here as a **future** direction only (Section 14), not a V2 deliverable.

---

### 6.2 Event Discovery

**Problem it solves.** The MVP's event grid is functional but single-mode. A student
planning ahead ("what's on next week") is not well served by a scroll of cards with no
temporal structure.

**Who uses it.** Students primarily; council members use the same discovery surface.

**What it builds on.** The existing `GET /api/events` contract and `EventCard`/`Grid`
components (`ui-registry.md`) — no new data is required, since `events.start_ts`/`end_ts`
already carry everything a calendar view needs.

**Grid view (default).** Remains the primary discovery mode, per `ui-rules.md`'s existing
card-grid pattern. Cards should make it easy to scan, at minimum: event name,
club/organizer, date, time, location (room or "Room not booked"), attendance/registration
information, and a registration action where the event is upcoming and not cancelled. This
is materially the MVP's existing `EventCard`, not a new component.

**Calendar view (new, secondary).** A week/day-oriented view for planning, using the same
event data. UX principle: **Grid = discovery, Calendar = planning.** The calendar view
never replaces the grid as the default; it is reached via an explicit toggle, consistent
with `ui-rules.md`'s "one dominant thing per view" principle — the toggle is the one
page-level control, not a second permanent chrome element competing with the grid.

**Follow-up flag:** the specific calendar component (its states, responsive collapse below
`--bp-md`, and how it composes with `ui-registry.md`'s existing patterns) is a UI
implementation decision for a `v2-ui-spec.md` follow-up, not specified here.

---

### 6.3 Event Details

**Problem it solves.** The MVP has no dedicated place to see one event in full — attendance
context, description, and the registration action live only inside a card. As Campus Pulse
and Genie → Action both need somewhere to send a user for "tell me more" / "register," a
proper detail surface becomes necessary rather than optional polish.

**Who uses it.** Students (view + register); council members (view + management actions).

**What it builds on.** The existing `events` and `event_attendance` data already carry
everything needed: name, club, topic, description, room, start/end time, and
`attendance_count`. No new fields are required for the student-facing view.

**Student experience.** Selecting an event (from the grid, the calendar, Campus Pulse, or a
Genie action) opens an event detail view showing: event information, organizer/club,
date/time, location, attendance/registration information where available, description, and
the registration action. This is the same data `EventCard` already summarizes, shown in
full rather than truncated to four metadata values.

**Council experience.** The same detail view, with management actions appropriate to the
existing write contracts — at minimum, a path into the booking/edit flows already defined
for council in Section 6.7. Any action here still goes through the existing
`POST /api/bookings` / `POST /api/events` contracts and existing role enforcement; this
plan does not introduce a new write path for event details.

**Follow-up flag:** if event editing (as opposed to creation) is confirmed for V2, this
requires an endpoint `data-contracts.md` does not yet define (there is currently no update
path for `events`, only create). This is flagged for `v2-api-contracts.md`, not decided
here — see Section 6.7 and Section 11.

---

### 6.4 Calendar

Covered above as part of Event Discovery (Section 6.2). Listed separately here only because
it is called out as its own line item in the feature set; there is no additional scope
beyond what Section 6.2 already defines. The calendar view is not a separate data surface —
it renders the same `GET /api/events` data as the grid.

---

### 6.5 Campus Pulse

**Problem it solves.** The MVP's Newsletter Home is a good static-ish snapshot but doesn't
explicitly answer "what's true on campus *right now*" in one glance. Campus Pulse gives the
product a live-feeling, at-a-glance summary that reinforces the "grounded, real-time"
positioning already established as the product's core promise in `ui-tokens.md`'s Design
Direction.

**Who uses it.** All users, especially as a landing element on Home.

**What it builds on.** Entirely existing governed data and existing derived metrics from
`data-contracts.md`: events happening now and upcoming (via `start_ts`/`end_ts` and
`status`), rooms currently available (`free_rooms_at(T)`), registration/activity counts
(`attendance_count`), and the next major campus activity (soonest `scheduled` event). No
new data system, table, or metric is invented — Campus Pulse is a *presentation* of
existing derived values, not a new derivation.

**What it is not.** Not a new table, not a new backend subsystem, not a materialized
"pulse score." If a future analytics need (Section 6.8) requires a genuinely new aggregate
query, that is scoped there, not folded into Campus Pulse.

**Follow-up flag:** whether Campus Pulse is served by existing endpoints (composed
client-side from `GET /api/events` and `GET /api/rooms/availability`) or a new composite
read endpoint is an implementation decision for `v2-api-contracts.md`.

---

### 6.6 Genie → Action

**Problem it solves.** This is the single highest-priority V2 improvement. In the MVP,
Genie answers are grounded but terminal — a student who asks "what events are happening
today?" gets an answer and has to leave Ask Genie to act on it. Closing Discover → Ask →
Act into one continuous experience is what turns Genie from an impressive Q&A demo into
the product's actual operating layer.

**Who uses it.** Students (view event, register) and council (book room, manage event),
from within the same Ask Genie surface.

**What it builds on.** The existing `POST /api/genie/ask` contract's `rows` field, which
already returns the structured data behind every answer (per `architecture.md`'s Ask Genie
contract example — e.g. room names, event names). V2 does not change what Genie returns;
it changes what the **frontend** does with `rows` after rendering the answer text and
evidence disclosure that already exist.

**How it works, concretely:**
- A student asks *"What events are happening today?"* → Genie's grounded answer renders as
  today, with its evidence disclosure. The frontend additionally recognizes the result
  shape (event rows) and renders **View Event** / **Register** actions beneath the answer,
  linking to the Event Detail surface (Section 6.3) for each returned event.
- A council user asks *"Which rooms are free tomorrow from 3 to 5?"* → the answer renders
  as today, and for a `council` session specifically, the frontend renders a **Book Room**
  action per free room, linking into the existing booking flow (Section 6.7) pre-filled
  with the room/time from the Genie answer.

**Hard architectural boundary (unchanged, explicitly preserved):**

```
User → Frontend → Backend → Databricks / Genie
```

- Genie continues to only ever issue read (SELECT) queries — this plan does not add a
  write path to `genie_client.py` or the Genie Space under any circumstance.
- Every action button is the frontend calling the **existing** write endpoints
  (`POST /api/bookings`, `POST /api/events`) exactly as the Admin Panel already does — this
  is a new *entry point* into existing write flows, not a new write mechanism.
- Role enforcement is unchanged: a **Book Room** action is only ever offered to a `council`
  session in the UI, and the backend independently re-verifies role server-side on the
  resulting `POST /api/bookings` call regardless of how the request was reached, exactly as
  it does for the Admin Panel today.
- The frontend never composes, guesses, or supplements Genie's answer text to produce these
  actions — actions are derived from the structured `rows`/known result shape, consistent
  with `ui-rules.md`'s existing rule that "the frontend never composes ... an answer."

**Follow-up flag:** recognizing which Genie result shapes map to which actions (e.g. "these
rows look like events" vs. "these rows look like free rooms") is a frontend
pattern-matching concern against the existing `rows` contract, refined in
`v2-ui-spec.md`; it does not require a new Genie/backend contract field unless the team
finds the existing `rows` shape genuinely insufficient, in which case that is flagged for
`v2-api-contracts.md` rather than decided here.

---

### 6.7 Council Control Center

**Problem it solves.** The MVP's Admin Panel does exactly two things (create event, book
room) with no visibility into the campus operations those actions are part of. A council
member currently can't see registration trends, room utilization, or recent activity
without asking Genie one question at a time. V2 evolves this into an actual operational
home base for council users, without turning it into a generic enterprise dashboard.

**Who uses it.** Council/club-head sessions only, gated exactly as the current Admin Panel
is (role verified server-side on every write; read surfaces have no role-conditional
content per `ui-rules.md`'s existing Permissions rules).

**What it builds on.** The existing Admin Panel's two write flows, plus read-only
composition of existing governed data for the new Overview/Analytics/Activity areas — no
new write capability is introduced beyond what Section 6.3 flags for event editing.

**Proposed areas:**

- **Overview.** A landing view for council sessions: upcoming events, registration counts,
  room usage snapshot, active clubs, and recent activity — composed from existing
  `events`, `event_attendance`, `room_bookings`, and `clubs` reads. This is the council
  analogue of Campus Pulse (Section 6.5), scoped to what an operator needs rather than what
  a browsing student needs.
- **Events.** Create event (existing), view/manage events (new read surface over existing
  `events` data), and — only if confirmed in scope — edit existing events (flagged in
  Section 6.3 as requiring a new endpoint not yet in `data-contracts.md`/`architecture.md`).
- **Rooms.** Availability (existing `GET /api/rooms/availability`), booking (existing
  `POST /api/bookings`), and conflict prevention (existing `409` contract) — this is the
  MVP's existing booking flow, given a clearer home inside the Control Center rather than a
  standalone form.
- **Analytics.** See Section 6.8.
- **Activity.** See Section 6.9.

**Explicitly not in scope for the Control Center:** generic enterprise-dashboard features
(custom report builders, exportable BI, configurable widgets) — the Control Center stays a
small, fixed set of campus-specific operational views, consistent with the "avoid
unnecessary architecture changes" and "stay focused" principles in Section 4.

---

### 6.8 Analytics

**Problem it solves.** Council currently has no way to see patterns across events/rooms/
attendance without manually asking Genie one narrow question at a time. Lightweight,
campus-specific analytics gives council a genuine operational tool and gives the demo a
visually strong "look how much this governed data already tells us" moment.

**Who uses it.** Council/club-head sessions, inside the Control Center.

**What it builds on.** Aggregate queries over the existing seven tables — no new data
source. Every proposed metric below is derivable from fields already defined in
`data-contracts.md`:

- **Events per club / club activity** — `COUNT(events)` grouped by `club_id`, already the
  basis of the existing "how many events has this club run" Genie benchmark.
- **Registrations / attendance trends** — aggregates over `event_attendance`, the same
  table `attendance_count` already derives from.
- **Popular events** — `events` ranked by `attendance_count` (already a defined derived
  metric).
- **Room utilization / frequently used rooms** — aggregates over `room_bookings`, using the
  same half-open-interval semantics already defined for availability.
- **Peak booking periods** — time-bucketed aggregates over `room_bookings.start_ts`.

**What this is not.** Not predictive analytics, not cross-semester trend forecasting, not a
generic BI tool with ad hoc query building. Every metric here is a direct aggregate over
existing governed fields, consistent with "prefer visible, trustworthy data over decorative
AI."

**Follow-up flag:** whether these aggregates are served by new backend endpoints, by
Unity Catalog metric views, or by allowing council-facing Genie questions to double as the
analytics source is an implementation decision for `v2-api-contracts.md`. `genie.md`
already notes metric views were deliberately skipped in the MVP given the 12-hour
constraint — V2 revisits that decision only if the follow-up file determines it's
warranted, not by default here.

---

### 6.9 Activity / Audit

**Problem it solves.** Right now, a governed write (a booking, an event creation) is
visible only as its resulting state (the new booking, the new event) — there's no way to
see *that a change happened* separately from seeing the current data. A lightweight
activity feed makes the "governed, not just read-only reference data" story
(`project-overview.md`) visible, not just architecturally true.

**Who uses it.** Council sessions, inside the Control Center.

**What it builds on.** The existing write endpoints already produce exactly the
information an activity feed needs (what was created, when, by implication which role) —
this is a presentation of write results over time, not a new subsystem. `created_at` fields
already exist on `events` and `room_bookings`.

**Scope discipline.** This is explicitly a **lightweight** feed of meaningful operational
changes (event created, room booked) — not a full audit trail with field-level diffs, not a
compliance/security audit log, and not user-attributed (the product still has no per-user
identity to attribute an action to beyond "a council session did this," consistent with
Section 6.1's scope limits).

**Follow-up flag:** if this requires a new `activity_log`-style table rather than being
derived at query time from existing `created_at`/`status` fields on `events` and
`room_bookings`, that is a genuinely new data entity and must be explicitly identified in a
`v2-api-contracts.md`/data-model follow-up — it is not invented here. The preferred
default, consistent with "avoid unnecessary architecture changes," is to derive the feed
from existing fields rather than introduce a new table, unless the follow-up work finds
that insufficient.

---

### 6.10 Productization Direction

**Problem it solves.** For this to be a credible answer to "could this actually be used by
other campuses," the plan needs to show the team has thought about it — without spending V2
implementation time building a multi-tenant platform that isn't needed to win this
hackathon.

**What V2 actually does about this:** keeps the existing single-schema,
single-Genie-Space, environment-variable-driven configuration (already true per
`architecture.md`'s Environment Configuration table) clean and consistent enough that a
future "new campus" deployment is credible — e.g. campus-specific terminology, seed data,
and Genie synonyms are already isolated to Data Platform's `data-platform/genie/` files and
`UNITY_CATALOG_SCHEMA`, not hardcoded elsewhere. V2 does not add a setup wizard, a
multi-campus control plane, or per-tenant billing.

**What this is not in V2:** a multi-campus SaaS platform, a self-serve onboarding flow, or
any runtime tenant-switching capability. These are named as **future direction only** — see
Section 14.

---

## 7. User Journeys

### Student journey
Entry (role-aware entry, Section 6.1) → Home (Campus Pulse + event grid, Sections 6.2/6.5)
→ Discover an event (grid or calendar) → Event Details (Section 6.3) → Register → Data
changes (`event_attendance` insert via the existing ingestion/registration path) → Campus
updates (attendance count visible on the event card and in the next Genie answer about that
event).

### Student + Genie journey
Home or Ask Genie → Ask a question ("what AI events are on this week?") → Grounded answer
with evidence disclosure (existing behavior, unchanged) → Relevant action rendered beneath
the answer (View Event / Register, Section 6.6) → Data changes → Campus updates (same
event now shows updated attendance everywhere it's displayed).

### Council journey
Council entry (Section 6.1) → Control Center Overview (Section 6.7) → Create Event
(existing write flow) → Event appears on the student-facing grid/calendar/Campus Pulse
immediately, since there is still exactly one source of truth.

### Council room journey
Council entry → Control Center Rooms (or a Genie "which rooms are free" question with a
Book Room action, Section 6.6) → Book Room (existing `POST /api/bookings` flow, existing
conflict handling) → Booking reflected in room availability everywhere it's read
(Newsletter Home, Campus Pulse, subsequent Genie answers) with no manual refresh required.

### Demonstration journey (hackathon-facing)

A single rehearsed flow intended to showcase, in one continuous sequence, the combination
that differentiates this product from a generic chatbot or a static portal:

1. **Discover.** Open Home; Campus Pulse shows what's happening right now and the next
   major event; toggle Grid → Calendar to show the same governed data, two ways.
2. **Ask.** Open Ask Genie; ask a live, unrehearsed-feeling but benchmark-verified question
   ("Which labs are free at 3pm today?"); the answer renders with its SQL/data basis
   visibly expanded — proving it's not a canned response.
3. **Act.** From that same Genie answer, tap **Book Room** (as a council session) — no
   separate form, no re-typing the room/time.
4. **Data changes.** The booking is created through the existing governed write path with
   the existing conflict check.
5. **Campus updates.** Switch to a student view (or simply re-ask the same Genie question)
   and show the room now reads as unavailable — proving the whole system, not just one
   screen, shares one source of truth.
6. **Close the loop with the MVP's proven differentiator.** Submit the live
   registration form for a seeded event and show the attendance count tick up on the
   Newsletter Home / Campus Pulse without a manual reload — the MVP's existing live-update
   proof, now framed as one moment inside a larger, coherent product story rather than a
   standalone trick.

This journey is designed so that every step reuses an already-verified MVP capability
(Genie benchmarks, the booking conflict check, the live ingestion loop) — V2's UI work
connects these proven pieces into one continuous story rather than introducing new,
unrehearsed technical risk into the demo itself.

---

## 8. Student Experience

The student-facing product becomes: **Entry → Home (Campus Pulse + Grid/Calendar toggle) →
Event Details → Ask Genie (with actions) → registration/discovery**, all read-only from the
student's perspective except the one existing write path (event registration), unchanged
from the MVP. No new student-facing write capability is introduced by this plan.

---

## 9. Council Experience

The council-facing product becomes: **Entry (access code) → Control Center (Overview,
Events, Rooms, Analytics, Activity) → the same two governed writes the MVP already
supports** (create event, book room), now reachable both from the Control Center directly
and from actionable Genie answers (Section 6.6), with the same server-side role
enforcement on every write regardless of entry point.

---

## 10. Genie Experience

Genie's configuration, semantics, and failure taxonomy (`ok`/`no_answer`/`error`) are
**unchanged** by V2 — `genie.md` remains fully authoritative. What changes is exclusively
how the **frontend** presents a successful answer's `rows`: alongside the existing answer
text and evidence disclosure, relevant actions are now rendered when the result shape
supports one (Section 6.6). Genie itself does not gain new capabilities, new tables, new
trusted functions, or any write path in V2.

---

## 11. Feature Prioritization

### Must Ship
1. Role-aware student/council entry (Section 6.1)
2. Event grid (Section 6.2) — remains default
3. Calendar view (Section 6.2/6.4)
4. Event detail page (Section 6.3)
5. Campus Pulse (Section 6.5)
6. Genie → actionable results (Section 6.6)
7. Council Control Center (Overview, Events, Rooms) (Section 6.7)
8. Core campus analytics (Section 6.8)

### Should Ship
- Activity/audit feed (Section 6.9)
- Better room discovery (richer filtering/presentation inside the existing
  `RoomAvailabilityTable` pattern)
- Event editing (Section 6.3/6.7) — **contingent on** a follow-up decision in
  `v2-api-contracts.md`, since no update endpoint currently exists for `events`
- More polished responsive behavior across the new surfaces (Grid/Calendar toggle, Campus
  Pulse, Control Center) at the breakpoints already defined in `ui-tokens.md`
- Improved empty/loading/error states for every new surface, consistent with the
  `empty`/`no_answer`/`error` distinction already established in `ui-rules.md`

### Nice to Have
- Personalization beyond the lightweight name/email capture in Section 6.1 (e.g.
  interest-tag filtering of the event grid)
- Notifications (email/push on registration or booking confirmation)
- Campus SSO / institutional identity (Section 6.1, Section 14)
- Multi-campus configuration wizard (Section 6.10, Section 14)
- More advanced analytics (predictive/trend forecasting, cross-semester comparisons)
- Other future integrations (calendar export, LMS/SIS — already out of scope per
  `project-overview.md` and not reopened here)

### Cut First
If time becomes constrained, cut in this order before touching Must Ship:
1. Any Nice to Have item not yet started.
2. Event editing (Should Ship) — fall back to create-only, exactly as the MVP already
   works, if the new endpoint isn't ready in time.
3. Activity/audit feed (Should Ship) — Campus Pulse and Analytics carry the "this feels
   live" story on their own if Activity has to be dropped.
4. Calendar view polish beyond a single working breakpoint — ship a functional calendar at
   the primary demo/projector width before investing in full responsive parity.
5. Analytics breadth — ship 2–3 of the strongest metrics (e.g. popular events, room
   utilization) correctly rather than all of Section 6.8's list partially.

**Never cut**, regardless of time pressure: Genie's core Q&A capability and grounding
disclosure, the live attendance-update loop, server-side role enforcement on writes, and
the Grid discovery view as default — these are the proven differentiators this plan is
built to extend, not risk.

---

## 12. Hackathon Demo Story

The pitch for V2, in one paragraph: *the MVP proved Campus Companion can answer real
campus questions from governed, live data — V2 proves it's a product students would
actually open every day and council would actually run campus operations from.* The demo
should walk the Demonstration Journey in Section 7, narrating explicitly at each step which
proven MVP capability is being reused (Genie benchmarks, the conflict check, the live
ingestion loop) versus which V2 surface is presenting it (Campus Pulse, actionable Genie
answers, the Control Center). This framing directly answers the two questions a hackathon
judge is implicitly asking: *does this work*, and *would anyone actually use it* — the MVP
already answered the first; V2's demo is built to answer the second.

---

## 13. Product Differentiation

Unchanged from the MVP's core differentiation (`deep-research-report (2).md`,
`project-overview.md`), now sharpened by V2:

- **Governed, not generic.** Every answer — Genie's and every new analytics/Pulse view —
  traces to the same seven Unity Catalog tables, unlike a generic LLM chatbot or a static
  campus portal.
- **Grounded actions, not just grounded answers.** V2's Genie → Action is the specific
  differentiator versus every existing campus-assistant pattern reviewed in
  `deep-research-report (2).md`: those tools (CampusGroups, Mongoose, Grip) either dashboard
  or automate outreach, but none turn a governed NL answer directly into a governed write in
  the same interaction.
- **One source of truth, visibly.** The demonstration journey's "ask, act, watch it update
  everywhere" moment is not available to a product with a cache, a secondary store, or a
  scripted bot — it depends specifically on the architectural invariant this plan preserves
  in Section 4.
- **Operationally useful, not just informational.** The Control Center gives council a
  reason to use the product beyond the novelty of Genie — it's now also where they run
  events and rooms day to day.

---

## 14. Deployment / Future Product Direction

Identified here as **future direction only** — none of this is V2 implementation scope:

- **Campus SSO / institutional identity.** Replaces the shared-access-code role model with
  real per-user identity (SAML/OAuth against the campus's existing IdP), enabling genuine
  personalization, per-user activity attribution in the Activity feed, and multi-role
  support beyond the current student/council binary.
- **Multi-campus configuration.** A setup flow covering campus configuration, data source
  onboarding, room/club seeding, terminology configuration, Genie configuration and
  validation (re-running a benchmark set per campus, per `genie.md`'s existing pattern), and
  launch readiness checks — building on the isolation already described in Section 6.10.
- **Deeper analytics**, including trend/forecast views, once enough real campus data exists
  to make them meaningful (synthetic hackathon data does not support forecasting claims).
- **Additional integrations** (SIS/LMS, calendar export, notifications) — each remains
  explicitly out of scope per `project-overview.md`'s existing exclusions unless a future
  planning file reopens them deliberately.

---

## 15. Dependencies on Other Context Files

This plan identifies, but does not resolve, the following required follow-up work:

- **`v2-api-contracts.md`** — required for: any new/composite read endpoints backing
  Campus Pulse and Analytics (Sections 6.5, 6.8); the frontend-side action-mapping contract
  for Genie → Action (Section 6.6); an event-update endpoint if event editing is confirmed
  for V2 (Section 6.3); and the Activity feed's data source decision (Section 6.9).
- **`v2-ui-spec.md`** — required for: the role-aware entry screen's layout (Section 6.1);
  the Grid/Calendar toggle and calendar component's states and responsive behavior
  (Section 6.2); the Event Detail surface's layout (Section 6.3); Campus Pulse's visual
  composition (Section 6.5); the Genie → Action rendering pattern (Section 6.6); and the
  Control Center's Overview/Analytics/Activity layouts (Sections 6.7–6.9) — all built from
  `ui-tokens.md`/`ui-registry.md`/`ui-rules.md`'s existing token and component set, extended
  per those files' own documented processes, not redefined here.
- **Possible `data-contracts.md` amendment** — only if event editing (Section 6.3) or the
  Activity feed (Section 6.9) is confirmed to require a genuinely new field, endpoint
  semantics, or table; this plan explicitly does not invent that schema and treats any such
  addition as a breaking-change-style update to `data-contracts.md` itself, per that file's
  own Data Contract Change Rules.

No other existing context file requires amendment for the scope defined in this plan.
`architecture.md`'s Invariants, `genie.md`'s Genie configuration, and `code-standards.md`'s
engineering standards all remain as written.

---

## 16. Definition of Done

V2 is done when, in addition to the MVP's existing Definition of Done
(`project-overview.md` Success Criteria, `build-plan.md`'s Definition of Done) remaining
intact:

1. A user reaches the product through the role-aware entry experience and lands on the
   correct surface for their role, using the existing session contract unchanged.
2. A student can discover events via both Grid (default) and Calendar views of the same
   underlying data, and open any event into a full Event Detail view.
3. Campus Pulse renders a live, at-a-glance summary composed entirely from existing
   governed data, with no new data source.
4. At least one Genie question of each demonstrated type (event lookup, room availability)
   renders a relevant action, and that action executes through the existing, unmodified
   write endpoints with unchanged server-side role enforcement.
5. Council can reach an Overview, manage events and rooms, and view at least the Must Ship
   subset of analytics from a single Control Center.
6. Every new surface handles its documented empty/loading/error states distinctly, per the
   `empty`/`no_answer`/`error` vocabulary already established in `ui-rules.md`.
7. No principle in Section 4 has been violated: Genie is still read-only; the frontend
   still never calls Databricks directly; every write still re-verifies role server-side;
   there is still exactly one source of truth.
8. The Demonstration Journey (Section 7) has been walked end-to-end at least twice without
   manual intervention, on real (not mocked) data.

---

## 17. V2 Non-Goals

Explicitly out of scope for V2, to protect focus:

- **Internships.** Earlier informal discussion referenced an internships feature on Home.
  There is no `internships` entity, endpoint, or data source anywhere in
  `data-contracts.md` or `architecture.md`, and none is introduced by this plan. If
  internships are wanted in a future iteration, they require a genuinely new data source
  and entity, to be scoped in a dedicated follow-up — not assumed as existing or added
  silently here.
- **Full authentication/account system** (Section 6.1) — real login, password management,
  or persistent per-user identity across sessions.
- **Multi-campus / multi-tenant platform** (Section 6.10, Section 14) — a single campus
  remains the deployment unit for V2.
- **Generic BI/enterprise dashboarding** — Analytics (Section 6.8) and the Control Center
  (Section 6.7) stay fixed, campus-specific views, not a configurable dashboard builder.
- **Notifications, alerts, or push/email/SMS functionality** — remains excluded per
  `project-overview.md`'s existing Features Out of Scope, not reopened here.
- **A native mobile application** — remains excluded; V2 focuses on the existing responsive
  web surface.
- **Course catalog, grading, admissions, financial, or HR functionality** — remains
  excluded per the MVP's existing product boundaries.
- **Any write path for Genie** — under no framing (fictional, "assistive," or otherwise) is
  Genie given INSERT/UPDATE/DELETE capability in V2. This is restated here because Section
  6.6 (Genie → Action) is the feature most likely to be misread as loosening this
  boundary; it does not.
