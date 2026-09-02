# Build Plan

## Build Strategy

Campus Companion is built by four agents on four laptops, working in parallel for 12
hours. The plan exists to get maximum simultaneous progress without four people quietly
building four things that don't fit together at hour 11.

**Why parallel workstreams.** The product decomposes cleanly along
`architecture.md`'s existing boundaries — Data Platform (schema, seed data, Genie Space),
Backend (API + Genie proxy + writes), Frontend (three pages, shared components), and
Ingestion & Integration (Google Form wiring, deployment, demo rehearsal). Each owns
distinct files and a distinct layer of the stack, so the main risk isn't code collision —
it's *interface* drift: one agent's assumption about a field name, a contract shape, or a
component prop silently diverging from another's.

**What must be established before anyone diverges.** Two things, and both already exist
before hour 0: the REST contracts in `architecture.md`'s Integration Contracts section, and
the schema in `data-contracts.md`. These are frozen inputs, not decisions made during the
build. Because they're already written and reviewed, all four agents can start
simultaneously at hour 0 — nobody is blocked waiting for someone else to "design the API
first." The only genuinely sequential dependency is that Backend's endpoints aren't
*complete* until Data Platform's table names and Genie Space ID are frozen — but Backend
scaffolds every endpoint against the documented contract shape immediately, so this
dependency is soft, not blocking (see Dependency Graph).

**How agents work independently.** Each workstream owns a distinct folder
(`data-platform/`, `backend/`, `frontend/`, `ingestion/` + `deploy/`) per
`architecture.md`'s System Boundaries table, and Backend's Integration Contracts are the
only surface Frontend and Ingestion build against — never Backend's in-progress
implementation. Frontend can build its entire UI against mocked responses matching the
documented shapes before a real backend exists.

**How integration checkpoints work.** Integration is not a single event at hour 11 — it's
five scheduled points (see Integration Checkpoints) where workstream branches merge into
`main` and the team walks through real user flows against the merged result. Each
checkpoint has explicit pass criteria. A checkpoint that fails doesn't halt the whole team;
it triggers a scoped fix with a hard time box, falling back to a simplified version of the
failing piece rather than blocking the other three agents.

**How this protects against late-stage integration failure.** The single highest-risk
failure mode in a four-laptop hackathon is "everything worked alone, nothing works
together, discovered at hour 11." This plan prevents that specifically by forcing a working
(if minimal) end-to-end path to exist by hour 4 (see End-to-End Vertical Slice) — long
before feature work is finished — so integration problems surface while there's still slack
to fix them, not during the final hour.

**How scope is reduced if the team falls behind.** Feature Prioritization below defines a
strict cut order (Nice to Have → Should Ship → simplify Must Ship's edges) evaluated at
every checkpoint, not just at the end. The person merging at a checkpoint has the authority
to declare a cut on the spot per Scope Control Rules — waiting for consensus mid-build costs
more time than it saves.

---

## 12-Hour Execution Model

Times are a clock starting at Hour 0 and are ranges, not minute-level commitments — a team
running 30–45 minutes ahead or behind at any stage should adjust the next stage's scope, not
the schedule.

### 1. Foundation — Hour 0 to Hour 0:45
- **Objective:** Freeze the shared contracts everyone builds against; confirm every agent
  can run their toolchain.
- **Activities:** All four agents read `project-overview.md`, `architecture.md`,
  `data-contracts.md`, `genie.md`, and the UI files once, together, out loud if useful.
  Confirm the Integration Contracts and table/column names need no changes before work
  starts (they shouldn't — these are already complete inputs). Each agent sets up their
  local environment (Python/FastAPI, Node/Vite, Databricks CLI/workspace access, Google
  account for Apps Script).
- **Agents involved:** All four.
- **Expected output:** Four working local dev environments; zero open questions about
  contract shapes.
- **Checkpoint/exit criteria:** Every agent can state, without looking it up, what their
  workstream owns and which two files are their contract with their nearest neighbor.

### 2. Parallel Implementation (Core) — Hour 0:45 to Hour 3:30
- **Objective:** Build the load-bearing pieces of each workstream in isolation, against the
  frozen contracts.
- **Activities:** Data Platform creates schema + seed data + starts Genie Space
  configuration. Backend scaffolds every router with the documented request/response
  shapes (mocked data initially where Data Platform isn't ready yet), builds `auth.py` and
  `db.py`'s core query functions. Frontend builds the Shell, TopBar, Container/Section
  primitives, and the core `ui-registry.md` components (Card, Table, Button, FormField)
  against mocked API responses. Ingestion sets up the Google Form + Sheet and stubs the
  Apps Script trigger against a placeholder endpoint.
- **Agents involved:** All four, independently.
- **Expected output:** A runnable (if disconnected) version of each layer.
- **Checkpoint/exit criteria:** Data Platform's tables exist with seed data; Backend's
  endpoints return correctly-shaped mock/real responses; Frontend renders all three page
  shells with mock data; Ingestion's form submits and the Apps Script trigger fires
  (against a stub).

### 3. First Integration — Hour 3:30 to Hour 4:15
- **Objective:** Prove the full stack works end-to-end on the single simplest real path
  before building anything else (see End-to-End Vertical Slice).
- **Activities:** Backend connects to the real seeded Databricks tables and the real Genie
  Space. Frontend swaps its Ask Genie page from mocks to the real `/api/genie/ask`
  endpoint. One question ("Is Lab 204 available right now?") is walked through the full
  path: browser → backend → Genie → SQL warehouse → back to browser, rendered with its
  evidence disclosure.
- **Agents involved:** Backend + Frontend actively; Data Platform on standby to fix
  Genie/schema issues live; Ingestion continues independently.
- **Expected output:** One real question, asked in the real UI, answered from real data,
  with the SQL basis visible.
- **Checkpoint/exit criteria:** The vertical slice works, or the specific break point
  (Genie config, backend proxy, frontend rendering) is identified and assigned a fix owner
  before moving on.

### 4. Feature Completion — Hour 4:15 to Hour 7:30
- **Objective:** Build out the remaining Must Ship and Should Ship features on each
  workstream now that the core path is proven.
- **Activities:** Backend completes the remaining read endpoints and both write endpoints
  (bookings, events) with role enforcement and conflict checking. Frontend completes
  Newsletter Home (event grid, room availability table, live polling) and the Admin Panel
  (both governed-write forms, access-code modal). Data Platform finishes trusted SQL
  function, synonyms, and runs the full benchmark set. Ingestion finalizes the Apps Script
  → real ingestion endpoint wiring and does a first real form-submission test.
- **Agents involved:** All four, mostly independently, with Backend and Frontend
  coordinating closely as endpoints come online.
- **Expected output:** Every Must Ship feature implemented (not yet fully integrated) per
  workstream.
- **Checkpoint/exit criteria:** See Integration Checkpoint "Core Feature Integration."

### 5. End-to-End Integration — Hour 7:30 to Hour 9:00
- **Objective:** Merge everything into `main` and walk every one of the six core user flows
  from `project-overview.md` against the fully integrated system.
- **Activities:** All branches merge in dependency order. The team walks: ask a question,
  check room availability, check teacher availability, register for an event and observe
  the live count update, book a room as council, browse the newsletter view. Bugs found are
  triaged immediately by workstream owner.
- **Agents involved:** All four.
- **Expected output:** A single deployed (or locally running, pre-deploy) build where all
  six flows work end-to-end.
- **Checkpoint/exit criteria:** See Integration Checkpoint "Final Feature Integration."

### 6. Testing and Debugging — Hour 9:00 to Hour 10:30
- **Objective:** Find and fix what integration exposed; re-run the Genie benchmark set and
  the six core flows against the deployed environment specifically (not just local).
- **Activities:** Deploy to Databricks Apps if not already done. Re-run all `pytest`
  suites. Re-run the ten Genie benchmarks from `genie.md` against the live Genie Space.
  Fix bugs in priority order: anything breaking a Must Ship flow first, cosmetic issues
  last.
- **Agents involved:** All four — this is not a single-agent QA pass.
- **Expected output:** A stable, deployed build with no known Must Ship breakage.
- **Checkpoint/exit criteria:** See Integration Checkpoint "Final System Validation."

### 7. Polish and Demo Preparation — Hour 10:30 to Hour 12:00
- **Objective:** Protect the demo. No new functionality — see Final 60–90 Minutes for the
  detailed breakdown of this stage's tail end.
- **Activities:** UI consistency pass against `ui-tokens.md`/`ui-rules.md`; rehearse the
  live demo script at least twice, end-to-end, on the actual deployed environment; prepare
  the manual-POST ingestion fallback in case Apps Script misbehaves live; freeze the
  codebase.
- **Agents involved:** All four.
- **Expected output:** A rehearsed, reliable demo on a known-good, deployed build.
- **Checkpoint/exit criteria:** Two consecutive successful full-demo dry runs with no
  manual intervention.

---

## Workstreams

### Data Platform

- **Owner / Agent:** Agent 1.
- **Responsibility:** Stand up the governed data foundation — Unity Catalog schema, all 7
  Delta tables with seed data, column comments/synonyms, and the Genie Space (instructions,
  synonyms, trusted SQL function, benchmark set), per `architecture.md`'s Data Platform
  workstream definition.
- **Starting prerequisites:** `data-contracts.md` (already frozen), Databricks workspace
  access, a SQL warehouse provisioned.
- **Tasks:**
  1. Write and run `01_create_schema.sql` (DDL for all 7 tables, per `data-contracts.md`'s
     Entity Contracts).
  2. Write and run `02_seed_data.sql`, satisfying every scenario in `data-contracts.md`'s
     Synthetic Data Requirements (boundary-time teacher entries, cancelled event with
     cancelled booking, zero-attendance events, duplicate registration row, etc.).
  3. Add column/table comments in Unity Catalog for all seven tables (the single
     highest-leverage Genie tuning step per `genie.md`).
  4. Create the `room_is_free(room_id, ts)` trusted SQL function per the half-open-interval
     formula.
  5. Configure the Genie Space: instructions (verbatim from `genie.md`'s Genie
     Instructions), synonyms, and the trusted function.
  6. Run and verify all ten benchmark questions directly in the Databricks UI.
  7. Freeze and publish final table/column names to the team the moment DDL is run (they
     should not change from what `data-contracts.md` already specifies, but confirm no
     drift).
- **Files/modules owned:** `data-platform/` in full.
- **Interfaces consumed:** `data-contracts.md` (schema definitions), `genie.md` (Genie
  configuration spec).
- **Interfaces produced:** The live schema (table/column names, matching
  `data-contracts.md` exactly), a working `GENIE_SPACE_ID`, the `room_is_free` function
  signature, the seeded data Backend and Frontend demo against.
- **Dependencies:** None — this is the foundational workstream, buildable from hour 0
  entirely from already-frozen documents.
- **What the agent must NOT modify:** `backend/`, `frontend/`, `ingestion/`.
- **Definition of Done:** All 7 tables exist with seed data satisfying every required
  scenario; Genie answers all ten benchmarks correctly in the Databricks UI; table/column
  names match `data-contracts.md` with zero drift.
- **Integration checkpoint:** First Integration (Hour 3:30–4:15) is this workstream's first
  hard deadline — Backend needs a working Genie Space and seeded tables to prove the
  vertical slice.

---

### Backend (API)

- **Owner / Agent:** Agent 2.
- **Responsibility:** Implement every REST endpoint in `architecture.md`'s Integration
  Contracts — the Genie proxy, direct reads, governed writes, the ingestion webhook, and
  role/session handling — and serve the built frontend as static assets.
- **Starting prerequisites:** `architecture.md`'s Integration Contracts (frozen),
  `data-contracts.md` (frozen), `code-standards.md`'s Technology-Specific and Data Access
  Standards.
- **Tasks:**
  1. Scaffold `main.py`, `config.py`, and all routers with Pydantic models matching the
     documented request/response shapes exactly (can start against mock data immediately).
  2. Implement `db.py`: the centralized overlap-interval formula, `get_free_rooms`,
     `is_teacher_free`, `get_events`, `create_booking`, `create_event`,
     `insert_attendance`.
  3. Implement `genie_client.py`: the Genie Conversation API wrapper, mapping Genie's
     result into `ok`/`no_answer`/`error`.
  4. Implement `auth.py`: signed cookie issuance (`POST /api/session`) and server-side role
     verification for the two protected write endpoints.
  5. Implement `POST /api/ingest/attendance` with `INGEST_TOKEN` verification.
  6. Wire real Databricks credentials (`SQL_WAREHOUSE_ID`, `GENIE_SPACE_ID`,
     `UNITY_CATALOG_SCHEMA`) once Data Platform publishes them.
  7. Write `pytest` tests per `code-standards.md`'s Testing Standards (overlap formula,
     role checks, one success + one error case per endpoint).
  8. Mount the built frontend static assets in `main.py` ahead of the deploy checkpoint.
- **Files/modules owned:** `backend/` in full.
- **Interfaces consumed:** Data Platform's table/column names and `GENIE_SPACE_ID`;
  `architecture.md`'s Integration Contracts (which this workstream also *implements*, not
  redefines).
- **Interfaces produced:** The full REST API frontend and ingestion build against; the
  static-file-serving host for the deployed app.
- **Dependencies:** Soft dependency on Data Platform for the *final* wiring of real
  Databricks credentials — endpoints are fully scaffolded and testable against mocks before
  that's ready, so this never blocks the start of backend work.
- **What the agent must NOT modify:** `frontend/src/`, `data-platform/`, the Genie Space
  configuration itself.
- **Definition of Done:** Every documented endpoint matches its shape exactly, enforces
  role checks on writes, returns documented error shapes on every failure mode
  (Genie unavailable, warehouse unavailable, permission denied, booking conflict).
- **Integration checkpoint:** First Integration (Hour 3:30–4:15) for the Genie proxy path;
  Core Feature Integration (Hour ~6) for the write endpoints.

---

### Frontend

- **Owner / Agent:** Agent 3.
- **Responsibility:** Implement the three surfaces (Newsletter Home, Ask Genie, Admin
  Panel) purely against the backend REST contract, using the registered components from
  `ui-registry.md` and the tokens/rules from `ui-tokens.md`/`ui-rules.md`.
- **Starting prerequisites:** `architecture.md`'s Integration Contracts (frozen),
  `ui-tokens.md`, `ui-rules.md`, `ui-registry.md` (all frozen).
- **Tasks:**
  1. Build `tokens.css`/`tailwind.config.ts`/`tokens.ts` per `ui-tokens.md`'s
     Implementation Format.
  2. Build the Shell, TopBar, Container, Section, PageHeader primitives from
     `ui-registry.md`.
  3. Build the generic component set: Button, FormField, Table, Card, StatusIndicator,
     Banner, Skeleton, AccessCodeModal.
  4. Build `api/client.ts` with one typed function per Integration Contract — initially
     pointed at mock responses matching the documented shapes, swapped to the real backend
     once available.
  5. Build Newsletter Home: EventCard/Grid, RoomAvailabilityTable, 15s polling with the
     live-update highlight.
  6. Build Ask Genie: GenieChatContainer, GenieMessage (all three states), GenieQueryInput,
     SuggestedQuestionChip, GenieEvidenceDisclosure, GenieResultTable.
  7. Build Admin Panel: both governed-write forms, RoleGate, the access-code flow.
  8. Manually exercise every registered component against its documented states
     (default/loading/empty/error) per `code-standards.md`'s Testing Standards.
- **Files/modules owned:** `frontend/` in full.
- **Interfaces consumed:** `architecture.md`'s Integration Contracts (via mocks, then the
  real Backend); `ui-tokens.md`, `ui-rules.md`, `ui-registry.md`.
- **Interfaces produced:** The built static bundle Backend serves; the realized component
  set other agents reference (read-only) if they need to understand UI behavior.
- **Dependencies:** Soft dependency on Backend for real (non-mock) data — Frontend builds
  entirely against documented mock shapes until Backend's endpoints are live, so this never
  blocks the start of frontend work.
- **What the agent must NOT modify:** `backend/app/`, `data-platform/`.
- **Definition of Done:** All three surfaces implemented per `project-overview.md`'s flows;
  every network call goes through `api/client.ts`; no component calls Databricks/Genie
  directly; Genie answers visibly render their SQL/data basis; write actions are reachable
  only after a role has been selected via `/api/session`.
- **Integration checkpoint:** First Integration (Hour 3:30–4:15) for Ask Genie against the
  real backend; Core Feature Integration (Hour ~6) for Newsletter Home and Admin Panel.

---

### Ingestion & Integration

- **Owner / Agent:** Agent 4.
- **Responsibility:** Wire the Google Form to the ingestion endpoint, validate the full
  live demo loop end-to-end, and own deployment of the finished app to Databricks Apps.
- **Starting prerequisites:** `architecture.md`'s "Attendance ingestion webhook" contract
  (frozen) — everything else about this workstream can start immediately since it doesn't
  wait on the other three's implementations, only on a *stub* matching the contract shape.
- **Tasks:**
  1. Create the Google Form (fields matching the ingestion payload: event identifier,
     registrant name, registrant email) and its linked Sheet.
  2. Write the bound Apps Script (`on_form_submit.gs`) implementing `onFormSubmit`, calling
     the ingestion endpoint with the `INGEST_TOKEN`.
  3. Test the Apps Script against a manually-run local stub of `/api/ingest/attendance`
     before Backend's real endpoint exists.
  4. Once Backend's real endpoint is live, re-point the Apps Script and re-test with a real
     form submission, confirming the attendance count changes on Newsletter Home / a Genie
     answer without manual reload.
  5. Write `form-config-notes.md` (field → payload mapping) and `demo-script.md` (the
     rehearsed step-by-step demo, including the manual-POST fallback if Apps Script fails
     live).
  6. Own the Databricks Apps deployment: build the frontend, package the backend, configure
     environment variables per `architecture.md`'s Environment Configuration table, deploy,
     verify the single URL is reachable.
  7. Run the full six-flow walkthrough against the deployed URL (not local) at every
     integration checkpoint from Hour 7:30 onward.
- **Files/modules owned:** `ingestion/`, `deploy/`.
- **Interfaces consumed:** The `/api/ingest/attendance` contract (initially via a stub, then
  the real Backend endpoint); the deployed app surface once Frontend + Backend are merged.
- **Interfaces produced:** A working Google Form → Apps Script → ingestion pipeline; a
  reachable deployed instance of the whole product; the demo script.
- **Dependencies:** Soft dependency on Backend for the real ingestion endpoint (works
  against a stub until then); hard dependency on Frontend + Backend both being merged into
  `main` before final deployment can be verified end-to-end.
- **What the agent must NOT modify:** `data-platform/` tables directly, `backend/app/`,
  `frontend/src/`.
- **Definition of Done:** Submitting the live Google Form changes the attendance count,
  observable via both a Genie question and Newsletter Home, with no manual steps; the app
  is deployed and reachable via a single URL; the demo script has been run start-to-finish
  successfully at least twice.
- **Integration checkpoint:** Core Feature Integration (Hour ~6) for the real
  Form→ingestion path; Final System Validation (Hour ~10:30) for the deployed environment.

---

## Phase Breakdown

### Phase 1: Contract Confirmation and Environment Setup
- **Objective:** Zero ambiguity about interfaces before code is written; every agent's
  toolchain runs.
- **Required inputs:** All eight context files.
- **Agent assignments:** All four, together.
- **Tasks per agent:** Read the four shared documents; confirm Databricks
  workspace/warehouse access (Data Platform, Backend); confirm Node/Python toolchains
  (Frontend, Backend); confirm Google account access (Ingestion).
- **Dependencies:** None.
- **Expected outputs:** Four ready dev environments.
- **Integration point:** None yet — this phase produces the shared starting line.
- **Pass criteria:** No agent has an open question about a contract shape or table name.
- **Failure/fallback strategy:** If Databricks access is delayed, Data Platform and Backend
  begin against a local mock warehouse response while access resolves — never idle.

---

### Phase 2: Foundational Build
- **Objective:** Each workstream produces its load-bearing artifact in isolation.
- **Required inputs:** `data-contracts.md`, `architecture.md`, `ui-tokens.md`,
  `ui-registry.md`.
- **Agent assignments:** All four, independently.
- **Tasks per agent:** Data Platform — schema + seed data. Backend — router scaffolding +
  `db.py` core functions against mocks. Frontend — token config + shell + generic
  components against mocks. Ingestion — Form + Apps Script against a stub endpoint.
- **Dependencies:** None blocking — all four tasks are independently startable from frozen
  documents.
- **Expected outputs:** A runnable, disconnected version of each layer.
- **Integration point:** None yet — deliberately isolated to maximize raw progress before
  the first merge.
- **Pass criteria:** Each artifact runs locally and matches its documented shape.
- **Failure/fallback strategy:** If Data Platform is behind schedule at the phase boundary,
  Backend continues against mocked data and integrates Databricks in Phase 3 once ready —
  the vertical slice checkpoint absorbs this slip.

---

### Phase 3: Vertical Slice Integration
- **Objective:** Prove the full stack works on the single simplest real path.
- **Required inputs:** A working Genie Space (Data Platform), a working `/api/genie/ask`
  endpoint (Backend), a working Ask Genie page (Frontend).
- **Agent assignments:** Backend + Frontend merge and test together; Data Platform on call
  for schema/Genie fixes; Ingestion continues independently.
- **Tasks per agent:** Backend wires real Databricks credentials into `genie_client.py`.
  Frontend swaps Ask Genie's mock data for the real endpoint. Both walk one question
  ("Is Lab 204 available right now?") through the full stack.
- **Dependencies:** Hard dependency on Data Platform's Genie Space and seed data being live.
- **Expected outputs:** One real, working question-answer cycle with visible SQL evidence.
- **Integration point:** This *is* the End-to-End Vertical Slice (see below).
- **Pass criteria:** The question returns a correct answer with its data basis, rendered
  correctly in the UI.
- **Failure/fallback strategy:** If Genie itself is unreliable, Backend temporarily verifies
  the proxy layer against a hardcoded mock Genie response so Frontend integration isn't
  blocked, while Data Platform debugs the Genie Space in parallel — see Contingency Plan.

---

### Phase 4: Feature Buildout
- **Objective:** Complete all Must Ship and Should Ship functionality per workstream.
- **Required inputs:** The passed vertical slice; all remaining endpoint/component work.
- **Agent assignments:** All four, mostly independent, Backend/Frontend coordinating as
  endpoints land.
- **Tasks per agent:** Backend — remaining reads, both writes, role enforcement, conflict
  checks. Frontend — Newsletter Home, Admin Panel, remaining Genie UI states. Data
  Platform — trusted function, synonyms, full benchmark run. Ingestion — real
  Form→ingestion wiring, first real submission test.
- **Dependencies:** Backend's write endpoints depend on Data Platform's schema being final
  (already true by this phase); Frontend's Admin Panel depends on Backend's write endpoints
  existing (can build against mocks in the meantime).
- **Expected outputs:** Every Must Ship feature implemented per workstream.
- **Integration point:** Feeds directly into Phase 5.
- **Pass criteria:** See Integration Checkpoint "Core Feature Integration."
- **Failure/fallback strategy:** Any feature running long triggers an immediate scope check
  against Feature Prioritization — simplify before cutting, cut Nice to Have before Should
  Ship.

---

### Phase 5: Full Integration and Deployment
- **Objective:** Merge everything, deploy, and validate all six core flows against the real
  deployed environment.
- **Required inputs:** Feature-complete branches from all four workstreams.
- **Agent assignments:** All four.
- **Tasks per agent:** Merge in dependency order; Ingestion deploys to Databricks Apps;
  everyone walks the six core flows against the deployed URL; bugs triaged by owning
  workstream immediately.
- **Dependencies:** Hard dependency on Phase 4's outputs from all four workstreams.
- **Expected outputs:** A single deployed, integrated build.
- **Integration point:** This is the "End-to-End Integration" execution stage.
- **Pass criteria:** See Integration Checkpoint "Final Feature Integration."
- **Failure/fallback strategy:** A flow that fails integration is fixed by its owning
  workstream with a hard time box (30 minutes); if still broken, it's simplified per
  Contingency Plan rather than left blocking the others.

---

### Phase 6: Hardening
- **Objective:** Stabilize the deployed build; close out remaining bugs; re-verify
  benchmarks.
- **Required inputs:** The integrated, deployed build from Phase 5.
- **Agent assignments:** All four.
- **Tasks per agent:** Run full `pytest` suite; re-run all ten Genie benchmarks against the
  live Genie Space; fix Must-Ship-breaking bugs first.
- **Dependencies:** Phase 5 complete.
- **Expected outputs:** A stable build with no known Must Ship breakage.
- **Integration point:** "Final System Validation" checkpoint.
- **Pass criteria:** All ten benchmarks pass; all six core flows pass on the deployed URL.
- **Failure/fallback strategy:** If a benchmark still fails, the affected Genie
  instruction/synonym is patched by Data Platform directly in the Genie Space (fast,
  config-only fix) rather than re-architecting the query approach.

---

### Phase 7: Demo Preparation
- **Objective:** Protect the demo — no functional changes, only reliability and
  presentation.
- **Required inputs:** The hardened build from Phase 6.
- **Agent assignments:** All four.
- **Tasks per agent:** Rehearse the demo script twice; verify UI consistency; freeze the
  codebase; prepare fallbacks (manual-POST ingestion, pre-picked demo questions).
- **Dependencies:** Phase 6 complete.
- **Expected outputs:** A rehearsed, reliable demo.
- **Integration point:** None further — this is the terminal phase.
- **Pass criteria:** Two consecutive clean full-demo dry runs.
- **Failure/fallback strategy:** See Final 60–90 Minutes and Demo Safety Strategy.

---

## Dependency Graph

```
                context/*.md (frozen, Hour 0)
                          │
        ┌─────────────────┼─────────────────┬──────────────────┐
        ▼                 ▼                 ▼                  ▼
  Data Platform        Backend          Frontend           Ingestion
  (schema, seed,     (scaffolds vs.   (builds vs.        (Form + Apps
   Genie Space)        mocks first)    mocks first)        Script vs. stub)
        │                 │                 │                  │
        │   (hard, for    │                 │                  │
        │   real data)    │                 │                  │
        └───────────────▶ │                 │                  │
                          │◀── (hard, for real data) ───────────┘ (soft until
                          │                                        Backend's real
                          │   (hard, for real                      endpoint exists)
                          │    responses)
                          └───────────────▶ │
                                            │
                          Frontend + Backend merge (Hour ~4)
                                            │
                                            ▼
                                  Vertical Slice proven
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                                                ▼
         Backend finishes writes                      Frontend finishes
         (Admin Panel endpoints)                       Newsletter Home + Admin Panel
                    │                                                │
                    └──────────────────┬─────────────────────────────┘
                                       ▼
                       All four merge (Hour ~7:30) — Ingestion
                       deploys the merged Frontend+Backend build
                                       │
                                       ▼
                          Full six-flow validation
                                       │
                                       ▼
                              Hardening + Demo Prep
```

**Blocking dependencies:**
- Backend's *real* data path (both Genie and direct reads) blocks on Data Platform's live
  schema + Genie Space.
- Frontend's *real* data path blocks on Backend's live endpoints.
- Ingestion's *real* ingestion path blocks on Backend's live `/api/ingest/attendance`.
- Final deployment blocks on Frontend + Backend both being merged.

**Non-blocking (soft) dependencies:**
- Backend can scaffold and unit-test every endpoint against mocked Databricks/Genie
  responses before Data Platform finishes.
- Frontend can build every page and component against mocked API responses before Backend
  finishes.
- Ingestion can build and test the Apps Script against a stub endpoint before Backend's
  real one exists.

**Optional dependencies:**
- Ingestion's deployment work does not require Data Platform directly — only through
  Backend, which already has its own dependency on Data Platform.
- The Multi-step/agentic Genie capability (Optional in `project-overview.md`) has no
  dependency chain of its own — it is only attempted, if at all, after every hard
  dependency above is already satisfied.

---

## Integration Checkpoints

### Checkpoint 1: Shared Foundation Readiness
- **Target time/window:** Hour 0:45.
- **What must be integrated:** Nothing yet — this checkpoint validates readiness, not code.
- **Who integrates:** N/A — a shared standup, not a merge.
- **What must already work:** Each agent's local toolchain; Databricks/Google access.
- **Tests to run:** None — a verbal confirmation round.
- **Pass criteria:** No open contract-shape questions; every agent can name their
  workstream's Definition of Done from memory.
- **What happens if it fails:** The blocking access/toolchain issue is resolved
  immediately, with the affected agent working against mocks/stubs in the meantime rather
  than sitting idle.

### Checkpoint 2: First End-to-End Path (Vertical Slice)
- **Target time/window:** Hour 3:30–4:15.
- **What must be integrated:** Backend's `genie_client.py` + `/api/genie/ask` merged
  against real Data Platform tables/Genie Space; Frontend's Ask Genie page merged against
  the real endpoint.
- **Who integrates:** Backend and Frontend agents, with Data Platform on call.
- **What must already work:** Seeded tables, a configured Genie Space, a working
  `POST /api/genie/ask` implementation, a rendering Ask Genie page.
- **Tests to run:** Ask "Is Lab 204 available right now?" through the real UI; confirm the
  answer and its evidence disclosure both render correctly.
- **Pass criteria:** The one question returns a correct, grounded answer end-to-end.
- **What happens if it fails:** Time-boxed 45-minute debug with Data Platform, Backend, and
  Frontend together; if still failing, Backend temporarily hardcodes a mock Genie response
  to unblock Frontend's continued build while Data Platform keeps debugging in parallel
  (see Contingency Plan — Genie query issues).

### Checkpoint 3: Core Feature Integration
- **Target time/window:** Hour 7:00–7:30.
- **What must be integrated:** All Backend endpoints (reads + both writes); Newsletter
  Home; Admin Panel; the real Google Form → ingestion path.
- **Who integrates:** All four agents.
- **What must already work:** Role-gated writes with server-side enforcement; room-booking
  conflict detection; live-updating attendance on a real form submission.
- **Tests to run:** Walk all six core flows from `project-overview.md` locally (pre-deploy).
- **Pass criteria:** All six flows complete correctly; a `student` session cannot reach
  write endpoints; a booking conflict returns the documented `409`.
- **What happens if it fails:** Each failing flow is assigned to its owning workstream with
  a hard 30-minute fix window; a flow still broken after that is simplified per Feature
  Prioritization (e.g. drop conflict-prevention polish, keep the booking write itself).

### Checkpoint 4: Final Feature Integration (Deployment)
- **Target time/window:** Hour 9:00.
- **What must be integrated:** The full merged codebase, deployed to Databricks Apps as one
  unit.
- **Who integrates:** Ingestion & Integration agent, with the other three verifying.
- **What must already work:** Everything validated at Checkpoint 3, now running against the
  deployed URL instead of localhost.
- **Tests to run:** Re-walk all six core flows against the deployed URL; submit a real
  Google Form response and confirm the count updates live on the deployed Newsletter Home.
- **Pass criteria:** All six flows pass on the deployed environment with no manual
  intervention.
- **What happens if it fails:** Deployment-specific issues (env vars, static file serving,
  CORS-equivalent) are debugged immediately by Backend + Ingestion; if the deployment
  itself can't be fixed in time, the team demos from a verified local `main` as a fallback
  (documented, not silent) while continuing to debug deployment in the background.

### Checkpoint 5: Final System Validation
- **Target time/window:** Hour 10:30.
- **What must be integrated:** Nothing new — this is a stability and correctness gate on
  the already-deployed build.
- **Who integrates:** All four.
- **What must already work:** Checkpoint 4's full deployed pass.
- **Tests to run:** Full `pytest` suite; all ten Genie benchmarks against the live Genie
  Space; two full demo dry runs.
- **Pass criteria:** All benchmarks pass; both dry runs complete without a manual fix
  mid-run.
- **What happens if it fails:** Any remaining failure triggers Scope Control — cut or
  simplify the specific failing element per Cut First, never a late architectural change.

---

## End-to-End Vertical Slice

**The smallest implementation that proves the entire stack works:** a user opens Ask
Genie, asks *"Is Lab 204 available right now?"*, and receives a grounded answer with its
SQL/data basis visible — no other page, no writes, no ingestion loop.

This single path exercises every architectural layer at once:
- **Frontend works:** GenieChatContainer renders, GenieQueryInput submits, GenieMessage
  renders the `ok` state, GenieEvidenceDisclosure expands to show the SQL.
- **Backend/application layer works:** `POST /api/genie/ask` receives the question, calls
  `genie_client.py`, shapes the response into the documented contract.
- **Databricks data works:** the seeded `rooms` and `room_bookings` tables return a
  correct row.
- **Genie works:** the Genie Space translates the NL question into SQL using the
  `room_is_free` trusted function and the configured synonyms/instructions.
- **A real user completes a meaningful interaction:** the core value proposition of the
  entire product — ask a plain-English campus question, get a grounded answer — is
  demonstrated.

This slice is targeted for **Hour 3:30–4:15**, deliberately in the first third of the
build, specifically so that any architectural or integration surprise (a Genie
misconfiguration, a contract mismatch, a deployment blocker discovered early) has 7+
remaining hours to be fixed rather than being discovered during Final System Validation.

---

## Critical Path

1. **Data Platform's schema + seed data + Genie Space.** Critical because every other
   workstream's *real* (non-mock) behavior depends on it — Backend can't return real
   answers, Frontend can't show real data, Ingestion can't demonstrate a real live update
   without it. **Validate early:** this is Phase 2's primary deliverable, targeted for
   completion well before Checkpoint 2. **Fallback:** if the Genie Space itself
   underperforms, Data Platform narrows scope to guaranteeing the ten benchmark questions
   work perfectly rather than chasing full open-ended NL coverage (see Feature
   Prioritization).

2. **Genie Space reliability.** Critical because Genie *is* the product's central value
   proposition (`project-overview.md`, `architecture.md` Invariant 1) — a demo where Genie
   answers incorrectly or inconsistently undermines the whole pitch more than any other
   single failure. **Validate early:** the ten benchmarks are run directly in the
   Databricks UI during Phase 2, before any application code depends on them. **Fallback:**
   narrow the live demo to only the benchmark questions verified to work reliably; never
   attempt an unrehearsed open-ended question live.

3. **Backend's Genie proxy (`POST /api/genie/ask`).** Critical because it's the single
   integration point between Frontend and Genie — a bug here blocks the entire Ask Genie
   surface regardless of how well Genie itself performs. **Validate early:** Checkpoint 2
   exists specifically for this. **Fallback:** a hardcoded mock response unblocks Frontend
   development while the real proxy is debugged in parallel.

4. **Authentication/authorization (role enforcement on writes).** Critical because a broken
   role check is both a demo-breaking bug (a student appearing to book a room) and a
   correctness/security issue, not just cosmetic. **Validate early:** `pytest` tests for
   `auth.py` are written alongside the write endpoints in Phase 4, not deferred. **Fallback:**
   none acceptable — this is never simplified away; if time is short, the *UI* around it
   (RoleGate polish) is simplified before the *enforcement* is touched.

5. **Data ingestion (Google Form → Apps Script → backend).** Critical because it's the
   product's proof of being a live system, not a static demo (`project-overview.md`).
   **Validate early:** Ingestion tests the Apps Script against a local stub in Phase 2,
   well before Backend's real endpoint exists, so the Apps Script trigger mechanism itself
   is proven early. **Fallback:** the documented manual-POST fallback
   (`architecture.md`'s Error and Failure Boundaries) is rehearsed as part of Demo
   Preparation regardless of whether Apps Script works, since it's the single most
   plausible live-demo failure point (external, Google-side reliability, outside the
   team's control).

6. **Frontend/backend integration (the REST contract holding).** Critical because any
   silent drift in a field name or status code breaks integration invisibly until
   Checkpoint 2/3. **Validate early:** both sides implement directly from
   `architecture.md`'s frozen contract text, and Checkpoint 2 is the first real test of
   contract fidelity. **Fallback:** if a mismatch is found, the contract file
   (`architecture.md`) is treated as the arbiter — the implementation that drifted is fixed
   to match the document, never the other way around, to avoid a second undocumented
   drift.

7. **Deployment to Databricks Apps.** Critical because a working local build that fails to
   deploy is not a working demo. **Validate early:** Ingestion does a first deployment
   attempt as soon as *any* backend + frontend build exists (even the Phase 3 vertical
   slice), not only at Checkpoint 4, specifically to surface deployment-specific issues
   (env var wiring, static file serving) while there's still slack. **Fallback:** a
   verified local `main` run is an acceptable last-resort demo environment if deployment
   itself can't be resolved in time — never an unverified, mid-debug deployed instance.

---

## Feature Prioritization

### Must Ship
- Natural-language Q&A via Genie, covering room availability, teacher availability, and
  event attendance counts — the core value proposition.
- Visible grounding/SQL basis on every Genie answer.
- Event registration via the Google Form updating attendance data.
- The live-update loop (registration → visible count change, no manual reload).
- Newsletter-style view of current events and room availability.
- Role-restricted room booking and event creation for club heads/council.
- Server-side role enforcement on both write endpoints.

### Should Ship
- The dedicated Ask Genie chat surface embedded in the product's own frontend (rather than
  a Databricks-native UI).
- Room-booking conflict prevention (`409` handling, the conflict Banner).
- A simple, low-friction student-vs-council distinction in the UI (RoleGate,
  AccessCodeModal) — the *enforcement* is Must Ship; the polished UI around it is Should
  Ship and can be simplified to a bare form if time is short.

### Nice to Have
- Multi-step/agentic Genie answers combining more than one data source in a single
  response.
- Visual charts/graphs in the newsletter view.
- Editing of existing events/bookings in the Admin Panel.
- A visible audit trail of governed writes in the UI.

### Cut First
In this exact order, if the team is behind schedule at any checkpoint:
1. Any Nice to Have item not yet started.
2. Polished empty/loading-state animation beyond the single documented live-update flash.
3. The Ask Genie suggested-question-chip empty state (fall back to a plain instruction
   sentence).
4. Room-booking conflict *prevention* UI polish (keep the `409` enforcement; simplify the
   conflict banner's detail rendering to plain text if needed).
5. Multi-column responsive polish beyond the single primary breakpoint (`--bp-lg`) — get it
   right at demo/projector width first.

**Never cut**, regardless of time pressure: Genie's core Q&A capability, the grounding
disclosure, the live attendance-update loop, and server-side role enforcement on writes —
these are the product's stated core value proposition and its two hard security/data
invariants.

---

## Integration Contracts

This section summarizes what agents must agree on; the authoritative text lives in the
referenced files and is never duplicated or restated with different wording here.

- **Frontend ↔ Backend:** every request/response shape, status code, and field name is
  defined in `architecture.md`'s Integration Contracts section (Ask Genie, List events,
  Room availability, Teacher availability, Create booking, Create event, Attendance
  ingestion, Session). Frontend's `api/client.ts` implements one typed function per
  contract; Backend's routers return exactly these shapes.
- **Frontend ↔ Genie:** indirect only — the frontend never calls Genie directly
  (`architecture.md` Invariant 3). All Genie behavior the frontend needs to account for
  (the `ok`/`no_answer`/`error` taxonomy) is defined in `genie.md`'s Failure Handling and
  rendered per `ui-rules.md`'s Genie / Conversational Interface section.
- **Application ↔ Databricks:** the backend's SQL and Genie Conversation API calls are
  scoped to exactly the seven tables and the trusted `room_is_free` function defined in
  `data-contracts.md` and `genie.md`'s Data Surface — no additional table or ad hoc query
  logic outside those documents.
- **Write operations:** the three write paths (`POST /api/bookings`, `POST /api/events`,
  `POST /api/ingest/attendance`) follow the Write Contracts in `data-contracts.md` exactly
  (required inputs, validation, conflict handling, resulting state) and the corresponding
  Integration Contract entries in `architecture.md` for their HTTP shape.
- **Authentication/authorization:** the session cookie mechanism and the two protected
  routes are defined in `architecture.md`'s Authentication and Authorization section;
  `code-standards.md`'s Authentication and Authorization section defines how that's
  implemented in code. No agent may implement a different enforcement mechanism.
- **Shared UI components:** every component Frontend builds either matches an entry in
  `ui-registry.md` or is added there in the same change, per that file's Adding a New
  Component process — this build plan does not re-list the component inventory.

---

## Agent Handoff Rules

Handoffs happen at integration checkpoints, not continuously — but the same lightweight
rule applies whenever one agent's output becomes another's input:

- **What must be complete:** the specific interface being handed off (an endpoint, a
  component, a schema) matches its documented contract shape exactly and has been merged
  to the shared branch, not left on a local-only branch.
- **What must be documented:** any deviation from the original contract (should be rare —
  see Scope Control Rules) is written into the relevant context file in the same change,
  not communicated verbally only.
- **What interface information must be provided:** the exact endpoint URL/method, request/
  response shape (if it's not already 1:1 with the frozen contract), and any new
  environment variable it requires.
- **What environment/setup information must be shared:** any new environment variable is
  added to `architecture.md`'s Environment Configuration table and to the shared `.env`
  template immediately — never communicated as a one-off Slack message only.
- **What tests must pass:** the relevant `pytest` suite (Backend) or the manual
  state-exercise checklist (Frontend, per `code-standards.md`'s Testing Standards) before
  the handoff is considered usable by the receiving agent.
- **What known limitations must be communicated:** anything at the **Implemented** but not
  yet **Integrated**/**Verified** stage (per `code-standards.md`'s Definition of Done) is
  explicitly flagged as such — a receiving agent should never assume "merged" means
  "verified against real data."

---

## Testing Strategy During the Build

Testing happens continuously, distributed across the build, not held for the end.

- **Component/module validation:** each agent manually exercises their own units against
  documented states as they're built (Phase 2 onward) — a component isn't considered
  "implemented" until its default/loading/empty/error states have all been looked at once.
- **API validation:** Backend writes the `pytest` contract-shape test for each endpoint in
  the same work session it implements that endpoint, not afterward.
- **Data validation:** Data Platform runs the ten Genie benchmarks directly in the
  Databricks UI as soon as the Genie Space is configured (end of Phase 2/start of Phase 3)
  — this is a required gate before Backend's Genie proxy is considered safe to integrate
  against.
- **Genie validation:** re-run through the real `POST /api/genie/ask` endpoint at
  Checkpoint 2, and again at Checkpoint 5 against the deployed environment.
- **Integration testing:** at every numbered Integration Checkpoint above — never
  postponed to a single end-of-build pass.
- **End-to-end testing:** the six core flows from `project-overview.md`, walked manually at
  Checkpoints 3, 4, and 5 (locally, then against the deployed build, then again as a
  stability check).
- **Regression testing:** any change to schema, query logic, or a shared component after
  Checkpoint 3 triggers a re-walk of the affected core flow(s) before the next checkpoint.

**Minimum validation required before proceeding past each checkpoint:**
- Checkpoint 2: the one vertical-slice question returns a correct, grounded answer.
- Checkpoint 3: all six core flows pass locally; role enforcement and booking conflicts
  behave per contract.
- Checkpoint 4: all six core flows pass against the deployed URL.
- Checkpoint 5: all ten Genie benchmarks pass; two clean demo dry runs complete.

---

## Demo Safety Strategy

- **Critical-path validation:** the seven Critical Path items above are each validated at
  their earliest possible point in the build, not assumed to work because they worked once
  in isolation.
- **Fallback behavior:** every documented failure mode in `architecture.md`'s Error and
  Failure Boundaries table has a corresponding UI state already built (per `ui-rules.md`)
  — the demo never encounters an *unhandled* failure, only a *visibly handled* one in the
  worst case.
- **Seeded/demo data:** Data Platform's seed data is specifically constructed (per
  `data-contracts.md`'s Synthetic Data Requirements) so that the demo's key questions
  always have a reliable, demonstrable answer — e.g. one intentionally-unbooked lab, one
  teacher with both a busy and a free period on the demo day, one event seeded at exactly 5
  attendees so the "+1" is obviously visible.
- **Handling external integration failures:** the Google Form/Apps Script path is the
  product's one true external dependency; the manual-POST fallback is rehearsed, not just
  documented, during Demo Preparation, so a live Apps Script hiccup doesn't stall the demo.
- **Handling Genie failures:** the live demo only asks questions from the verified
  ten-benchmark set (or close paraphrases already tested during Hardening) — never an
  improvised question live, since Genie's reliability was deliberately scoped to that set
  under time pressure.
- **Avoiding fragile last-minute changes:** Final 60–90 Minutes (below) is a hard feature
  freeze — nothing framed as an "improvement" is merged once it starts, regardless of how
  small.
- **Final environment verification:** the deployed URL, not a local dev server, is what's
  demoed; this is confirmed working via two full dry runs immediately before presenting,
  per Checkpoint 5.

---

## Contingency Plan

| Failure category | Symptom | Immediate response | What can be simplified | What should be cut | What must remain intact |
|---|---|---|---|---|---|
| **Genie query issues** | A benchmark question returns a wrong or inconsistent answer | Data Platform patches the specific instruction/synonym in the Genie Space directly (config-only fix) | Scope the live demo to only verified-reliable benchmark questions | Any open-ended "ask anything" demo moment | The ten core benchmarks and the grounding disclosure |
| **Databricks configuration issues** | Warehouse unreachable, schema mismatch, permission errors | Backend falls back to the documented `502` error state while Data Platform fixes access/schema in parallel | Non-critical read endpoints can stay on mock data slightly longer | — | The write endpoints' validation logic (tested independent of live Databricks access) |
| **Authentication problems** | Role check misfires (student reaches a write, or council is wrongly rejected) | Treated as a Must-Ship blocker — all four agents stop other work to fix immediately | The AccessCodeModal's UI polish | Nothing — this is never simplified away | Server-side enforcement in `auth.py`, verified by `pytest` |
| **Data ingestion problems** | Apps Script doesn't fire, or the count doesn't update | Use the documented manual-POST fallback for the live demo; debug Apps Script separately, non-blocking | The live "watch it tick up during the demo" moment can become "submit once, refresh once" instead of repeated live submissions | Repeated real-time submission theatrics | The underlying INSERT path and count recalculation, verified via the manual-POST path |
| **Frontend/backend integration failures** | A field name/shape mismatch, a broken fetch call | Treat `architecture.md`'s contract as authoritative; whichever side drifted is corrected to match it | Non-essential response fields (e.g. extra debug info) can be dropped from a response without ceremony | — | The documented field names/shapes for all six core flows |
| **Deployment issues** | Databricks Apps deployment fails or env vars misconfigured | Ingestion debugs with Backend; if unresolved after a hard time box, demo from a verified local `main` instead | The "single URL, zero setup" framing of the demo, if truly necessary | Nothing about functionality — only the hosting story changes | The actual working application, wherever it runs |
| **An agent falling behind** | A workstream's Phase 4 tasks aren't done by Hour 7:30 | The other three agents reassign a scoped, well-bounded piece of that workstream's remaining Must Ship work (e.g. one specific endpoint) rather than reworking ownership entirely | That workstream's Should Ship items | That workstream's Nice to Have items, immediately | That workstream's Must Ship items — reassigned, never dropped |
| **Shared-code conflicts** | Two agents touched the same file unexpectedly | This signals a boundary violation, not bad luck (per `code-standards.md`) — resolve by re-establishing exclusive ownership, not by merging both changes blindly | — | — | The single-owner-per-file principle |
| **A feature taking longer than expected** | A Should Ship or Nice to Have item is clearly not going to finish in its allotted window | Cut per the Feature Prioritization "Cut First" order at the next checkpoint, decided by that workstream's owning agent | The feature's scope (fewer states, simpler UI) before cutting it outright | The feature itself, only after simplification is exhausted | Whatever Must Ship functionality that feature might have been layered on top of |

---

## Final 60–90 Minutes

Starting at approximately Hour 10:30, in this order:

1. **Feature freeze.** No new functionality, no "quick improvements," effective
   immediately. Any change from this point is a bug fix against already-scoped
   functionality, nothing else.
2. **End-to-end testing.** Two full walkthroughs of all six core flows against the deployed
   URL.
3. **Bug fixing.** Only bugs found in step 2 that break a Must Ship flow. Anything else is
   logged and left alone.
4. **Genie/query validation.** Re-run the ten benchmarks one final time against the live,
   deployed Genie Space; confirm the specific questions to be asked live all still pass.
5. **Permission validation.** Confirm a `student` session cannot reach either write
   endpoint and a `council` session can complete both writes, one final time.
6. **UI consistency check.** A quick pass against `ui-tokens.md`/`ui-rules.md` for anything
   visibly broken (misaligned spacing, wrong color, missing status icon) — cosmetic only,
   time-boxed to 10–15 minutes, not a redesign pass.
7. **Deployment verification.** Confirm the demo will run from the deployed URL, on the
   actual machine/network that will be used to present, not a different laptop.
8. **Demo-path verification.** Walk the exact sequence of clicks/questions that will be
   used live, twice, with no improvisation.
9. **Final cleanup.** Remove any leftover debug logging or placeholder data introduced
   during Hardening, per `code-standards.md`'s Code Quality section.
10. **Presentation/demo preparation.** Confirm who narrates which part of the demo; confirm
    the fallback plan (manual-POST, pre-picked questions) is understood by whoever is
    driving the live demo.

**Explicitly do not, during this window:** add a feature, refactor working code, upgrade a
dependency, "quickly" restyle a component, attempt an untested Genie question live for the
first time, or change the deployment configuration unless deployment is actively broken.

---

## Definition of Done

The project is done when:

- The core product flow (ask a question → get a grounded answer) works reliably against
  the deployed environment.
- Genie answers all ten benchmark questions correctly and consistently.
- All seven governed tables contain seed data satisfying every scenario in
  `data-contracts.md`'s Synthetic Data Requirements.
- Both governed write operations (booking a room, creating an event) work, enforce
  `council`-only access server-side, and correctly reject conflicts.
- A `student` session cannot perform either write operation, verified directly (not just
  assumed from hidden UI).
- Frontend and backend are integrated against the real deployed API — not mocks — for every
  one of the six core flows.
- Every documented failure mode (`no_answer`, `error`, `empty`, `conflict`, `forbidden`)
  renders its correct, distinct UI state at least once, observed directly.
- The app is deployed, reachable via one URL, and has been demoed successfully from that
  URL, not from a local dev server, at least twice.
- All six core user journeys from `project-overview.md` have been walked end-to-end against
  the deployed build with no manual data massaging.
- No known blocker remains against any Must Ship feature.

**Implemented vs. Integrated vs. Verified**, applied to every feature before it's counted
as done, per `code-standards.md`'s Definition of Done:

- **Implemented:** the agent has written the code and it behaves correctly against local/
  mock data in isolation.
- **Integrated:** the code has been merged and exercised against the real neighboring
  workstream's actual implementation (real backend, real seeded data, real Genie Space) —
  not a mock.
- **Verified:** the integrated behavior has been walked through as part of one of the six
  core flows and produces the correct, documented result, including its documented error/
  empty states, on the deployed build.

A feature is not reported as "done" at any checkpoint unless it has reached **Verified**.
A feature that has only reached **Implemented** is reported as such, explicitly, not
rounded up.

---

## Scope Control Rules

- **No new major features are added after Checkpoint 3 (Core Feature Integration, ~Hour
  7:30).** From that point on, the feature set is exactly what's in Must Ship and Should
  Ship, minus anything already cut.
- **No architecture redesign after Checkpoint 2 (First End-to-End Path, ~Hour 4:15).** Once
  the vertical slice proves the architecture works, it is frozen; a discovered problem is
  patched within the existing architecture, not redesigned around.
- **No unnecessary dependencies are introduced at any point** — `code-standards.md`'s
  Dependencies and Libraries rules apply throughout, not just at project start.
- **No unrelated refactors.** An agent fixing a bug in a file doesn't also reformat or
  restructure unrelated code in that file during the build.
- **Features are simplified before they are abandoned.** Per Feature Prioritization's Cut
  First list — reduce scope (fewer states, simpler UI, config-only fixes) before removing
  a feature outright.
- **The core Genie experience is protected above all other functionality.** If a trade-off
  arises between polishing a secondary surface (Admin Panel styling, newsletter charts) and
  protecting Genie's reliability, Genie wins, always.
- **End-to-end reliability is prioritized over feature count** at every checkpoint — a
  smaller, fully verified product is the explicit goal, not a larger, partially integrated
  one.
- **The architecture is frozen after Checkpoint 2**, as stated above; from Checkpoint 3
  onward, only the feature set is subject to cuts, never the system design.

**Who determines when scope must be cut:** the agent who owns the affected workstream makes
the call at the relevant checkpoint, using the Feature Prioritization order — this is a
unilateral, fast decision by design (per `architecture.md`'s ownership model), not a
four-person consensus vote, because a hackathon has no time for the latter. A cut affecting
another workstream's interface (e.g. dropping a response field another agent's UI already
depends on) is the one exception — that specific change is confirmed with the consuming
agent before merging, since it's an interface change, not a scope change within one
workstream.

---

## Rules for This File

1. This is the canonical implementation plan for the Campus Companion hackathon.
2. All four agents use this file to understand workstream ownership and sequencing.
3. `architecture.md` remains authoritative for architecture; this file sequences work
   within it, it does not redefine it.
4. `data-contracts.md` remains authoritative for data semantics.
5. `genie.md` remains authoritative for Genie behavior and configuration.
6. `ui-tokens.md`, `ui-rules.md`, and `ui-registry.md` remain authoritative for UI
   decisions.
7. This file defines sequencing, ownership, checkpoints, and execution strategy — nothing
   here overrides a decision made in the files above.
8. Integration checkpoints are mandatory, not optional milestones to skip if the team feels
   confident.
9. Agents do not silently change another workstream's responsibilities — a needed change to
   ownership or scope is raised at the nearest checkpoint, not decided unilaterally
   mid-phase.
10. When implementation reality conflicts with this plan (a phase runs long, a dependency
    turns out to be harder than expected), the plan is updated deliberately — the relevant
    section edited and the change communicated at the next checkpoint — rather than quietly
    ignored while agents route around it.
11. The team optimizes for a reliable end-to-end demo over maximum feature count, at every
    single decision point in this plan.
12. This plan remains realistic for a 12-hour hackathon — where a stage in this document
    and the actual clock disagree, the clock wins, and scope is cut per Scope Control Rules
    rather than the schedule being pretended to hold.
