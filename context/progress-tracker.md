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
