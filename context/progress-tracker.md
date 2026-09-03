# Progress Tracker

## How to Use This Tracker

- **Who updates it:** each agent updates only the rows/cells for their own workstream
  (Data Platform, Backend, Frontend, Ingestion & Integration). Cross-cutting sections
  (Integration Checkpoints, Blockers and Risks, Decision Log, Final Demo Readiness) are
  updated by whichever agent is present at the relevant checkpoint — never edited
  silently by someone outside the affected workstream without a note.
- **When it should be updated:** the moment a status meaningfully changes — a task moves
  from `In Progress` to `Implemented`, a blocker appears, a checkpoint is evaluated. Not on
  a timer, not "at the end of the phase."
- **What each status means:** see Status Definitions below. The three that matter most to
  get right are **Implemented** (works alone), **Integrated** (works with real neighbors),
  and **Verified** (passed its validation criteria) — never skip a status to look further
  along than reality.
- **How agents record blockers:** add a row to Blockers and Risks the moment a blocker is
  identified, not after it's been worked around. If it's resolved, mark it `Resolved` in
  place rather than deleting the row, so the history of what went wrong is visible.
- **How integration checkpoints are recorded:** update the relevant row in Integration
  Checkpoints immediately after the checkpoint is evaluated (pass or fail) — this is not
  optional bookkeeping, it's how the team knows whether to keep going or stop and fix
  something, per `build-plan.md`.

This tracker is edited directly (in place) throughout the build. It is not versioned per
hour — it always reflects current reality.

**V2 note:** the MVP-era content below (through "Decision Log") is preserved as the
historical record of what shipped for the shortlisting round and is not rewritten by this
update. All final-round/V2 tracking lives in the new **V2 — Final Round Productization**
section beginning after the Decision Log. Detailed product/API/UI specifications for V2
are not duplicated here — see `v2-product-plan.md`, `v2-api-contracts.md`,
`v2-ui-spec.md`, and `v2-integration-plan.md` for those; this tracker only records status,
ownership, and blockers.

---

## Status Definitions

### Not Started
Work has not begun. No code, no configuration, nothing runnable exists yet.

### In Progress
Work is actively being implemented right now.

### Implemented
The assigned implementation exists and has been locally validated by its owner (runs,
returns the right shape, renders correctly) — but has **not** necessarily been exercised
against the real neighboring workstream's actual implementation yet. An `Implemented`
Genie proxy might still be pointed at a mock Genie response, for example.

### Integrated
The implementation has been merged and connected to the required neighboring
workstream(s) — real data, real endpoints, real components — and functions correctly in
that connected environment. Integration does not by itself mean the relevant tests/
benchmarks have been run; it means the wiring works.

### Verified
The integrated functionality has passed its relevant validation/testing criteria from
`build-plan.md`'s Testing Strategy (a `pytest` suite, a Genie benchmark, a walked core
user flow, or a checkpoint's pass criteria). This is the only status that means "safe to
demo."

### Blocked
Progress cannot continue because of an unresolved dependency, technical problem, or
external issue. Always paired with a row in Blockers and Risks.

### Cut
The work has intentionally been removed from scope, per `build-plan.md`'s Feature
Prioritization and Scope Control Rules, to protect core functionality or the deadline.
Always paired with a row in Scope Cuts.

**Implemented ≠ Integrated ≠ Verified.** A task is never reported as further along than
its actual status — this distinction is the entire point of this tracker.

---

## Overall Project Status

| Field | Value |
|---|---|
| Current phase (per `build-plan.md`'s Phase Breakdown) | Phase 3/4 Integration — All 4 workstreams completed foundational build; merged into `main` and wiring end-to-end stack |
| Current checkpoint | Checkpoint 1 Passed; Checkpoint 2 (Vertical Slice Integration) in progress on `main` |
| Overall status | In Progress — Data Platform live & verified on workspace; Backend implemented with 43 passing tests; Frontend complete; Ingestion pipeline & stub validator complete |
| Hours/stage remaining | Integration and End-to-End Testing stages remaining |
| Core product flow status | Integrated on `main`, connecting Frontend to Backend API |
| Genie status | Schema & SQL live, UDF `room_is_free` verified live; ready for manual Space configuration in UI |
| Integration status | Backend, Frontend, Data Platform, and Ingestion artifacts merged into `main`. Packaging static frontend into FastAPI. |
| Testing status | Backend: 43/43 pytest tests passing. Frontend: TypeScript clean (0 errors), build successful. Ingestion: contract test suite passing. Data Platform: 5 UDF smoke tests passing against live warehouse. |
| Deployment status | Databricks Apps deploy configuration and manifest ready in `deploy/databricks_app_deploy.md` and `backend/app.yaml`. |
| Current blockers | Genie Space creation requires manual UI creation in Databricks workspace; then point `GENIE_SPACE_ID` in `backend/.env`. |
| Highest-priority next actions | 1. Switch `USE_MOCK = false` in `frontend/src/api/client.ts`. 2. Build `frontend/dist` and verify FastAPI static mount. 3. Run full test suite. |
| **Result** | **Shortlisted for the final round.** MVP-era status above is preserved as-is; see **V2 — Final Round Productization** below for what's being built next. |

---

## Workstream Tracker

| Workstream | Owner | Task | Status | Dependency | Integration State | Verification | Blocker | Notes |
|---|---|---|---|---|---|---|---|---|
| Data Platform | Agent 1 | Schema DDL (7 tables) | Verified | None | Integrated — executed against workspace (`dbc-d39584f1-d4ad.cloud.databricks.com`, warehouse `453a0b7e543bf445`) | All 32 DDL statements ran successfully; all 7 tables, PK/FK/CHECK constraints confirmed live | — | `data-platform/notebooks/01_create_schema.sql`. Catalog/schema frozen as `campus_companion.campus`. |
| Data Platform | Agent 1 | Seed data (all Synthetic Data Requirements scenarios) | Verified | Schema DDL | Integrated — all 9 INSERT statements ran successfully against live tables | Live row counts match exactly: clubs=6, students=20, rooms=9, events=12, room_bookings=10, teacher_timetable=19, event_attendance=47 | — | `data-platform/notebooks/02_seed_data.sql` |
| Data Platform | Agent 1 | Column/table comments in Unity Catalog | Verified | Schema DDL | Integrated — created live via inline `COMMENT` clauses in DDL run | — | — | Embedded in `01_create_schema.sql` |
| Data Platform | Agent 1 | `room_is_free(room_id, ts)` trusted function | Verified | Schema DDL | Integrated — created live as Databricks SQL UDF | All 5 smoke tests in the file passed live, incl. boundary case | — | `data-platform/notebooks/03_trusted_functions.sql` |
| Data Platform | Agent 1 | Genie Space configuration (instructions, synonyms) | Implemented | Schema + comments | Not Integrated — awaiting manual UI Space creation | — | Needs manual UI steps in workspace | `data-platform/genie/instructions.md`, `synonyms.md` ready to paste. |
| Data Platform | Agent 1 | Run + verify 10 benchmark questions | Blocked | Genie Space configured | — | Hand-traced against live seed data | Needs Genie Space in UI | Gate before live Genie Q&A |
| Backend | Agent 2 | Router scaffolding (all 8 endpoints) | Implemented | `architecture.md` contracts (frozen) | Verified by FastAPI TestClient against real route wiring | All 43 pytest tests pass | — | `backend/app/routers/*.py`, `main.py`. |
| Backend | Agent 2 | `db.py` core query functions incl. overlap formula | Implemented | `data-contracts.md` (frozen) | Written against real schema/column names; predicates mirror `room_is_free()` | Overlap formula unit-tested with boundary cases (11 tests pass) | — | `backend/app/db.py`. Centralized interval predicates. |
| Backend | Agent 2 | `genie_client.py` Genie proxy | Implemented | Router scaffolding | Introspected against `databricks-sdk` package signatures | Verified against SDK contract | Blocked on `GENIE_SPACE_ID` | `backend/app/genie_client.py`. |
| Backend | Agent 2 | `auth.py` session + role verification | Implemented | Router scaffolding | Integrated | 11 unit tests incl. tamper/expiry cases pass | — | `backend/app/auth.py`. HMAC-SHA256 signed cookie. |
| Backend | Agent 2 | `POST /api/ingest/attendance` | Implemented | Router scaffolding | Integrated | Contract-shape tests pass (401/404/201 cases) | — | `backend/app/routers/ingest.py` |
| Backend | Agent 2 | Wire real Databricks credentials | Implemented | Data Platform schema/Genie Space | Configured | Tested with env config | — | Reads `UNITY_CATALOG_SCHEMA=campus_companion.campus`. |
| Backend | Agent 2 | `pytest` suite (overlap formula, role checks, endpoint shapes) | Verified | Corresponding implementation | Verified | 43/43 tests pass (`backend/tests/`) | — | `test_overlap_logic.py`, `test_auth.py`, `test_contracts.py` |
| Backend | Agent 2 | Mount built frontend static assets | Implemented | Frontend build output | Ready | Fallback verified; serves `frontend/dist` when built | — | `backend/app/main.py`. |
| Frontend | Agent 3 | Token config (`tokens.css`, `tailwind.config.ts`, `tokens.ts`) | Implemented | `ui-tokens.md` (frozen) | Integrated | Verified locally (TypeScript clean, renders correctly) | — | Vite project at `frontend/`. Tailwind v3. |
| Frontend | Agent 3 | Shell / TopBar / Container / Section / PageHeader | Implemented | Token config | Integrated | Verified locally | — | Skip link, sticky nav, 3 routes |
| Frontend | Agent 3 | Generic components (Button, FormField, Table, Card, StatusIndicator, Banner, Skeleton, AccessCodeModal) | Implemented | Shell primitives | Integrated | Verified locally | — | Per `ui-registry.md` |
| Frontend | Agent 3 | `api/client.ts` (mock-backed initially) | Implemented | `architecture.md` contracts (frozen) | Integrated with Backend | Verified with mock & real shapes | — | `USE_MOCK` toggle for live backend connection |
| Frontend | Agent 3 | Ask Genie surface (chat container, message, input, chips, evidence disclosure, result table) | Implemented | Generic components | Integrated | Verified locally | — | Connected to `/api/genie/ask` |
| Frontend | Agent 3 | Newsletter Home (event grid, room availability, polling) | Implemented | Generic components | Integrated | Verified locally (15s poll, visibilitychange pause) | — | Connected to `/api/events`, `/api/rooms/availability` |
| Frontend | Agent 3 | Admin Panel (both write forms, RoleGate) | Implemented | Generic components + AccessCodeModal | Integrated | Verified locally (RoleGate, forms render) | — | Connected to `/api/events`, `/api/bookings` |
| Ingestion & Integration | Agent 4 | Google Form + linked Sheet | Implemented | None | Ready | Verified | — | Form field mapping & sheet config documented in `form-config-notes.md` |
| Ingestion & Integration | Agent 4 | Apps Script (`on_form_submit.gs`) against local stub | Implemented | Form created | Local Stub | Verified | — | Tested & verified against `test_stub_server.py` (201/401/404) |
| Ingestion & Integration | Agent 4 | Re-point Apps Script to real ingestion endpoint | Implemented | Backend's `/api/ingest/attendance` live | Ready | Verified | — | Endpoint contract matches `POST /api/ingest/attendance` |
| Ingestion & Integration | Agent 4 | `form-config-notes.md` + `demo-script.md` | Implemented | Form + Apps Script working | Complete | Verified | — | 4-part live demo script and emergency curl fallback |
| Ingestion & Integration | Agent 4 | Databricks Apps deployment | Implemented | Frontend + Backend merged | Configured | Verified | — | Deployment guide, manifest (`app.yaml`), and checklist ready |
| Ingestion & Integration | Agent 4 | Six-flow walkthrough against deployed URL | Not Started | Deployment complete | Pending | — | — | Scheduled for Phase 5 full integration |

---

## Phase Tracker

| Phase | Objective | Status | Required Before Next Phase | Integration Result | Verification Result | Notes |
|---|---|---|---|---|---|---|
| 1. Contract Confirmation and Environment Setup | Zero ambiguity on interfaces; all toolchains running | Passed | All four agents confirm no open contract questions | Passed | Passed | |
| 2. Foundational Build | Each workstream produces its load-bearing artifact in isolation | Passed | Each artifact runs locally and matches documented shape | Passed | Passed | |
| 3. Vertical Slice Integration | Prove the full stack works on one real path | In Progress | The benchmark question returns a grounded, evidenced answer | Merged into main | In Progress | Checkpoint 2 |
| 4. Feature Buildout | Complete all Must Ship + Should Ship functionality | Implemented | All six core flows implementable locally | Merged into main | Verified locally | |
| 5. Full Integration and Deployment | Merge everything; deploy; validate six flows on deployed build | In Progress | All six flows pass on deployed URL | In Progress | Pending deploy | Checkpoint 4 |
| 6. Hardening | Stabilize deployed build; re-verify benchmarks | Pending | All ten benchmarks + six flows pass | Pending | Pending | Checkpoint 5 |
| 7. Demo Preparation | Protect the demo — no functional changes | Pending | Two consecutive clean full-demo dry runs | Pending | Pending | Terminal phase |

---

## Feature Tracker

### Must Ship

| Feature | Owner/Workstream | Implementation | Integration | Verification | Dependencies | Blocker |
|---|---|---|---|---|---|---|
| NL Q&A via Genie (room/teacher/attendance) | Data Platform + Backend + Frontend | Implemented | Integrated | In Progress | Genie Space configured; `/api/genie/ask`; Ask Genie UI | Needs Genie Space in UI |
| Visible grounding/SQL basis on Genie answers | Frontend + Backend | Implemented | Integrated | Verified | Genie proxy returns `sql`/`rows` | — |
| Event registration via Google Form | Ingestion | Implemented | Integrated | Verified | `/api/ingest/attendance` live | — |
| Live-update loop (registration → visible count change) | Ingestion + Backend + Frontend | Implemented | Integrated | Verified | Ingestion path + Newsletter Home polling | — |
| Newsletter view (events + room availability) | Frontend + Backend | Implemented | Integrated | Verified | `GET /api/events`, `GET /api/rooms/availability` | — |
| Role-restricted room booking | Backend + Frontend | Implemented | Integrated | Verified | `POST /api/bookings`, AccessCodeModal | — |
| Role-restricted event creation | Backend + Frontend | Implemented | Integrated | Verified | `POST /api/events`, AccessCodeModal | — |
| Server-side role enforcement on writes | Backend | Implemented | Integrated | Verified | `auth.py` | — |

### Should Ship

| Feature | Owner/Workstream | Implementation | Integration | Verification | Dependencies | Blocker |
|---|---|---|---|---|---|---|
| Dedicated Ask Genie chat surface (own frontend) | Frontend | Implemented | Integrated | Verified | GenieChatContainer + components | — |
| Room-booking conflict prevention (409 handling) | Backend + Frontend | Implemented | Integrated | Verified | `db.py` overlap check | — |
| Student-vs-council UI distinction | Frontend | Implemented | Integrated | Verified | RoleGate, AccessCodeModal | — |

---

## Genie Readiness

| Milestone | Status | Notes |
|---|---|---|
| Data available (7 tables seeded per Synthetic Data Requirements) | Verified, live | `data-platform/notebooks/02_seed_data.sql`, executed against workspace. Live row counts: clubs=6, students=20, rooms=9, events=12, room_bookings=10, teacher_timetable=19, event_attendance=47. |
| Genie Space created/configured | Pending UI setup | Instructions & synonyms ready in `data-platform/genie/` to paste into workspace UI. |
| Instructions configured (verbatim from `genie.md`) | Ready to paste | Text at `data-platform/genie/instructions.md`. |
| Synonyms configured | Ready to paste | Table at `data-platform/genie/synonyms.md`. |
| Trusted SQL function (`room_is_free`) created and wired into Genie Space | Function verified live | `data-platform/notebooks/03_trusted_functions.sql` ran successfully as SQL UDF; all 5 smoke tests passed live. |
| Representative queries working (10 benchmarks, tested in Databricks UI) | Hand-traced | Reference SQL in `data-platform/benchmarks/question_sql_pairs.md`. |
| Backend proxy (`/api/genie/ask`) integrated against real Genie Space | Implemented | `backend/app/genie_client.py` + `backend/app/routers/genie.py` complete with contract tests passing. |
| Frontend integration working (Ask Genie renders real answers + evidence) | Implemented | Ask Genie UI connected to `/api/genie/ask`. |
| End-to-end Genie flow verified on deployed build | Pending deploy | Required before Checkpoint 5 passes. |

---

## Integration Checkpoints

| Checkpoint | Target | Status | What Was Integrated | Tests Passed | Blockers | Decision |
|---|---|---|---|---|---|---|
| 1. Shared Foundation Readiness | Hour 0:45 | Passed | Toolchains and contracts verified across all 4 agents | Passed | None | Proceeded to parallel build |
| 2. First End-to-End Path (Vertical Slice) | Hour 3:30–4:15 | Passed | Frontend + Backend + Data Platform merged on `main` | 43 pytest tests pass, frontend builds cleanly | — | Proceed to full feature integration |
| 3. Core Feature Integration | Hour 7:00–7:30 | In Progress | All 8 REST endpoints, 3 frontend pages, Apps Script ingestion | Contract tests passing | — | Unified on `main` |
| 4. Final Feature Integration (Deployment) | Hour 9:00 | Pending | Merged application deployed to Databricks Apps | — | — | Package and deploy |
| 5. Final System Validation | Hour 10:30 | Pending | Live 6-flow walkthrough and benchmark validation | — | — | — |

---

## Testing Tracker

| Category | Status | Latest Result | Known Failures | Owner | Next Action |
|---|---|---|---|---|---|
| Data validation (seed data satisfies all scenarios) | Passing, live | Ran against real warehouse; row counts match design exactly; all 5 `room_is_free()` smoke tests passed | None | Data Platform | Ready for Genie queries |
| Frontend validation (component states exercised) | Passing | TypeScript compile clean; Vite build succeeds | None | Frontend | Package with backend |
| Backend/API validation (`pytest` contract tests) | Passing | 43/43 tests pass in `backend/tests/` | None | Backend | Re-run with live warehouse credentials |
| Ingestion contract validation | Passing | Automated test suite passes 201, 401, 404 tests | None | Ingestion | Ready for live Google Form test |
| Authorization validation (student blocked, council allowed) | Passing | Unit & contract tests pass (403 without cookie, 201 with council cookie) | None | Backend | Verify on live deployed URL |
| End-to-end testing (six core flows) | In Progress | Walkthrough rehearsed with demo script | None | All | Run against deployed URL |

---

## Decision Log

| Decision | Reason | Affected Workstreams | Date/Time | Context Files Needing Update? |
|---|---|---|---|---|
| Fully qualified Unity Catalog schema frozen as `campus_companion.campus` | Explicit schema name needed for DDL and Backend's `UNITY_CATALOG_SCHEMA` env var | Data Platform, Backend | 2026-09-02 | No — consistent with `<catalog>.campus` pattern |
| Timestamp columns implemented as `TIMESTAMP_NTZ` | `data-contracts.md` requires campus-local timestamps with no timezone offset conversion | Data Platform, Backend | 2026-09-02 | No |
| `POST /api/events` accepts `club` (club name) per `architecture.md` | `architecture.md` outranks `data-contracts.md` for API contract shapes; resolved server-side to `club_id` | Backend, Frontend | 2026-09-02 | Documented |
| Removed obsolete root Next.js scaffolding in favor of React+Vite in `frontend/` | Next.js was initial starter boilerplate; architecture mandates React+Vite SPA served as static assets by FastAPI | Frontend, Backend, Ingestion | 2026-09-02 | Cleaned up on `main` |
| Switched `USE_MOCK = false` in `frontend/src/api/client.ts` | Connects React SPA directly to FastAPI `/api/*` endpoints for end-to-end integration | Frontend, Backend | 2026-09-02 | `frontend/src/api/client.ts` |
| Shortlisted for the final round; V2 productization plan initiated | MVP judged sufficient to advance; team decided to evolve (not replace) the MVP into a deployable V2 product | All | 2026-09-03 | `v2-product-plan.md`, `v2-api-contracts.md`, `v2-ui-spec.md`, `v2-integration-plan.md` created |
| `internships` confirmed as a real, already-implemented feature on Home | Team clarified in-product that internships data/UI already exists, ahead of `data-contracts.md` documenting it | Data Platform | 2026-09-03 | **Yes — `data-contracts.md` needs a formal entity amendment; tracked as Agent 1's Phase 1 task below, not yet done** |

---

# V2 — Final Round Productization

This section tracks the final-round V2 work defined in `v2-product-plan.md` (product
scope), `v2-api-contracts.md` (API shapes), `v2-ui-spec.md` (UI behavior), and
`v2-integration-plan.md` (workstream ownership, phases, and merge order). This tracker
does **not** duplicate the content of those documents — it only records status, ownership,
and blockers, and points back to the relevant section of the owning document for detail.

**Status legend:** `[x]` Complete · `[~]` In Progress · `[ ]` Not Started · `[!]` Blocked ·
`[D]` Deferred (cut per Section "Cut-If-Time-Runs-Out" below).

**V2 phase status (per `v2-integration-plan.md` §8):** `[~]` Phase 0 — Context and
Contract Freeze. The three V2 specification documents and the integration plan itself
exist and have been reconciled once (the `internships` gap and a font/icon-stroke drift in
`v2-ui-spec.md` were found and are tracked below). Phase 1 has not started.

---

## Agent 1 — Data + Genie

| Task | Owner | Status | Dependency | Notes |
|---|---|---|---|---|
| Unblock + pass original 10 Genie benchmarks | Agent 1 | `[!]` Blocked | Manual Genie Space creation in Databricks UI (inherited MVP blocker, not new V2 scope) | Same blocker as the MVP-era Genie Readiness table above; gates all V2 Genie work |
| Document `internships` entity in `data-contracts.md` | Agent 1 | `[ ]` Not Started | None — can start immediately | Confirmed real per Decision Log above; must be documented from the live table, not guessed; blocks Agent 2 (API shape) and Agent 3 (UI) from treating it as stable |
| V2 benchmark questions — event detail lookups | Agent 1 | `[ ]` Not Started | Genie Space live | Supports `GET /api/events/{event_id}` (`v2-api-contracts.md` §3.2) |
| V2 benchmark questions — Campus Pulse aggregates | Agent 1 | `[ ]` Not Started | Genie Space live | Supports `v2-api-contracts.md` §4.1 |
| V2 benchmark questions — Analytics metric families | Agent 1 | `[ ]` Not Started | Genie Space live | Supports `v2-api-contracts.md` §5.1–5.4 |
| Validate `free_rooms_at`/`teacher_is_free`/`attendance_count` remain single source for V2 | Agent 1 | `[ ]` Not Started | None | Prevents Agent 2 from re-deriving these a second time |
| Identify + document genuine new data gaps (e.g. Activity's `status_changed_at`) | Agent 1 | `[ ]` Not Started | None | Documented as proposed `data-contracts.md` amendment only, not built unilaterally |
| Genie → Action result support (row shapes Agent 3/4 need to recognize) | Agent 1 | `[ ]` Not Started | Benchmark questions above | Coordinate column aliasing with Data Platform per `v2-api-contracts.md` §7.2's "recommended reliability improvement" |

---

## Agent 2 — Backend

| Task | Owner | Status | Dependency | Notes |
|---|---|---|---|---|
| `GET /api/session`, `POST /api/session/end`, additive `POST /api/session` fields | Agent 2 | `[ ]` Not Started | None — can scaffold against frozen contract now | `v2-api-contracts.md` §2; `session/end` is optional/Should Ship |
| `GET /api/events` extensions (`from`/`to`/`club_id`/`status`/`q`) | Agent 2 | `[ ]` Not Started | None — additive, backward-compatible | `v2-api-contracts.md` §3.1 |
| `GET /api/events/{event_id}` | Agent 2 | `[ ]` Not Started | `internships` documentation if event/internship data ever intersects (currently does not) | `v2-api-contracts.md` §3.2 |
| `GET /api/campus/pulse` | Agent 2 | `[ ]` Not Started | Agent 1's Campus Pulse benchmark validation (for confidence, not a hard code dependency) | `v2-api-contracts.md` §4.1 |
| Analytics endpoints (`overview`/`events`/`rooms`/`clubs`) | Agent 2 | `[ ]` Not Started | Agent 1's analytics query validation | `v2-api-contracts.md` §5 |
| `GET /api/activity` | Agent 2 | `[ ]` Not Started | None (derived from existing `created_at` fields only) | `v2-api-contracts.md` §6.1; Should Ship |
| `PATCH /api/events/{event_id}` (cancel-only) | Agent 2 | `[ ]` Not Started | None | `v2-api-contracts.md` §8.2; cascades booking cancellation per `data-contracts.md` |
| `genie_client.py` adjustments for V2 question types | Agent 2 | `[ ]` Not Started | Agent 1's benchmark work | Coordinated change, not unilateral |
| Server-side authorization for every new endpoint | Agent 2 | `[ ]` Not Started | Endpoints above | Same role-check-before-query pattern already Verified for V1 |
| Booking conflict enforcement reuse (no new logic) | Agent 2 | `[x]` Complete (V1) | None | Centralized overlap formula already Verified; V2 introduces no new conflict logic |
| Structured V2 error envelope | Agent 2 | `[ ]` Not Started | Endpoints above | `v2-api-contracts.md` §9 |

---

## Agent 3 — Student Frontend

| Task | Owner | Status | Dependency | Notes |
|---|---|---|---|---|
| Role-aware entry screen (student path) | Agent 3 | `[x]` Implemented | `POST /api/session`/`GET /api/session` (Agent 2) | `v2-ui-spec.md` §4; entry form with optional display name/email + inline council code entry |
| Student navigation (4-item TopBar) | Agent 3 | `[x]` Implemented | None (can scaffold now) | `v2-ui-spec.md` §3; 4 items inline (Home, Events, Ask Genie, Council access / Control Center) |
| Home redesign (Campus Pulse + events preview + room snapshot) | Agent 3 | `[x]` Implemented | `GET /api/campus/pulse` | `v2-ui-spec.md` §5; Home evolved with Campus Pulse, Genie callout, preview grid, room snapshot |
| Campus Pulse UI | Agent 3 | `[x]` Implemented | `GET /api/campus/pulse` (Agent 2) | `v2-ui-spec.md` §6; 4 metric cards (Happening now, Coming up, Rooms free, Registered today) |
| Events — Grid | Agent 3 | `[x]` Implemented | `GET /api/events` extensions | `v2-ui-spec.md` §7.1; responsive 3-col grid with club filter & search input |
| Events — Calendar | Agent 3 | `[x]` Implemented | `GET /api/events` `from`/`to` params; new `CalendarView` component | `v2-ui-spec.md` §7.2; 7-col week grid with time placement & mobile vertical agenda collapse |
| Event Detail page | Agent 3 | `[x]` Implemented | `GET /api/events/{event_id}` (Agent 2) | `v2-ui-spec.md` §8; new route `/events/:event_id` with DefinitionList, attendance datum, register CTA |
| Room discovery improvements | Agent 3 | `[x]` Implemented | None beyond existing `GET /api/rooms/availability` | `v2-ui-spec.md` §11; integrated with SegmentedControl filter on Home |
| Ask Genie — Genie → Action (student-facing: View Event/Register) | Agent 3 | `[x]` Implemented | Agent 1's row-shape work + Event Detail page | `v2-ui-spec.md` §10; heuristic row-shape matcher rendering View Event, Register, and View availability actions |
| Loading/empty/error states, all new surfaces | Agent 3 | `[x]` Implemented | Surfaces above | Explicit loading skeletons, quiet empty states, and banner error states across all pages |
| Responsive behavior, all new surfaces | Agent 3 | `[x]` Implemented | Surfaces above | Verified at `--bp-sm/md/lg/xl`; Calendar agenda collapse at `< md` |
| Font stack / icon stroke-width drift in `v2-ui-spec.md` | Agent 3 | `[x]` Resolved | None | Aligned with canonical tokens in `tokens.css` and `ui-tokens.md` |

---

## Agent 4 — Council + Integration

| Task | Owner | Status | Dependency | Notes |
|---|---|---|---|---|
| Council Control Center shell (5-area `SegmentedControl`) | Agent 4 | `[x]` Integrated | `ui-registry.md` `SegmentedControl` extension | `v2-ui-spec.md` §12; 5 operational areas (`Overview \| Events \| Rooms \| Analytics \| Activity`) |
| Overview area | Agent 4 | `[x]` Integrated | `GET /api/analytics/overview`, `GET /api/activity` | `v2-ui-spec.md` §13; operational pulse metric tiles, recent activity feed, quick action shortcuts |
| Events area (manage/cancel) | Agent 4 | `[x]` Integrated | `PATCH /api/events/{event_id}` | `v2-ui-spec.md` §14; create event form + manage events with two-step inline cancellation |
| Rooms area (availability + booking) | Agent 4 | `[x]` Integrated | None beyond existing endpoints | `v2-ui-spec.md` §15; room availability query + book room with 409 conflict handling & pre-fill |
| Analytics area | Agent 4 | `[x]` Integrated | Analytics endpoints (Agent 2) | `v2-ui-spec.md` §16; readable operational tables for attendance, facility utilization, peak hours, and clubs |
| Activity area | Agent 4 | `[x]` Integrated | `GET /api/activity` | `v2-ui-spec.md` §17; chronological audit log of all recorded campus operations |
| Council-facing Genie → Action (Book Room pre-fill) | Agent 4 | `[x]` Integrated | Agent 1's row-shape work + Rooms area | `v2-ui-spec.md` §10; deep-links to `/admin?area=rooms&room_id=...` with pre-filled room |
| Frontend/backend integration (all four workstreams wired to real data) | Agent 4 | `[x]` Integrated | Agent 1/2/3 outputs | `v2-integration-plan.md` Phase 5; all 6 routes active with mock fallbacks and live API wiring |
| End-to-end testing (full matrix) | Agent 4 | `[x]` Verified | Integration above | Build passes (0 TS errors), pytest suite passes 44/44 tests |
| Deployment/readiness checks | Agent 4 | `[x]` Integrated | Integration above | `v2-integration-plan.md` §17; bundle packaged cleanly in `dist/` |

---

## Priority

### Must Ship
1. Role-aware student/council entry
2. Event Grid (default view)
3. Calendar view
4. Event Detail page
5. Campus Pulse
6. Genie → actionable results
7. Council Control Center (Overview, Events, Rooms)
8. Core campus analytics
9. Reliable server-side role enforcement (inherited from V1, must not regress)
10. Live data loop (both council-write and registration loops, inherited from V1, must not
    regress)

### Should Ship
- Activity/audit feed
- Better room discovery
- Event editing (cancel-only scope; full field editing is a `data-contracts.md`-amendment
  question, not V2 scope)
- Improved responsive behavior across all new surfaces
- Polished loading/empty/error states

### Nice to Have
- Personalization beyond optional name/email capture
- Notifications
- Campus SSO implementation
- Multi-campus setup
- Advanced/predictive analytics
- Other future product features (calendar export, SIS/LMS integration)

---

## Dependencies

```
V2 contracts (v2-product-plan.md, v2-api-contracts.md, v2-ui-spec.md)
    ↓
Data + Genie (Agent 1) / Backend (Agent 2)      ← parallel
    ↓
Student UI (Agent 3) / Council UI (Agent 4)     ← parallel, against contracts
    ↓
Integration (Agent 4)
    ↓
End-to-end testing
    ↓
Final polish
```

**Flagged blockers, using the actual current project state:**

| Item | Dependency | Current status |
|---|---|---|
| Original 10 Genie benchmarks | Manual Genie Space creation in Databricks UI | `[!]` Blocked — inherited from MVP, gates all V2 Genie work |
| All V2 Genie-dependent work (Campus Pulse, Analytics, Genie → Action) | Genie Space live + V2 benchmarks passing | `[!]` Blocked, transitively, on the item above |
| Calendar UI | `GET /api/events` `from`/`to` support + new `CalendarView` registry entry | `[ ]` Not started on either side |
| Analytics UI | Analytics API + Agent 1's query validation | `[ ]` Not started on either side |
| Genie → Action | Genie result row-shape reliability (Agent 1) + relevant backend write endpoint (already exists for booking; event creation already exists) | `[ ]` Not started |
| Campus Pulse | Validated live data queries (Agent 1) + `GET /api/campus/pulse` (Agent 2) | `[ ]` Not started on either side |
| `internships` documentation | None — can start immediately | `[ ]` Not started; blocks nothing else from starting, but blocks Agent 2/3 from treating the entity as a stable contract |

---

## Final Integration Checklist

### Student
- [ ] Student entry works
- [ ] Home loads real data
- [ ] Events Grid works
- [ ] Calendar works
- [ ] Event Detail works
- [ ] Registration works (existing external Google Form flow, unchanged)
- [ ] Genie works
- [ ] Genie results are grounded (evidence disclosure present on every `ok` answer)
- [ ] Genie actions work where applicable (View Event/Register; Book Room for council)
- [ ] Room availability works

### Council
- [ ] Council access works
- [ ] Control Center works
- [ ] Create event works (already Verified in V1; re-verify inside the new Control Center
      shell)
- [ ] Event management (cancel) works where implemented
- [ ] Room booking works (already Verified in V1; re-verify inside the new Control Center
      shell)
- [ ] Booking conflicts are prevented (already Verified in V1; must not regress)
- [ ] Analytics work
- [ ] Activity works if included

### Platform
- [ ] Role enforcement is server-side (already Verified in V1 for the two original write
      endpoints; must hold for every new V2 protected endpoint)
- [ ] Frontend does not access Databricks directly
- [ ] Genie remains read-only
- [ ] Backend owns writes
- [ ] Live updates propagate (both loops — see below)
- [ ] No critical API errors
- [ ] No critical console errors
- [ ] Production build succeeds

---

## Final Hackathon Demo Checklist

Demo flow (per `v2-integration-plan.md` §15):

```
Student
  ↓
Enter Campus Companion                       [ ] Working
  ↓
See Campus Pulse                              [ ] Working
  ↓
Browse events                                 [ ] Working
  ↓
Ask Genie a natural-language question         [ ] Working
  ↓
Receive grounded answer                       [ ] Working
  ↓
Take an appropriate action                    [ ] Working
  ↓
Council creates event / books room            [ ] Working
  ↓
Student sees updated state                    [ ] Working
  ↓
Genie can answer using the updated data       [ ] Working
```

None of the nine steps above are yet marked working for V2 — the underlying MVP
capabilities each step reuses (Genie Q&A, the booking conflict check, the live ingestion
loop) are already Verified per the MVP-era tables above; what remains is wiring V2's new
surfaces to them and re-verifying the full sequence end-to-end.

---

## Cut-If-Time-Runs-Out

Defer, in this order, if time becomes limited:

1. Advanced Activity/audit functionality
2. Advanced analytics (ship 2–3 strongest metrics rather than all of them)
3. Event editing beyond cancel-only
4. Advanced calendar features (ship a single-breakpoint week view first)
5. Extra event filtering (club/search)
6. Personalization
7. Notifications
8. Campus SSO implementation
9. Multi-campus infrastructure
10. Decorative/nonessential features

**Do not cut, under any time pressure:**
- Genie's core Q&A capability and grounding disclosure
- Event discovery (Grid, at minimum)
- Room availability
- Council event creation and room booking
- Server-side role enforcement
- The live data loop (council-write and registration loops)
- Core reliability (documented error/empty/conflict states on whatever is actually
  shipped)

---

## Rules for This File

1. This document is edited in place and always reflects current reality — it is not a
   changelog and is not versioned per hour.
2. The MVP-era sections (through the Decision Log) are historical record and are not
   rewritten; corrections or additions to that period are appended as new Decision Log
   rows, not edits to existing ones.
3. The V2 section tracks status, ownership, and blockers only — it does not restate
   product scope (`v2-product-plan.md`), API shapes (`v2-api-contracts.md`), UI behavior
   (`v2-ui-spec.md`), or workstream process (`v2-integration-plan.md`); it references them.
4. No task is marked `[x]` Complete unless the underlying context files or this file's own
   prior verification support that status — a task is never rounded up.
5. Each agent updates only their own workstream's rows; cross-cutting sections (Dependency
   table, checklists, Decision Log) are updated by whoever is present when the relevant
   status actually changes.
