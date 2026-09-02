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
| Current phase (per `build-plan.md`'s Phase Breakdown) | Phase 2: Foundational Build — Data Platform and Backend artifacts are drafted and locally validated; Frontend, Ingestion have not started |
| Current checkpoint | None evaluated yet — next is Checkpoint 1: Shared Foundation Readiness (retroactively: contracts were never re-negotiated, so this would pass trivially) |
| Overall status | In progress — Data Platform and Backend implemented (not yet integrated live); Frontend and Ingestion not started |
| Hours/stage remaining | Full 12 hours remaining |
| Core product flow status | Not started (no live Databricks connection yet — see blockers) |
| Genie status | Config drafted + proxy implemented, not live — see Genie Readiness |
| Integration status | No integration against a real Databricks workspace attempted yet. Backend's own internal wiring (routers → db.py/genie_client.py/auth.py, exception handling, static frontend mount) is exercised end-to-end via FastAPI's TestClient. |
| Testing status | Data Platform: seed data/schema validated by a standalone script. Backend: 43/43 pytest tests pass (overlap-formula boundary cases, auth/cookie tamper+expiry cases, contract-shape tests for all 8 endpoints with `db.py`/`genie_client.py` mocked). Nothing yet executed against a live Databricks warehouse or Genie Space. |
| Deployment status | Not deployed |
| Current blockers | No Databricks workspace credentials available in this environment — blocks both Data Platform and Backend from reaching Integrated/Verified status; see Blockers and Risks |
| Highest-priority next actions | 1. Get real Databricks workspace/warehouse credentials; run `data-platform/notebooks/*.sql`, configure the Genie Space, set the 8 env vars in `architecture.md`'s Environment Configuration table. 2. Point the backend at the live warehouse/Genie Space and re-run the 10 benchmarks + six core flows (Checkpoint 2). 3. Resolve the flagged `club` vs `club_id` contract discrepancy on `POST /api/events` (see Decision Log). 4. Frontend begins token config + shell primitives, building against `architecture.md`'s frozen contracts (including the `club`-field decision Backend made). 5. Ingestion begins Google Form setup. |

---

## Workstream Tracker

| Workstream | Owner | Task | Status | Dependency | Integration State | Verification | Blocker | Notes |
|---|---|---|---|---|---|---|---|---|
| Data Platform | Agent 1 | Schema DDL (7 tables) | Implemented | None | — | Validated by standalone parser (PK/FK integrity, CHECK/enum values, time-order constraints) — not yet executed against a live SQL warehouse | Blocked on Databricks credentials | `data-platform/notebooks/01_create_schema.sql`. Catalog/schema frozen as `campus_companion.campus` — see Decision Log. Zero drift from `data-contracts.md`. |
| Data Platform | Agent 1 | Seed data (all Synthetic Data Requirements scenarios) | Implemented | Schema DDL | — | Every scenario in data-contracts.md's Synthetic Data Requirements checked programmatically and passes (see script output referenced in Decision Log) | Blocked on Databricks credentials | `data-platform/notebooks/02_seed_data.sql`. 6 clubs, 20 students, 9 rooms, 12 events, 10 room_bookings, 19 teacher_timetable, 47 event_attendance. |
| Data Platform | Agent 1 | Column/table comments in Unity Catalog | Implemented | Schema DDL | — | — | Blocked on Databricks credentials | Embedded as inline `COMMENT` clauses in `01_create_schema.sql`; not yet confirmed visible in a live Unity Catalog. |
| Data Platform | Agent 1 | `room_is_free(room_id, ts)` trusted function | Implemented | Schema DDL | — | Logic hand-verified against seed data for all 3 smoke-test cases in the file (busy, boundary-free, never-booked) | Blocked on Databricks credentials | `data-platform/notebooks/03_trusted_functions.sql`. Not yet executed as a real Databricks SQL UDF. |
| Data Platform | Agent 1 | Genie Space configuration (instructions, synonyms) | Implemented (source files only) | Schema + comments | Not Integrated — no live Genie Space configured yet | — | Blocked on Databricks workspace access | `data-platform/genie/instructions.md`, `data-platform/genie/synonyms.md` written and ready to paste; not yet pasted into an actual Genie Space. |
| Data Platform | Agent 1 | Run + verify 10 benchmark questions | Blocked | Genie Space configured | — | Not run — expected answers hand-traced against seed data only (see `data-platform/benchmarks/question_sql_pairs.md`) | Blocked on Databricks workspace access | Gate before Backend integrates real Genie. Must be re-run live before this workstream can be marked Verified. |
| Backend | Agent 2 | Router scaffolding (all 8 endpoints) | Implemented | `architecture.md` contracts (frozen) | Verified by FastAPI TestClient against real route wiring (OpenAPI schema inspected: all 8 documented paths present) | All 43 pytest tests pass | — | `backend/app/routers/*.py`, `main.py`. Follows architecture.md's exact file mapping (bookings live in `rooms.py`, not a separate file). |
| Backend | Agent 2 | `db.py` core query functions incl. overlap formula | Implemented | `data-contracts.md` (frozen) | Not Integrated — written against real schema/column names from Data Platform's `01_create_schema.sql`, but never executed against a live SQL warehouse (no credentials in this environment) | Overlap formula unit-tested with boundary cases (11 tests, all pass); SQL query bodies not run live | Blocked on Databricks credentials (same blocker Data Platform recorded) | `backend/app/db.py`. Centralized `_instant_occupied()`/`_ranges_overlap()` predicates mirror Data Platform's `room_is_free()` exactly. |
| Backend | Agent 2 | `genie_client.py` Genie proxy | Implemented | Router scaffolding | Not Integrated — no live Genie Space call made | Method signatures (`start_conversation_and_wait`, `GenieMessage`, `GenieAttachment`, `get_message_attachment_query_result`) verified against the actually-installed `databricks-sdk` package via introspection, not against a live call | Blocked on Databricks credentials | `backend/app/genie_client.py`. Flagged in code comments as the first place to check during Checkpoint 2 if the installed SDK version differs. |
| Backend | Agent 2 | `auth.py` session + role verification | Implemented | Router scaffolding | — | 11 unit tests incl. tamper/expiry cases, all pass | — | `backend/app/auth.py`. HMAC-SHA256 signed cookie, no new dependency added. |
| Backend | Agent 2 | `POST /api/ingest/attendance` | Implemented | Router scaffolding | Not Integrated (no live warehouse) | Contract-shape tests pass (401/404/201 cases) | Blocked on Databricks credentials | `backend/app/routers/ingest.py` |
| Backend | Agent 2 | Wire real Databricks credentials | Not Started | Data Platform's published schema/Genie Space | — | — | Blocked on Databricks credentials | `config.py` reads all required env vars incl. `UNITY_CATALOG_SCHEMA=campus_companion.campus` (matches Data Platform's frozen name) but nothing has connected to a real workspace yet |
| Backend | Agent 2 | `pytest` suite (overlap formula, role checks, endpoint shapes) | Verified | Corresponding implementation | — | 43/43 tests pass (`backend/tests/`) | — | `test_overlap_logic.py`, `test_auth.py`, `test_contracts.py` |
| Backend | Agent 2 | Mount built frontend static assets | Implemented | Frontend build output | Not Integrated — Frontend workstream hasn't produced `frontend/dist` yet | Confirmed the app boots correctly in its absence (falls back to API-only mode, logs it, does not crash) | — | `backend/app/main.py`; mounts `frontend/dist` at `/` if present, guarded by an existence check |
| Frontend | Agent 3 | Token config (`tokens.css`, `tailwind.config.ts`, `tokens.ts`) | Not Started | `ui-tokens.md` (frozen) | — | — | — | Can start immediately |
| Frontend | Agent 3 | Shell / TopBar / Container / Section / PageHeader | Not Started | Token config | — | — | — | |
| Frontend | Agent 3 | Generic components (Button, FormField, Table, Card, StatusIndicator, Banner, Skeleton, AccessCodeModal) | Not Started | Shell primitives | — | — | — | Per `ui-registry.md` |
| Frontend | Agent 3 | `api/client.ts` (mock-backed initially) | Not Started | `architecture.md` contracts (frozen) | — | — | — | |
| Frontend | Agent 3 | Ask Genie surface (chat container, message, input, chips, evidence disclosure, result table) | Not Started | Generic components | — | — | — | First page to integrate against real Backend |
| Frontend | Agent 3 | Newsletter Home (event grid, room availability, polling) | Not Started | Generic components | — | — | — | |
| Frontend | Agent 3 | Admin Panel (both write forms, RoleGate) | Not Started | Generic components + AccessCodeModal | — | — | — | |
| Ingestion & Integration | Agent 4 | Google Form + linked Sheet | Not Started | None | — | — | — | Can start immediately |
| Ingestion & Integration | Agent 4 | Apps Script (`on_form_submit.gs`) against local stub | Not Started | Form created | — | — | — | |
| Ingestion & Integration | Agent 4 | Re-point Apps Script to real ingestion endpoint | Not Started | Backend's `/api/ingest/attendance` live | — | — | — | |
| Ingestion & Integration | Agent 4 | `form-config-notes.md` + `demo-script.md` | Not Started | Form + Apps Script working | — | — | — | |
| Ingestion & Integration | Agent 4 | Databricks Apps deployment | Not Started | Frontend + Backend merged | — | — | — | |
| Ingestion & Integration | Agent 4 | Six-flow walkthrough against deployed URL | Not Started | Deployment complete | — | — | — | |

---

## Phase Tracker

| Phase | Objective | Status | Required Before Next Phase | Integration Result | Verification Result | Notes |
|---|---|---|---|---|---|---|
| 1. Contract Confirmation and Environment Setup | Zero ambiguity on interfaces; all toolchains running | Not Started | All four agents confirm no open contract questions | N/A | N/A | |
| 2. Foundational Build | Each workstream produces its load-bearing artifact in isolation | Not Started | Each artifact runs locally and matches documented shape | N/A | N/A | |
| 3. Vertical Slice Integration | Prove the full stack works on one real path | Not Started | The one benchmark question returns a correct, grounded, evidenced answer | Not attempted | Not attempted | This is Checkpoint 2 |
| 4. Feature Buildout | Complete all Must Ship + Should Ship functionality | Not Started | All six core flows implementable locally | Not attempted | Not attempted | |
| 5. Full Integration and Deployment | Merge everything; deploy; validate six flows on deployed build | Not Started | All six flows pass on deployed URL | Not attempted | Not attempted | This is Checkpoint 4 |
| 6. Hardening | Stabilize deployed build; re-verify benchmarks | Not Started | All ten benchmarks + six flows pass | Not attempted | Not attempted | This is Checkpoint 5 |
| 7. Demo Preparation | Protect the demo — no functional changes | Not Started | Two consecutive clean full-demo dry runs | Not attempted | Not attempted | Terminal phase |

---

## Feature Tracker

### Must Ship

| Feature | Owner/Workstream | Implementation | Integration | Verification | Dependencies | Blocker |
|---|---|---|---|---|---|---|
| NL Q&A via Genie (room/teacher/attendance) | Data Platform + Backend + Frontend | Not Started | Not Started | Not Started | Genie Space configured; `/api/genie/ask`; Ask Genie UI | — |
| Visible grounding/SQL basis on Genie answers | Frontend + Backend | Not Started | Not Started | Not Started | Genie proxy returns `sql`/`rows` | — |
| Event registration via Google Form | Ingestion | Not Started | Not Started | Not Started | `/api/ingest/attendance` live | — |
| Live-update loop (registration → visible count change) | Ingestion + Backend + Frontend | Not Started | Not Started | Not Started | Ingestion path + Newsletter Home polling | — |
| Newsletter view (events + room availability) | Frontend + Backend | Not Started | Not Started | Not Started | `GET /api/events`, `GET /api/rooms/availability` | — |
| Role-restricted room booking | Backend + Frontend | Not Started | Not Started | Not Started | `POST /api/bookings`, AccessCodeModal | — |
| Role-restricted event creation | Backend + Frontend | Not Started | Not Started | Not Started | `POST /api/events`, AccessCodeModal | — |
| Server-side role enforcement on writes | Backend | Not Started | Not Started | Not Started | `auth.py` | — |

### Should Ship

| Feature | Owner/Workstream | Implementation | Integration | Verification | Dependencies | Blocker |
|---|---|---|---|---|---|---|
| Dedicated Ask Genie chat surface (own frontend) | Frontend | Not Started | Not Started | Not Started | GenieChatContainer + components | — |
| Room-booking conflict prevention (409 handling) | Backend + Frontend | Not Started | Not Started | Not Started | `db.py` overlap check | — |
| Student-vs-council UI distinction | Frontend | Not Started | Not Started | Not Started | RoleGate, AccessCodeModal | — |

### Nice to Have

| Feature | Owner/Workstream | Implementation | Integration | Verification | Dependencies | Blocker |
|---|---|---|---|---|---|---|
| Multi-step/agentic Genie answers | Data Platform + Backend | Not Started | Not Started | Not Started | Core Genie path verified first | — |
| Visual charts/graphs in newsletter view | Frontend | Not Started | Not Started | Not Started | Newsletter Home complete | — |
| Editing existing events/bookings | Backend + Frontend | Not Started | Not Started | Not Started | Create flows complete | — |
| Visible audit trail of governed writes | Frontend + Backend | Not Started | Not Started | Not Started | Write endpoints complete | — |

### Cut First (pre-declared cut order, not yet cut)

| Item | Cut order | Status |
|---|---|---|
| Any unstarted Nice to Have item | 1 | Not Cut |
| Polished empty/loading-state animation beyond the one documented flash | 2 | Not Cut |
| Ask Genie suggested-question-chip empty state | 3 | Not Cut |
| Room-booking conflict UI polish (keep 409 enforcement) | 4 | Not Cut |
| Multi-column responsive polish beyond `--bp-lg` | 5 | Not Cut |

---

## Genie Readiness

| Milestone | Status | Notes |
|---|---|---|
| Data available (7 tables seeded per Synthetic Data Requirements) | Implemented (not yet live) | `data-platform/notebooks/02_seed_data.sql`; every required scenario verified by a standalone parser script, not by a live warehouse query. |
| Genie Space created/configured | Not Started | Requires an actual Databricks workspace session — blocked in this environment. |
| Instructions configured (verbatim from `genie.md`) | Implemented (not yet pasted) | Ready-to-paste text at `data-platform/genie/instructions.md`. |
| Synonyms configured | Implemented (not yet pasted) | Ready-to-paste table at `data-platform/genie/synonyms.md`. |
| Trusted SQL function (`room_is_free`) created and wired into Genie Space | Implemented (not yet live) | `data-platform/notebooks/03_trusted_functions.sql`; not yet run as a real Databricks SQL UDF or registered in a Genie Space. |
| Representative queries working (10 benchmarks, tested in Databricks UI) | Blocked | Required before Checkpoint 2. Reference SQL + hand-traced expected answers in `data-platform/benchmarks/question_sql_pairs.md`; not yet run live. See Blockers and Risks. |
| Boundary-time / half-open-interval case tested (benchmark #9) | Blocked | Expected answer traced and cross-checked programmatically against the seed data (Lab 204 free at exactly its booking's end instant) — not run against live Genie. |
| Out-of-scope question correctly declined (benchmark #10) | Blocked | Instructions include an explicit refusal rule; not run against live Genie. |
| Ambiguous-question handling tested (missing name/time) | Not Started | Instructions include the rule (assume today if no date; ask for teacher name/time if missing); no live test yet. |
| Backend proxy (`/api/genie/ask`) integrated against real Genie Space | Implemented, not yet integrated | `backend/app/genie_client.py` + `backend/app/routers/genie.py` are complete and contract-shape tested (mocked). Never called a real Genie Space — this is still Checkpoint 2's job. |
| Frontend integration working (Ask Genie renders real answers + evidence) | Not Started | Frontend workstream not started. |
| End-to-end Genie flow verified on deployed build | Not Started | Required before Checkpoint 5 passes. |

**Genie is the product's central value proposition** (per `project-overview.md` and
`architecture.md` Invariant 1) — this section should never lag behind the rest of the
tracker in attention, even if its literal checkpoint timing comes after Data Platform's
initial schema work.

---

## Integration Checkpoints

| Checkpoint | Target | Status | What Was Integrated | Tests Passed | Blockers | Decision |
|---|---|---|---|---|---|---|
| 1. Shared Foundation Readiness | Hour 0:45 | Pending | N/A (readiness check, not a merge) | N/A | — | — |
| 2. First End-to-End Path (Vertical Slice) | Hour 3:30–4:15 | Pending | — | — | — | — |
| 3. Core Feature Integration | Hour 7:00–7:30 | Pending | — | — | — | — |
| 4. Final Feature Integration (Deployment) | Hour 9:00 | Pending | — | — | — | — |
| 5. Final System Validation | Hour 10:30 | Pending | — | — | — | — |

**Checkpoint status values:** `Pending` (not yet reached), `Ready` (reached, about to be
evaluated), `Passed`, `Failed`, `Skipped` (explicitly, with reason recorded in Notes/
Decision Log — never silently), `Repeated` (failed once, re-attempted after a fix).

---

## Testing Tracker

| Category | Status | Latest Result | Known Failures | Owner | Next Action |
|---|---|---|---|---|---|
| Data validation (seed data satisfies all required scenarios) | Not Started | — | — | Data Platform | Run seed script, spot-check against `data-contracts.md` Synthetic Data Requirements |
| Frontend validation (component states manually exercised) | Not Started | — | — | Frontend | Exercise each registered component's default/loading/empty/error states as built |
| Backend/API validation (`pytest` contract-shape tests) | Passing (mocked) | 43/43 tests pass in `backend/tests/` (`test_overlap_logic.py`, `test_auth.py`, `test_contracts.py`) — `db.py`/`genie_client.py` are monkeypatched, so this validates routing/contract-shape/role-enforcement, not live Databricks connectivity | None known against the mocked surface | Backend | Re-run against real `db.py`/`genie_client.py` once Databricks credentials exist (Checkpoint 2) |
| Genie validation (10 benchmarks) | Not Started | — | — | Data Platform | Run in Databricks UI once Genie Space configured |
| Authorization validation (student blocked, council allowed) | Passing (unit + contract-shape) | `test_auth.py` (11 tests: valid/missing/malformed/tampered/expired cookies) and `test_contracts.py` (403 without a council cookie, 201 with one) all pass | None known | Backend | Manual confirmation against the real deployed app still required at Checkpoint 3 |
| Integration testing (per checkpoint) | Not Started | — | — | All | Run at each Integration Checkpoint above |
| End-to-end testing (six core flows) | Not Started | — | — | All | Walk manually at Checkpoints 3, 4, 5 |
| Regression testing (after schema/shared-component changes) | Not Started | — | — | Owning workstream | Re-walk affected flow(s) before next checkpoint |
| Deployment/runtime validation | Not Started | — | — | Ingestion & Integration | First deploy attempt as soon as any backend+frontend build exists |

---

## Blockers and Risks

| Issue | Severity | Affected Workstream | Blocking? | Owner | Action | Status |
|---|---|---|---|---|---|---|
| No Databricks workspace/SQL warehouse credentials available in the current environment (no `databricks` CLI, no `.databrickscfg`, no `DATABRICKS_*` env vars) | High | Data Platform and Backend (both directly — neither can reach a real warehouse/Genie Space); Frontend, Ingestion (downstream) | Yes — blocks moving any Data Platform or Backend task from Implemented to Integrated/Verified, and blocks Checkpoint 2 (First End-to-End Path) entirely | Data Platform, Backend | Data Platform's SQL/config artifacts and Backend's `db.py`/`genie_client.py` are both authored and unit/contract tested with mocks instead of a live connection (43 backend pytest tests pass; see `data-platform/README.md` and this file's Backend workstream rows). Needs a human with real workspace access to: run `data-platform/notebooks/*.sql`; configure the Genie Space; set the 8 required env vars from `architecture.md`'s Environment Configuration table; then run the backend against the real warehouse/Genie Space and re-walk the 10 benchmarks plus the six core flows. | Open |

*Add a row the moment a blocker is identified. Mark `Status` as `Resolved` in place once
fixed — do not delete the row.*

---

## Scope Cuts

| Item | Reason | Decision Point | Impact | Restorable if Time Permits? |
|---|---|---|---|---|
| *(none cut yet)* | — | — | — | — |

*Populate this table only when a real cut decision is made, per `build-plan.md`'s Scope
Control Rules. Anything listed in the pre-declared Cut First order above is not yet cut
until it appears here.*

---

## Handoff Log

| From Workstream | To Workstream | What Was Delivered | Interfaces/Contracts Involved | Tests Performed | Known Limitations | Remaining Work |
|---|---|---|---|---|---|---|
| *(no handoffs recorded yet)* | | | | | | |

*Add a row at each meaningful handoff — e.g. Data Platform publishing final table names to
Backend, Backend's Genie proxy going live for Frontend, Backend + Frontend merged build
going to Ingestion for deployment.*

---

## Decision Log

| Decision | Reason | Affected Workstreams | Date/Time | Context Files Needing Update? |
|---|---|---|---|---|
| Fully qualified Unity Catalog schema frozen as `campus_companion.campus` | `architecture.md` and `data-contracts.md` describe the schema as `<catalog>.campus` without naming a concrete catalog; a concrete name was needed to write runnable DDL and for Backend's `UNITY_CATALOG_SCHEMA` env var | Data Platform, Backend | 2026-09-02 | No — consistent with the `<catalog>.campus` pattern already documented in `architecture.md`; Backend should set `UNITY_CATALOG_SCHEMA=campus_companion.campus` when it configures `config.py`. |
| Timestamp columns implemented as `TIMESTAMP_NTZ` rather than `TIMESTAMP` | `data-contracts.md`'s Time semantics require campus-local timestamps with no timezone offset stored or assumed; Databricks `TIMESTAMP` carries an implicit session-timezone conversion, `TIMESTAMP_NTZ` does not | Data Platform, Backend | 2026-09-02 | No — this is an implementation detail of the DDL, not a change to the documented field name/semantics in `data-contracts.md`. Backend's `db.py` should read/write these columns without applying any timezone conversion. |
| **FLAGGED, NOT RESOLVED:** `POST /api/events` request/response field is `club` (a club NAME, e.g. `"AI Club"`) per `architecture.md`'s literal Integration Contract JSON, but `data-contracts.md`'s Write Contracts section for the same operation says required inputs are `name, club_id, start_ts` (an ID, not a name). Backend implemented `architecture.md`'s literal frozen field name (`club`), resolving it server-side via a case-insensitive exact match against `clubs.name` (rejecting with a 422 if not found or the club is inactive) — per AGENTS.md's authority order, `architecture.md` outranks `data-contracts.md` for API/technical-architecture questions, and code-standards.md explicitly calls the Integration Contracts' field names frozen. This is flagged, not silently picked — Frontend must send `club` (the name string), not `club_id`, when building the Admin Panel's create-event form; if that's wrong, the fix is to update `architecture.md`'s contract text first, then this code, not the other way around. | Backend (implemented), Frontend (must build against this), Data Platform (contract text) | 2026-09-02 | Possibly — `architecture.md` and/or `data-contracts.md` should be reconciled explicitly by whoever owns that decision; not changed unilaterally here. |
| `POST /api/events` and `POST /api/bookings` return `422 {"error": "<reason>"}` (e.g. `room_not_found`, `club_not_found`, `event_not_found`) for an unknown foreign-key reference in the request body | `architecture.md`'s Integration Contracts only document 403/409/502 for these two endpoints — an FK-not-found case (distinct from a booking conflict) isn't covered by any documented status/shape. `data-contracts.md` requires such a write to be "rejected with the documented error shape," but no shape is actually documented for this case. | Backend, Frontend (must handle a 422 from these two endpoints) | 2026-09-02 | Should be — this is a genuine gap in `architecture.md`'s Integration Contracts, not just an implementation choice; consider adding it there explicitly. |
| `genie_client.py`'s use of `databricks-sdk`'s Genie Conversation API (`start_conversation_and_wait`, `GenieMessage.attachments`, `get_message_attachment_query_result`, etc.) was verified by installing `databricks-sdk` and introspecting the actual installed package's method signatures and dataclass fields — not by calling a real Genie Space, since no workspace credentials exist in this environment | Getting the Genie proxy right matters most (build-plan.md's Critical Path item #3); guessing at an unverified SDK surface was judged too risky | Backend | 2026-09-02 | No — but re-verify against whatever `databricks-sdk` version actually gets pinned/deployed; flagged in code comments in `genie_client.py` as the first place to check if Checkpoint 2 integration fails. |

*Only record decisions that change or clarify something another agent needs to know —
not general notes. If a decision changes a documented contract, the "Context Files
Needing Update?" column must name the file and it must actually be updated, per
`build-plan.md` Rule 10.*

---

## Final Demo Readiness

| Item | Status | Evidence |
|---|---|---|
| Application launches from the deployed URL | Not Verified | |
| Core navigation works (Home / Ask Genie / Council access) | Not Verified | |
| Core data is available (all 7 tables seeded correctly) | Not Verified | |
| Genie works (Genie Space live and responding) | Not Verified | |
| Representative Genie queries work (10 benchmarks) | Not Verified | |
| Attendance flow works (Form → live count update) | Not Verified | |
| Booking flow works (council can book a room, conflict rejected) | Not Verified | |
| Event creation flow works (council can create an event) | Not Verified | |
| Teacher availability works | Not Verified | |
| Room availability works | Not Verified | |
| Authorization works (student blocked from writes, verified directly) | Not Verified | |
| Error states do not break the demo (`no_answer`/`error`/`empty`/`conflict` all render correctly) | Not Verified | |
| Frontend is visually consistent with `ui-tokens.md`/`ui-rules.md` | Not Verified | |
| Deployment/runtime is stable (not local dev server) | Not Verified | |
| Demo path has been rehearsed (two clean dry runs) | Not Verified | |
| No known critical (Must Ship) blocker remains | Not Verified | |

**The project is not demo-ready until every row above reads `Verified`, not just
`Implemented` or `Integrated`.** This checklist is only filled in during Phase 6/7 —
marking any row `Verified` earlier than that misrepresents the project's actual state.

---

## Update Rules

1. Update status the moment work meaningfully changes — don't batch updates for later.
2. Do not mark work `Integrated` until it actually works with its required real
   dependencies (not mocks).
3. Do not mark work `Verified` without the relevant validation actually having been run.
4. Record blockers as soon as they become known, in Blockers and Risks.
5. Record scope cuts explicitly, in Scope Cuts — never just stop working on something
   silently.
6. Keep ownership clear — only the owning agent updates their workstream's rows.
7. Do not silently change another workstream's status — if you observe something that
   changes another workstream's state (e.g. you found their endpoint broken), add a
   Blockers and Risks row and flag it, don't edit their row yourself.
8. Update checkpoint status immediately after checkpoint evaluation, not "at the end of
   the phase."
9. Keep notes concise and actionable — a phrase, not a paragraph.
10. Prefer accurate status over optimistic status, always — a truthful `Blocked` is more
    useful to the team than an aspirational `Implemented`.

---

## Rules for This File

1. This file records actual project progress as it happens.
2. `build-plan.md` remains authoritative for intended sequencing, ownership, and
   checkpoint definitions — this file records outcomes against that plan, it does not
   redefine it.
3. `architecture.md` remains authoritative for architecture.
4. `data-contracts.md` remains authoritative for data semantics.
5. `genie.md` remains authoritative for Genie configuration/behavior.
6. `ui-tokens.md`, `ui-rules.md`, and `ui-registry.md` remain authoritative for UI
   decisions.
7. This tracker must not become a duplicate of those documents — it references them, it
   does not restate their content.
8. Status recorded here must reflect reality at the moment of updating, not intended or
   hoped-for progress.
9. Integration and verification are tracked as distinct from implementation, always — see
   Status Definitions.
10. Blockers and scope cuts must be visible here the moment they're known, not discovered
    retroactively during Final Demo Readiness.
11. This tracker remains useful under hackathon time pressure — quick to scan, quick to
    update, no ceremony beyond what's defined above.
