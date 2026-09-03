# Campus Companion V2 — Integration Plan

## 1. Purpose

This document is the **implementation coordination and integration plan** for Campus
Companion V2. It exists so four agents can work in parallel without destabilizing the
architecture that got the MVP shortlisted, and without silently overwriting each other's
work.

It defines, and only defines:

- how V2 work is divided across four agents,
- which files/directories each agent may modify,
- dependencies and required ordering between workstreams,
- API/data/UI handoff points,
- branch strategy and merge order,
- integration checkpoints,
- the end-to-end test matrix,
- conflict-resolution rules,
- per-agent Definition of Done, and
- the final V2 Definition of Done.

This is an **execution document**, not a product or design document. Product scope lives
in `v2-product-plan.md`; API shapes live in `v2-api-contracts.md`; UI behavior lives in
`v2-ui-spec.md`. This file coordinates the people implementing those three documents — it
does not restate or reinterpret their content, and it does not modify any of them.

---

## 2. Preserve the Existing Architecture

V2 is an extension of the existing system, not a rewrite. Every workstream below operates
inside the architecture already frozen in `architecture.md`:

```
React/Vite Frontend
        ↓
FastAPI Backend
        ↓
Databricks / Genie
        ↓
Governed Lakehouse (Unity Catalog)
```

Non-negotiable boundaries, restated because they are the boundaries most likely to be
violated under time pressure, not because they are being redecided here:

- The frontend never directly accesses Databricks.
- The frontend never directly accesses Genie.
- Genie remains read-only — no INSERT/UPDATE/DELETE, ever, under any framing.
- The backend owns all writes, through the existing three write endpoints plus whatever
  V2 adds per `v2-api-contracts.md`.
- The backend owns authorization; the frontend's role handling is a UX convenience only.
- Databricks (one Unity Catalog schema, one warehouse) remains the sole source of truth —
  no cache, no secondary store.
- SQL access remains centralized in `backend/app/db.py`; no other backend file issues SQL.
- Genie access remains centralized in `backend/app/genie_client.py`; no other backend file
  calls the Genie Conversation API.
- No new framework, state-management library, ORM, or architectural layer is introduced
  beyond what `architecture.md`'s Stack table and `code-standards.md`'s Dependencies and
  Libraries section already approve.

If any V2 task appears to require violating one of these, it is not a task to just do —
it is a **Change requested** event per Section 13, escalated before any code is written.

---

## 3. Current MVP Baseline

This is the current, documented implementation state, per `progress-tracker.md` (the
authoritative status source) and the other frozen context files. V2 work builds on exactly
this — no workstream should assume more or less than what's stated here.

| Area | Status | Source |
|---|---|---|
| Data Platform — schema (7 tables), seed data, column comments | Verified, live against the workspace | `progress-tracker.md` |
| Data Platform — `room_is_free(room_id, ts)` trusted function | Verified, live, 5 smoke tests passed | `progress-tracker.md` |
| Data Platform — Genie Space configuration | Implemented but **not yet Integrated** — requires manual UI creation in the Databricks workspace, then `GENIE_SPACE_ID` set in `backend/.env` | `progress-tracker.md` |
| Data Platform — 10 benchmark questions | Blocked on Genie Space creation | `progress-tracker.md` |
| Backend — all 8 REST endpoints, `db.py`, `genie_client.py`, `auth.py` | Implemented, 43/43 `pytest` tests passing | `progress-tracker.md` |
| Frontend — Newsletter Home, Ask Genie, Admin Panel | Implemented and Integrated locally | `progress-tracker.md` |
| Ingestion — Google Form, Apps Script, ingestion contract tests | Implemented and Verified | `progress-tracker.md` |
| Deployment — Databricks Apps deploy config | Ready, not yet exercised end-to-end on a deployed URL per the tracker's own "Pending deploy" markers | `progress-tracker.md` |
| Live-update loop (registration → attendance count) | Implemented and Verified locally | `progress-tracker.md` |

**Internships.** The team has confirmed that an internships feature is already present in
the live MVP (visible on Home), even though `data-contracts.md` does not yet define an
`internships` entity, fields, or example record, and `genie.md`'s "seven tables" language
has not been updated to reflect it. This is treated here as a **documentation debt, not a
functional gap** — the data and UI already exist; the schema contract has not caught up.
It is assigned to Agent 1 in Phase 1 (Section 8) as a required task, not an open product
question. No V2 workstream should re-derive or guess at the `internships` schema from
first principles; Agent 1 must document it from the live table exactly as it exists, then
publish it in `data-contracts.md` per that file's own Data Contract Change Rules, before
any other agent (in particular Agent 2, for API shapes, and Agent 3, for UI) builds
against it as if it were already a stable contract.

**Everything else** — course catalog, grading, admissions, financial data, native mobile,
notifications, multi-campus support, full authentication — remains out of scope, per
`project-overview.md`'s Features Out of Scope and `v2-product-plan.md`'s V2 Non-Goals.
This plan does not reopen either.

---

## 4. V2 Workstreams

### Agent 1 — Data + Genie

**Ownership**
- Genie Space validation and the existing 10-benchmark gate (unblocking the item marked
  Blocked in Section 3).
- V2 benchmark question expansion (event detail lookups, Campus Pulse-supporting queries,
  analytics-supporting aggregates, and any new Genie-askable question the product plan
  implies).
- Genie instruction/synonym refinement where a V2 question family needs it.
- Documenting the live `internships` entity into `data-contracts.md` (Section 3, above).
- Validating that existing derived-metric definitions (`attendance_count`,
  `free_rooms_at`, `teacher_is_free`) remain correct and reusable for V2's Campus Pulse
  and Analytics needs, rather than being re-derived a second time by Agent 2.
- Identifying any genuinely new data dependency V2 surfaces need (e.g. the Activity feed's
  flagged need for `status_changed_at` timestamps, per `v2-api-contracts.md` §6.1) and
  documenting it as a proposed `data-contracts.md` amendment — not building it unilaterally.

**Primary context:** `data-contracts.md`, `genie.md`, `v2-product-plan.md`,
`v2-api-contracts.md`.

**Owns (repository):** `data-platform/` in full (`notebooks/`, `genie/`, `benchmarks/`),
per `architecture.md`'s existing folder structure — no new top-level directory is
introduced.

**Agent 1 must NOT:**
- Redesign or touch anything under `frontend/`.
- Modify backend application logic under `backend/app/` (routers, `db.py`,
  `genie_client.py`, etc.) — Agent 1 identifies data needs; Agent 2 implements the query
  functions that serve them.
- Implement UI.
- Introduce a duplicate or parallel data model — every new field/entity is proposed as a
  `data-contracts.md` amendment, never invented ad hoc in a notebook.

---

### Agent 2 — Backend

**Ownership**
- Session/role handling extensions (`GET /api/session`, `POST /api/session/end`, the
  additive `POST /api/session` fields) per `v2-api-contracts.md` §2.
- New and extended read endpoints: `GET /api/events` extensions, `GET
  /api/events/{event_id}`, `GET /api/campus/pulse`, the four Analytics endpoints, `GET
  /api/activity`, per `v2-api-contracts.md` §3–§6.
- The `PATCH /api/events/{event_id}` cancel-only endpoint, per `v2-api-contracts.md` §8.2.
- Any `genie_client.py` changes needed to keep the Genie proxy correct as new question
  types are benchmarked by Agent 1 — coordinated with Agent 1, never done unilaterally to
  Genie's own configuration.
- Server-side authorization for every new protected endpoint, following the exact
  role-check-before-query pattern already established in `code-standards.md`.
- Booking conflict enforcement — reused from the existing centralized overlap formula in
  `db.py`, never re-derived.
- Structured error responses matching `v2-api-contracts.md` §9 exactly.

**Primary context:** `architecture.md`, `data-contracts.md`, `code-standards.md`,
`v2-product-plan.md`, `v2-api-contracts.md`.

**Owns (repository):** `backend/` in full — `backend/app/routers/`, `backend/app/db.py`,
`backend/app/genie_client.py`, `backend/app/auth.py`, `backend/app/models.py`,
`backend/app/config.py`, `backend/tests/`.

**Agent 2 must NOT:**
- Touch `frontend/src/` directly.
- Modify Genie Space instructions/synonyms/trusted functions in the Databricks workspace
  itself — that remains Agent 1's owned surface; Agent 2 only calls the existing Genie
  Conversation API through `genie_client.py`.
- Bypass `db.py` for any SQL access, or add a second file that issues SQL.
- Move any authorization check into the frontend, or accept a client-supplied role/permission
  field as authoritative.

---

### Agent 3 — Student Frontend

**Ownership**
- The role-aware entry screen (student path) and its wiring to `POST /api/session`/`GET
  /api/session`.
- Student-facing navigation (the four-item `TopBar`, per `v2-ui-spec.md` §3).
- Home (Campus Pulse block, events preview, room availability snapshot).
- The Events surface: Grid (default) and Calendar (week view), and the Grid/Calendar
  `SegmentedControl` toggle.
- Event Detail (student-facing composition: `DefinitionList`, `AttendanceDatum`,
  `StatusIndicator`, registration `Link`).
- Ask Genie UI, including the Genie → Action rendering for student-facing actions (View
  Event, Register).
- Responsive and accessible behavior for every surface above, at the breakpoints already
  defined in `ui-tokens.md`.
- Loading/empty/error state coverage for every surface above, per `ui-rules.md`'s existing
  vocabulary.

**Primary context:** `v2-product-plan.md`, `v2-api-contracts.md`, `v2-ui-spec.md`,
`ui-tokens.md`, `ui-registry.md`, `ui-rules.md`, `code-standards.md`.

**Owns (repository):** within `frontend/src/`, specifically:
`frontend/src/pages/Entry.tsx` (or equivalent), `frontend/src/pages/Home.tsx` (evolved
from `NewsletterHome.tsx`), `frontend/src/pages/Events.tsx` (new), `frontend/src/pages/
EventDetail.tsx` (new), `frontend/src/pages/AskGenie.tsx`, and any new components under
`frontend/src/components/` that are exclusively used by these pages (e.g. `CampusPulse`,
`CalendarView`, `EventDetailView` — the latter two require the `ui-registry.md` additions
`v2-ui-spec.md` already flags).

**Agent 3 must NOT:**
- Call Databricks or Genie directly, or add a second file that calls `fetch("/api/...")`
  outside `frontend/src/api/client.ts`.
- Implement backend authorization or trust any client-side role check as sufficient.
- Create a parallel design system, font, color, or spacing value outside `ui-tokens.md` —
  including not introducing the Playfair Display/Public Sans font pairing or the 1.5px
  icon stroke value that appeared in an earlier `v2-ui-spec.md` draft; both must resolve
  to `ui-tokens.md`'s actual values (Inter, 1.75px) unless `ui-tokens.md` itself is
  deliberately amended first, per that file's own rules.
- Rewrite shared architecture (routing approach, state-management approach) beyond what's
  needed for the pages above.

---

### Agent 4 — Council + Integration

**Ownership**
- The Council Control Center: Overview, Events (manage/cancel), Rooms
  (availability/booking), Analytics, Activity — the five-area `SegmentedControl`
  composition per `v2-ui-spec.md` §12.
- Council-specific rendering of Genie → Action (the Book Room path, pre-filling the
  existing booking form).
- Final integration across all four workstreams: wiring Agent 3's and Agent 4's frontend
  work to Agent 2's real (non-mock) backend, and Agent 2's backend to Agent 1's real
  (non-mock) Genie Space and seeded data.
- End-to-end testing (Section 10).
- Final UI consistency pass against `ui-tokens.md`/`ui-rules.md`/`ui-registry.md` across
  **both** student and council surfaces (Agent 4 is the last set of eyes on the whole
  product, not just their own pages).
- Deployment/readiness verification (Section 17).

**Primary context:** `v2-product-plan.md`, `v2-api-contracts.md`, `v2-ui-spec.md`,
`architecture.md`, `code-standards.md`.

**Owns (repository):** within `frontend/src/`, specifically:
`frontend/src/pages/ControlCenter/` (new directory: `Overview.tsx`, `Events.tsx`,
`Rooms.tsx`, `Analytics.tsx`, `Activity.tsx`), plus `deploy/` and coordination rights (not
unilateral edit rights) over `ingestion/`'s deployment-relevant files at Phase 5/6.

**Agent 4 acts as the final integration owner but must not arbitrarily rewrite Agent 1,
2, or 3's work.** Integration fixes that are small and unambiguous (a prop rename, a
missing null-check) may be made directly by Agent 4 per the Shared Change Protocol
(Section 13); anything larger is reported back to the owning agent, not silently patched.

**A repository-structure note specific to Agent 3/Agent 4 overlap:** both agents write
into `frontend/src/`, which `ui-registry.md` and `code-standards.md` treat as a single
Frontend-owned surface with no internal sub-ownership defined for V1. V2 introduces a
working sub-boundary for coordination purposes only: Agent 3 owns student-surface page
files and student-only components; Agent 4 owns `ControlCenter/` page files and
council-only components. **Shared components** (`Button`, `Card`, `Table`,
`StatusIndicator`, `Banner`, the extended `SegmentedControl`, the new `CalendarView`) have
no single V2 owner between Agent 3 and Agent 4 — per `ui-registry.md`'s existing rule, a
change to a shared component is made once and takes effect everywhere, so **whichever
agent needs a shared-component change first implements it and updates
`ui-registry.md` in the same change**, per that file's Adding a New Component / Ownership
process; the other agent is notified at the next checkpoint, not surprised by a diff.

---

## 5. Ownership Boundaries

| Area | Agent 1 | Agent 2 | Agent 3 | Agent 4 |
|---|---|---|---|---|
| Data / SQL (`data-platform/`, `backend/app/db.py`) | Primary (`data-platform/`) | Primary (`db.py`) | No | Support |
| Genie (`data-platform/genie/`, `backend/app/genie_client.py`) | Primary (config) | Primary (proxy) | Consumer | Integration |
| Backend APIs (`backend/app/routers/`, `models.py`) | No | Primary | Consumer | Integration |
| Session / Auth (`backend/app/auth.py`) | No | Primary | Consumer | Integration |
| Student UI (`frontend/src/pages/{Home,Events,EventDetail,AskGenie}.tsx`) | No | No | Primary | Review |
| Council UI (`frontend/src/pages/ControlCenter/`) | No | No | No | Primary |
| Shared frontend components (`frontend/src/components/`) | No | No | Shared (see Section 4 note) | Shared (see Section 4 note) |
| `ui-registry.md` updates for new/extended components | No | No | Whoever needs it first, per Section 4 | Whoever needs it first, per Section 4 |
| Ingestion (`ingestion/`) | No | No | No | Coordination only (Ingestion & Integration workstream owns per `architecture.md`; not reassigned by this plan) |
| Deployment (`deploy/`) | No | No | No | Primary |
| Integration (cross-workstream wiring) | Support | Support | Support | Primary |
| E2E testing | Support | Support | Support | Primary |

This table is derived from `architecture.md`'s existing folder structure and
`code-standards.md`'s ownership rules — it does not invent a directory that doesn't
already exist, and it does not relocate ownership of `ingestion/`, which
`architecture.md` already assigns to the Ingestion & Integration workstream (folded into
Agent 4's integration role for V2, not reassigned to a fifth agent).

---

## 6. Branch Strategy

`code-standards.md`'s existing Git and Parallel Development rules already establish: one
branch per workstream, branched from `main`, merged back at integration checkpoints, no
agent commits directly to `main`, commits small and scoped to one concern. V2 follows the
same principle, scoped to the four workstreams above:

```
main
│
├── v2/data-genie          (Agent 1 — data-platform/)
├── v2/backend             (Agent 2 — backend/)
├── v2/student-ui          (Agent 3 — frontend/src/{Entry,Home,Events,EventDetail,AskGenie})
└── v2/council-integration (Agent 4 — frontend/src/ControlCenter/, deploy/, integration work)
```

If the existing repository already uses a different branch-naming convention, that
convention wins — the principle (one branch per ownership boundary above, not per person
and not per feature) is what matters, not this exact naming.

**Each agent, per work session:**
1. Pulls/rebases from the latest agreed base (`main`, or the relevant Checkpoint's merge
   target — see Section 9).
2. Works only within their ownership boundary (Section 4/5).
3. Commits coherent, single-concern changes — never a mixed "backend + frontend" commit.
4. Runs the relevant test/build check before reporting done (`pytest` for Agent 1/2's
   backend-adjacent changes, `tsc`/`vite build` for Agent 3/4's frontend changes).
5. Reports files changed.
6. Reports any new dependency added, per `code-standards.md`'s Dependencies and Libraries
   gate — no dependency is added silently.
7. Reports anything requiring another agent's action, using the Shared Change Protocol
   (Section 13).

Giant, mixed commits are treated the same way `code-standards.md` already treats them: a
defect to flag at the next checkpoint, not a shortcut to reward.

---

## 7. Dependency Order

```
V2 Product Plan (v2-product-plan.md)
       ↓
API + UI Contracts (v2-api-contracts.md, v2-ui-spec.md)
       ↓
Data / Genie (Agent 1)  +  Backend (Agent 2)     ← parallel
       ↓
Student UI (Agent 3)  +  Council UI (Agent 4)    ← parallel, against contracts
       ↓
Integration (Agent 4)
       ↓
End-to-End Testing (all four)
       ↓
Polish
       ↓
Final Demo
```

**What can run in parallel, and why:**
- **Agent 1 and Agent 2 begin together**, immediately after Phase 0's contract freeze
  (Section 8) — Agent 1 doesn't block Agent 2's endpoint scaffolding, since Agent 2 can
  build every router against `v2-api-contracts.md`'s documented shapes first and wire real
  Genie/data access once Agent 1's benchmarks and schema updates land, mirroring exactly
  how the MVP's original Backend workstream scaffolded against mocks before Data
  Platform's tables were live.
- **Agent 3 begins UI implementation before every backend endpoint is finished** — the
  same "build against the frozen contract, not the in-progress implementation" principle
  `build-plan.md` already used for the MVP. Agent 3 needs `v2-api-contracts.md`'s shapes,
  not Agent 2's running code.
- **Agent 4 begins Control Center UI while Analytics/Activity backend endpoints are still
  being finalized** — same reasoning, since `v2-api-contracts.md` already specifies those
  response shapes.
- **Final integration (wiring real, non-mock data through every layer) happens only after**
  Agent 1's Genie Space/benchmarks and Agent 2's real endpoints are both stable — this is
  a hard dependency, not a soft one, restated at Checkpoint 2 (Section 9).

---

## 8. Implementation Phases

### Phase 0 — Context and Contract Freeze

**Objective:** confirm `v2-product-plan.md`, `v2-api-contracts.md`, `v2-ui-spec.md`, and
this file are mutually consistent before any code is written.

**Activities:** all four agents read all four V2 documents. Any contradiction — including
the kind already found and resolved during drafting (e.g. the `internships` documentation
gap, the font/stroke-width drift between `v2-ui-spec.md` and `ui-tokens.md`) — is resolved
or explicitly marked **TBD** before Phase 1 starts. No agent begins implementation against
a contract they believe is still contradicted elsewhere.

**Exit criteria:** every agent can state, without looking it up, which of the three
product/API/UI documents governs their workstream and confirms it has no open, unresolved
contradiction with the others.

---

### Phase 1 — Data + Genie Foundation

**Agent 1:**
- Unblock and pass the existing 10-benchmark gate (Section 3's "Blocked" item) — this is
  inherited MVP work, not new V2 scope, and it gates everything downstream that depends on
  a working Genie Space.
- Document the live `internships` entity into `data-contracts.md`, per Section 3.
- Add V2 benchmark questions covering: event detail lookups, Campus Pulse's underlying
  aggregates, and each Analytics metric family in `v2-api-contracts.md` §5.
- Validate that `free_rooms_at`, `teacher_is_free`, and `attendance_count` remain the
  single definitions Campus Pulse and Analytics reuse — no second derivation is written.
- Identify and document (not build) any genuinely new data dependency, per
  `v2-api-contracts.md`'s `NEW DATA DEPENDENCY` flags (e.g. Activity's cancellation
  timestamp gap).

**Deliverable:** *V2 data/Genie capabilities validated* — the original 10 benchmarks pass,
the V2 benchmark additions pass, `internships` is documented, and every new data
dependency V2 needs is either confirmed already satisfiable by the existing schema or
explicitly flagged as a pending `data-contracts.md` amendment.

---

### Phase 2 — Backend Foundation

**Agent 2:**
- Session/role improvements (`GET /api/session`, `POST /api/session/end`, additive
  `POST /api/session` fields).
- Event APIs: `GET /api/events` extensions, `GET /api/events/{event_id}`.
- `GET /api/campus/pulse`.
- The four Analytics endpoints.
- `GET /api/activity`.
- `PATCH /api/events/{event_id}` (cancel-only).
- Error handling and authorization for every endpoint above, matching
  `v2-api-contracts.md` §9/§14 exactly.

**Deliverable:** *Stable V2 backend API surface* — every endpoint in
`v2-api-contracts.md`'s New/Modified lists (§13) exists, matches its documented shape, and
has at least one passing success-case and one passing error-case test.

---

### Phase 3 — Student Experience

**Agent 3:**
- Entry (student path), navigation, Home, Campus Pulse UI, Events (Grid + Calendar),
  Event Detail, Ask Genie improvements, Genie → Action (student-facing actions),
  responsive behavior.

**Deliverable:** *Complete student-facing V2 experience* — every student surface in
`v2-ui-spec.md` §4–§10 is implemented and, by the end of this phase, connected to Agent
2's real endpoints (not mocks) for at least the read paths.

---

### Phase 4 — Council Control Center

**Agent 4:**
- Overview, Events (manage/cancel), Rooms, Analytics, Activity, council-specific Genie →
  Action rendering (Book Room).

**Deliverable:** *Complete council-facing V2 experience* — every Control Center area in
`v2-ui-spec.md` §12–§17 is implemented and connected to Agent 2's real endpoints.

---

### Phase 5 — Integration

**Agent 4 coordinates; all agents participate as needed:**
- Full API integration (every frontend surface on real, non-mock data).
- Session integration (role persists correctly across Entry → Home/Control Center →
  navigation).
- Genie integration (Ask Genie and Genie → Action against the real, benchmarked Genie
  Space).
- Event lifecycle (create → appears everywhere → cancel → disappears from default views
  everywhere, per `data-contracts.md`'s existing status-filtering rules).
- Room booking lifecycle (book → availability updates everywhere → conflict correctly
  rejected).
- Analytics and Campus Pulse reflecting real, current data.
- Role restrictions verified end-to-end, not just at the UI layer.

**Deliverable:** *End-to-end V2 system* — the full stack, wired to real data, with no
workstream still pointed at a mock.

---

### Phase 6 — Hardening

**All agents contribute.** Test: functional correctness, authorization (student vs.
council, every protected endpoint), API failure states, Genie failure states (`error`/
`no_answer`), booking conflicts, stale/failed-poll data, empty states, responsive
behavior, accessibility, and the production build/deployment path.

**Deliverable:** *Stable final-round build.*

---

## 9. Integration Checkpoints

### Checkpoint 1 — Contracts Locked
**Before implementation begins.** `v2-product-plan.md`, `v2-api-contracts.md`, and
`v2-ui-spec.md` are each treated as approved and internally consistent with each other and
with this plan. Any open contradiction is resolved or marked TBD, not carried forward
silently.

### Checkpoint 2 — Backend/Data Ready
**Verify:**
- Every V2 API endpoint responds with its documented shape (Agent 2).
- The full benchmark set (original 10 + V2 additions) passes against the real Genie Space
  (Agent 1).
- Role enforcement works on every protected endpoint, verified directly (not assumed from
  hidden UI), per `code-standards.md`'s existing testing discipline.
- No frontend-specific workaround or hack was required to make an endpoint usable — if one
  was, that's a contract mismatch to fix at the source (`v2-api-contracts.md`), per
  Section 12.

### Checkpoint 3 — Student UI Connected
**Verify:**
- Every student page consumes real APIs; no mock production data remains in the student
  build.
- Genie → Action's student-facing controls (View Event, Register) invoke real navigation/
  the real external form — not placeholder behavior.

### Checkpoint 4 — Council Connected
**Verify:**
- Event creation, cancellation, and room booking all work against real endpoints.
- Booking conflicts are correctly rejected with the documented `409` shape.
- Analytics and Activity reflect real, current data — not seeded placeholder numbers left
  over from earlier development.

### Checkpoint 5 — End-to-End
Run the complete test matrix (Section 10) against the fully integrated build.

---

## 10. Critical End-to-End Tests

### Student

| # | Test |
|---|---|
| 1 | Enter as Student → Home loads with Campus Pulse, events preview, and room availability populated from real data. |
| 2 | Events → Grid → select an event → Event Detail renders correctly. |
| 3 | Events → Calendar → select an event → Event Detail renders correctly (same destination as Test 2). |
| 4 | Event Detail → Register → the existing external registration flow works, unchanged. |
| 5 | Ask Genie → an event-lookup question → a grounded `ok` answer, with evidence disclosure, and (if the row shape supports it) a View Event/Register action. |
| 6 | Ask Genie → a room-availability question → correct availability, matching the direct-read endpoint's answer for the same query (per `data-contracts.md`'s "Genie and backend must never disagree" rule). |

### Council

| # | Test |
|---|---|
| 7 | Council entry (access code) → Control Center Overview loads. |
| 8 | Create event (Control Center → Events) → the new event appears on the student-facing Events surface (Grid and Calendar) without manual refresh. |
| 9 | Book a room (Control Center → Rooms) → room availability updates everywhere it's read (Home, Events, subsequent Genie answers). |
| 10 | Attempt a conflicting booking → backend rejects it with `409`; the conflict banner shows the actual conflicting booking's details. |
| 11 | Analytics (Events/Rooms/Clubs) reflect the actual current data — verified against a direct read, not assumed correct because the UI rendered something. |
| 12 | A student session attempts a Council-only action (direct API call or forced navigation, not just hidden UI) → denied with `403`, verified server-side. |

### Live Data Loop

This is the demonstration-critical test — it is the single test that proves the "one
source of truth" claim in `v2-product-plan.md`'s Product Vision, and it must be run
against the real deployed system, not localhost-only, before the final demo.

**Council-write loop:**
```
Council creates event
        ↓
Databricks updates (events table)
        ↓
Student Events (Grid + Calendar) updates
        ↓
Genie can answer a question about the new event
        ↓
Campus Pulse reflects the new state
```

**Registration loop (must remain exactly as it already works in the MVP):**
```
Student registration (Google Form)
        ↓
Existing Apps Script → /api/ingest/attendance
        ↓
Databricks (event_attendance) updates
        ↓
Attendance/registration count updates
        ↓
Application (event card, Event Detail, Campus Pulse, Genie) reflects the updated count
```

V2 must not alter this second loop's mechanism in any way — it is the MVP's proven
differentiator, and Section 6 of `v2-product-plan.md` explicitly frames V2 as reusing it,
not replacing it.

---

## 11. Merge Strategy

```
1. Data / Genie (v2/data-genie)
        ↓
2. Backend (v2/backend)
        ↓
3. Student UI (v2/student-ui)
        ↓
4. Council UI (v2/council-integration)
        ↓
5. Integration (on v2/council-integration, or a short-lived integration branch)
        ↓
6. main
```

If a UI branch was built entirely against the frozen `v2-api-contracts.md` shapes and has
no real dependency on Agent 2's *implementation* (only the *contract*), it may merge
earlier than strict dependency order implies — this mirrors the MVP's own "Frontend builds
against mocks matching documented shapes" pattern. What may **not** happen is merging a UI
branch that was built against a shape that has since drifted from `v2-api-contracts.md`
without reconciling first.

**Before merging any branch:**
- Pull the latest base and rebase.
- Resolve conflicts locally — a conflict on a file outside the merging agent's ownership
  boundary (Section 5) is a signal to stop and coordinate, not to resolve unilaterally.
- Run the build (`vite build` for frontend, backend startup + `pytest` for backend).
- Run the relevant test suite.
- Verify no unrelated files changed (no drive-by formatting/refactor of another agent's
  files, per `code-standards.md`'s existing rule).
- Verify the branch's API/UI contract usage still matches the frozen documents — a branch
  is never merged on "it works on my machine" alone.

---

## 12. Conflict Resolution Rules

When agents disagree, the deciding document is fixed by topic, not by seniority or
who's available:

| Topic | Authoritative document |
|---|---|
| Architecture | `architecture.md`, unless an explicit, documented V2 architecture decision overrides it |
| Data semantics | `data-contracts.md` |
| Genie behavior | `genie.md` |
| Visual system | `ui-tokens.md`, `ui-registry.md`, `ui-rules.md` |
| V2 product scope | `v2-product-plan.md` |
| API behavior | `v2-api-contracts.md` |
| V2 UI behavior | `v2-ui-spec.md` |

If a conflict cannot be resolved by consulting these — meaning the documents themselves
disagree, or are silent — **stop and make an explicit implementation decision**, recorded
in whichever document owns that topic (per the table above) before continuing. No agent
silently picks a new behavior and continues; that is exactly the "quiet drift" failure
mode `ui-tokens.md`/`code-standards.md` already warn against, and it's how the earlier
`internships` and font-stack inconsistencies happened in the first place.

---

## 13. Shared Change Protocol

If an agent discovers that another layer needs a change, they do **not** directly modify
another agent's ownership area unless it's a small, unambiguous integration fix explicitly
permitted under Section 4 (Agent 4's role). Otherwise, they report:

```
Change requested:
Reason:
Affected context:
Affected API/UI/data contract:
Suggested solution:
Blocking:
```

The relevant owner (per Section 5's table) implements it. This keeps every substantive
change traceable to one owner and one decision, rather than scattered across whichever
agent happened to hit the problem first.

---

## 14. Definition of Done for Each Agent

**Agent 1** is done when:
- The original 10 benchmarks and the V2 benchmark additions all pass against the live
  Genie Space.
- Required Campus Pulse/Analytics-supporting queries are validated against real data.
- `internships` is documented in `data-contracts.md`, matching the live table exactly.
- No unsupported or ad hoc Genie behavior has been introduced outside the documented
  Instructions/synonyms/trusted functions in `genie.md`.
- Any genuine new data gap is documented as a proposed amendment, not silently built.

**Agent 2** is done when:
- Every required V2 API endpoint exists and matches `v2-api-contracts.md` exactly.
- Authorization is server-side on every protected route, verified by test, not by UI
  behavior.
- All writes remain backend-owned; no code path lets Genie or the frontend write.
- Booking conflicts are enforced using the single centralized overlap formula.
- Errors are structured per `v2-api-contracts.md` §9.
- No frontend-to-Databricks or frontend-to-Genie access exists anywhere.

**Agent 3** is done when:
- Student entry, Home, Campus Pulse, Grid, Calendar, Event Detail, and Ask Genie all work
  against real (non-mock) data.
- Genie → Action's student-facing controls work where the row shape supports them.
- Responsive behavior is verified at `--bp-sm`/`md`/`lg`/`xl`.
- No mock data remains in any production code path.

**Agent 4** is done when:
- The Control Center (Overview, Events, Rooms, Analytics, Activity) works against real
  data.
- Event management and room booking work, including conflict rejection.
- Analytics and Activity reflect real data, not placeholders.
- Student/council permissions are verified end-to-end (server-side), not just via hidden
  UI.
- The full system is integrated — every workstream's output is wired together, not merged
  in isolation.
- The end-to-end demo (Section 15) passes twice, consecutively, without manual
  intervention.

---

## 15. Demo-Critical Path

```
1. Student enters Campus Companion
          ↓
2. Sees Campus Pulse
          ↓
3. Browses events (Grid, then Calendar)
          ↓
4. Asks Genie a natural-language question
          ↓
5. Gets a grounded answer, with SQL/data basis visible
          ↓
6. Takes an action surfaced from that answer
          ↓
7. Council creates an event or books a room
          ↓
8. Student-facing view updates, with no manual refresh
          ↓
9. Genie can immediately answer about the updated state
```

The demo's message, stated explicitly so every agent narrates the same thing: **this isn't
just a chatbot — it's a live campus operating layer connected to governed campus data**,
where every step above reuses an already-verified MVP capability (the benchmark set, the
conflict check, the live ingestion loop) rather than introducing new, unrehearsed risk
into the moment that matters most.

---

## 16. Cut Strategy

If the team is running out of time, cut in this order:

1. Advanced Activity/audit functionality (keep a minimal feed, or drop it — Campus Pulse
   and Analytics still carry the "this feels live" story alone).
2. Advanced analytics breadth (ship 2–3 strongest metrics correctly over all of them
   partially).
3. Event editing beyond cancel (fall back to create-only, exactly as the MVP already
   works).
4. Advanced calendar capabilities (ship a functional single-breakpoint week view before
   full responsive parity).
5. Extra event filters (club/search) beyond the existing default framing.
6. Personalization beyond the lightweight optional name/email capture.
7. Notifications.
8. Multi-campus functionality.
9. Any decorative/experimental feature not named as Must Ship anywhere in
   `v2-product-plan.md`.

**Do not cut, under any time pressure:**
- Core Genie Q&A and its grounding disclosure.
- Event discovery (Grid, at minimum — Calendar may be simplified per item 4 above, never
  removed outright once started, per `v2-product-plan.md`'s "never cut" list).
- Room availability.
- Council event creation.
- Room booking, including conflict enforcement.
- Server-side role enforcement on every write.
- The live-update loop (both the council-write loop and the registration loop).
- Basic analytics, once any of it is integrated — a half-working Analytics tab left in an
  inconsistent state is worse than a smaller, fully working one.
- Reliable, documented error handling (`empty`/`no_answer`/`error`/`conflict`/`forbidden`)
  on every surface that's actually shipped.

Reliability over feature count, at every decision point — restating
`v2-product-plan.md`'s and `build-plan.md`'s own standing rule, because it is the rule
most likely to be abandoned under real time pressure.

---

## 17. Deployment/Readiness Checklist

**Frontend**
- [ ] Production build (`vite build`) succeeds with zero errors.
- [ ] No console errors on any of the surfaces added/modified in V2.
- [ ] No broken routes (Home, Events, Event Detail, Ask Genie, Control Center's five
      areas).
- [ ] Responsive layout verified at `--bp-sm`/`md`/`lg`/`xl` on every new/modified surface.
- [ ] No Databricks-related environment variable is present in the frontend build.

**Backend**
- [ ] Production server starts cleanly under the Databricks Apps runtime.
- [ ] Databricks SQL warehouse connectivity works.
- [ ] Genie Conversation API connectivity works, against the real, benchmarked Genie
      Space.
- [ ] Authorization works for every protected V2 endpoint, verified directly.
- [ ] No secret (`DATABRICKS_TOKEN`, `SESSION_SIGNING_SECRET`, `INGEST_TOKEN`,
      `COUNCIL_ACCESS_CODE`) appears in a response body, log line, or frontend-accessible
      location.

**Data**
- [ ] All seven original tables plus `internships` exist and are populated.
- [ ] Seed/live data is current enough to make the demo's key questions meaningful (per
      `data-contracts.md`'s Synthetic Data Requirements, extended to whatever V2's
      benchmark additions need).
- [ ] The Genie Space is configured and the full benchmark set (original 10 + V2
      additions) passes.
- [ ] Every query Campus Pulse/Analytics/Activity depends on has been run directly and
      verified against expected values.

**Integration**
- [ ] Frontend → backend works for every V2 endpoint.
- [ ] Backend → Databricks works for every V2 read/write.
- [ ] Backend → Genie works for the full benchmark + V2 question set.
- [ ] Every write (event create/cancel, booking) updates governed data and is visible in
      the UI on the very next read, with no manual refresh.

**UX**
- [ ] Loading states present and correctly shaped on every new/modified surface.
- [ ] Empty states present and correctly worded (never rendered as errors).
- [ ] Error states present (`error`/`no_answer`), with working "Try again" where
      documented.
- [ ] Conflict state (`409`) renders the actual conflicting booking's details.
- [ ] Role restrictions verified — a student session cannot reach a council-only action,
      even via direct navigation or a forced API call.
- [ ] Mobile/narrow-viewport layout checked for every new surface, including Calendar's
      agenda-list collapse below `--bp-md`.

---

## 18. Final V2 Definition of Done

```
Student
  ✓ Can enter
  ✓ Can discover events (Grid default, Calendar secondary)
  ✓ Can inspect event details
  ✓ Can register
  ✓ Can ask Genie and get a grounded, cited answer
  ✓ Can see and use actionable results from a Genie answer, where the shape supports it
  ✓ Can see live campus state via Campus Pulse

Council
  ✓ Can enter (access code)
  ✓ Can manage events (create, cancel)
  ✓ Can book rooms
  ✓ Cannot create booking conflicts (409 enforced, server-side)
  ✓ Can view operational analytics grounded in real data
  ✓ Can access the Activity feed, scoped to what the data actually supports

System
  ✓ Databricks remains the sole source of truth
  ✓ Genie remains strictly read-only
  ✓ Backend owns all writes
  ✓ Authorization is enforced server-side, on every protected route, verified directly
  ✓ Live updates propagate with no manual refresh, in both the council-write and
    registration loops
  ✓ No critical console or API errors on any shipped surface
  ✓ Production build succeeds
  ✓ The demo-critical path (Section 15) runs end-to-end, twice, without manual
    intervention
```

---

## 19. Important Scope Constraint

This plan does not expand into a complete enterprise campus platform. The objective is a
**polished, technically credible, high-impact V2 that demonstrates a path toward a real
campus product** — not the product itself, fully built.

The team does not spend the final round building: full enterprise authentication,
multi-campus tenancy, native mobile apps, notification infrastructure, SIS/LMS
integrations, excessive personalization, complex AI agent orchestration, unnecessary
microservices, or elaborate analytics infrastructure beyond the campus-specific,
governed-data metrics already scoped in `v2-product-plan.md` §6.8. Every one of these is a
named **future roadmap item**, per `v2-product-plan.md` Section 14 — restated here only so
this plan can't be read as silently reopening them under integration pressure.

---

## 20. Open Items Marked TBD

Per this document's own instruction not to guess where the existing context is ambiguous:

- **Exact branch-naming convention**, if the team's actual repository already diverges
  from Section 6's proposed names — the ownership principle holds regardless; the literal
  strings are TBD until confirmed against the real repository.
- **Whether Control Center routing is one route with an area query param or five flat
  sibling routes** — `v2-ui-spec.md` §23 already marks this as an implementation detail
  left to Agent 4; this plan does not resolve it further.
- **Whether `POST /api/session/end` is actually built** — `v2-api-contracts.md` marks it
  optional/Should-Ship; if it's cut per Section 16, the "Switch to student view" control in
  the Control Center header (`v2-ui-spec.md` §3) is simply omitted, which is an explicitly
  acceptable outcome, not a defect.
- **The exact scope of the `data-contracts.md` amendment for `internships`** (which
  optional fields exist, whether it participates in Genie's benchmark set beyond ad hoc
  questions) — assigned to Agent 1 in Phase 1; not pre-decided here.
