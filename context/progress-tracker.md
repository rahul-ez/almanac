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
| Current phase (per `build-plan.md`'s Phase Breakdown) | Phase 2: Foundational Build (Frontend complete; awaiting Backend, Data Platform, Ingestion) |
| Current checkpoint | Checkpoint 1 passed (Frontend toolchain running). Next: Checkpoint 2 — Vertical Slice Integration |
| Overall status | In Progress |
| Hours/stage remaining | Proceeding to Phase 3 vertical slice once Backend endpoints live |
| Core product flow status | Frontend mock-backed; awaiting real Backend |
| Genie status | Not started — see Genie Readiness |
| Integration status | No integration attempted yet — Frontend built against mocks |
| Testing status | Frontend: manual component state verification passed (default/loading/empty/error). TypeScript: clean (0 errors). No backend tests yet. |
| Deployment status | Not deployed |
| Current blockers | None |
| Highest-priority next actions | 1. Backend agent: bring /api/genie/ask live. 2. Frontend: swap USE_MOCK to false in client.ts and test vertical slice (Checkpoint 2). 3. Data Platform: confirm GENIE_SPACE_ID. |

---

## Workstream Tracker

| Workstream | Owner | Task | Status | Dependency | Integration State | Verification | Blocker | Notes |
|---|---|---|---|---|---|---|---|---|
| Data Platform | Agent 1 | Schema DDL (7 tables) | Not Started | None | — | — | — | |
| Data Platform | Agent 1 | Seed data (all Synthetic Data Requirements scenarios) | Not Started | Schema DDL | — | — | — | |
| Data Platform | Agent 1 | Column/table comments in Unity Catalog | Not Started | Schema DDL | — | — | — | |
| Data Platform | Agent 1 | `room_is_free(room_id, ts)` trusted function | Not Started | Schema DDL | — | — | — | |
| Data Platform | Agent 1 | Genie Space configuration (instructions, synonyms) | Not Started | Schema + comments | — | — | — | |
| Data Platform | Agent 1 | Run + verify 10 benchmark questions | Not Started | Genie Space configured | — | — | — | Gate before Backend integrates real Genie |
| Backend | Agent 2 | Router scaffolding (all endpoints, mock data) | Not Started | `architecture.md` contracts (frozen) | — | — | — | Can start immediately |
| Backend | Agent 2 | `db.py` core query functions incl. overlap formula | Not Started | `data-contracts.md` (frozen) | — | — | — | |
| Backend | Agent 2 | `genie_client.py` Genie proxy | Not Started | Router scaffolding | — | — | — | Real wiring needs Data Platform's `GENIE_SPACE_ID` |
| Backend | Agent 2 | `auth.py` session + role verification | Not Started | Router scaffolding | — | — | — | |
| Backend | Agent 2 | `POST /api/ingest/attendance` | Not Started | Router scaffolding | — | — | — | |
| Backend | Agent 2 | Wire real Databricks credentials | Not Started | Data Platform's published schema/Genie Space | — | — | — | |
| Backend | Agent 2 | `pytest` suite (overlap formula, role checks, endpoint shapes) | Not Started | Corresponding implementation | — | — | — | |
| Backend | Agent 2 | Mount built frontend static assets | Not Started | Frontend build output | — | — | — | Needed before deploy |
| Frontend | Agent 3 | Token config (`tokens.css`, `tailwind.config.ts`, `tokens.ts`) | Implemented | `ui-tokens.md` (frozen) | — | Verified locally (TypeScript clean, renders correctly) | — | Vite project at `frontend/`. Tailwind v3. |
| Frontend | Agent 3 | Shell / TopBar / Container / Section / PageHeader | Implemented | Token config | — | Verified locally | — | Skip link, sticky nav, 3 routes |
| Frontend | Agent 3 | Generic components (Button, FormField, Table, Card, StatusIndicator, Banner, Skeleton, AccessCodeModal) | Implemented | Shell primitives | — | Verified locally | — | Per `ui-registry.md` |
| Frontend | Agent 3 | `api/client.ts` (mock-backed initially) | Implemented | `architecture.md` contracts (frozen) | — | Verified locally with mock data | — | USE_MOCK=true; swap to false when Backend live |
| Frontend | Agent 3 | Ask Genie surface (chat container, message, input, chips, evidence disclosure, result table) | Implemented | Generic components | — | Verified locally | — | First page to integrate against real Backend |
| Frontend | Agent 3 | Newsletter Home (event grid, room availability, polling) | Implemented | Generic components | — | Verified locally (15s poll, visibilitychange pause) | — | |
| Frontend | Agent 3 | Admin Panel (both write forms, RoleGate) | Implemented | Generic components + AccessCodeModal | — | Verified locally (RoleGate, both forms render) | — | |
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
| Data available (7 tables seeded per Synthetic Data Requirements) | Not Started | |
| Genie Space created/configured | Not Started | |
| Instructions configured (verbatim from `genie.md`) | Not Started | |
| Synonyms configured | Not Started | |
| Trusted SQL function (`room_is_free`) created and wired into Genie Space | Not Started | |
| Representative queries working (10 benchmarks, tested in Databricks UI) | Not Started | Required before Checkpoint 2 |
| Boundary-time / half-open-interval case tested (benchmark #9) | Not Started | |
| Out-of-scope question correctly declined (benchmark #10) | Not Started | |
| Ambiguous-question handling tested (missing name/time) | Not Started | |
| Backend proxy (`/api/genie/ask`) integrated against real Genie Space | Not Started | This is Checkpoint 2 |
| Frontend integration working (Ask Genie renders real answers + evidence) | Not Started | |
| End-to-end Genie flow verified on deployed build | Not Started | Required before Checkpoint 5 passes |

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
| Backend/API validation (`pytest` contract-shape tests) | Not Started | — | — | Backend | Write test per endpoint alongside its implementation |
| Genie validation (10 benchmarks) | Not Started | — | — | Data Platform | Run in Databricks UI once Genie Space configured |
| Authorization validation (student blocked, council allowed) | Not Started | — | — | Backend | `pytest` for `auth.py`; manual confirmation at Checkpoint 3 |
| Integration testing (per checkpoint) | Not Started | — | — | All | Run at each Integration Checkpoint above |
| End-to-end testing (six core flows) | Not Started | — | — | All | Walk manually at Checkpoints 3, 4, 5 |
| Regression testing (after schema/shared-component changes) | Not Started | — | — | Owning workstream | Re-walk affected flow(s) before next checkpoint |
| Deployment/runtime validation | Not Started | — | — | Ingestion & Integration | First deploy attempt as soon as any backend+frontend build exists |

---

## Blockers and Risks

| Issue | Severity | Affected Workstream | Blocking? | Owner | Action | Status |
|---|---|---|---|---|---|---|
| *(none recorded yet)* | — | — | — | — | — | — |

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
| *(no decisions recorded yet)* | | | | |

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
