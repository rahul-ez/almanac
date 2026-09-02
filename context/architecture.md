# Architecture

## Architectural Principles

1. **Genie is the only natural-language query path.** No component may implement its own
   NL-to-answer logic outside Genie. If a question can't be answered via Genie against
   governed data, the product says so — it does not fabricate an answer elsewhere.
2. **Genie never writes.** All data mutation (bookings, event creation, attendance
   ingestion) happens through explicit, application-controlled SQL statements executed by
   the backend. Genie is read-only, always.
3. **One source of truth.** All reads (Genie, newsletter view, admin panel) and all writes
   resolve to the same Unity Catalog Delta tables via the same SQL warehouse. There is no
   cache, replica, or secondary datastore that can drift from that source.
4. **Thin backend, thin frontend.** The backend exists only to: (a) proxy Genie
   conversations, (b) run a small, fixed set of parameterized reads/writes, and (c) enforce
   role checks. It contains no business logic beyond validating and executing those
   operations. The frontend contains no direct Databricks access.
5. **Contracts before implementation.** Every boundary between workstreams is defined by a
   fixed REST contract in this document. Agents build against the contract, not against
   each other's code.
6. **Fail visibly, never fabricate.** If Genie, the SQL warehouse, or an ingestion step
   fails, the user sees an explicit "couldn't get that" state — never a guessed or
   partially-invented answer.
7. **Minimum moving parts for 12 hours.** One deployable app (frontend + backend together),
   one Databricks workspace, one catalog/schema, one Genie Space, one external integration
   (Google Form). No queues, no microservices, no additional databases.
8. **Role enforcement lives on the server.** Any UI distinction between student and club
   head/council is cosmetic only; the backend independently verifies role on every write.

---

## Stack

| Layer | Technology | Purpose | Reason for Choice |
|---|---|---|---|
| Frontend | React (Vite, TypeScript) SPA | Newsletter Home, Ask Genie chat, Admin Panel | Fast to build, no SSR complexity needed, single static bundle is trivial to serve from the same app as the backend |
| Backend | Python, FastAPI | REST API: Genie proxy, reads, governed writes, ingestion webhook, role/session | Python has first-class Databricks SDK + SQL connector support; FastAPI gives typed request/response contracts with minimal boilerplate |
| App hosting | Databricks Apps | Serves the built frontend + runs the FastAPI backend as one deployable unit inside the Databricks workspace | Zero extra infrastructure, workspace-native auth to Databricks resources, matches the "no paid tier, no extra infra" constraint |
| Data platform | Databricks Lakehouse (Delta Lake) | Storage for all 7 governed tables | Required by project scope; Delta is the native storage format |
| Governance | Unity Catalog | Table registration, column comments/synonyms, access control | Required by project scope; source of the "governed data" guarantee |
| Query execution | Databricks Serverless SQL Warehouse | Executes both Genie-generated SQL and the backend's direct read/write SQL | Single shared compute path keeps Genie and the app querying identical live state |
| NL intelligence | Databricks Genie (Genie Space + Conversation API) | Converts natural-language questions into SQL over the governed schema | Core product requirement; must not be replaced with a generic LLM |
| Backend↔Databricks integration | Databricks SDK for Python (`databricks-sdk`) + `databricks-sql-connector` | Genie Conversation API calls (SDK) and direct parameterized SQL (connector) | Official, minimal-dependency path for both read/write SQL and Genie conversations |
| External ingestion trigger | Google Forms + Google Apps Script (bound script) | Student event registration; triggers attendance ingestion on submit | Explicitly specified integration; Apps Script's `onFormSubmit` trigger gives an immediate webhook without polling |
| Role/session | Signed, short-lived cookie issued by the backend | Distinguishes student vs. club head/council for write authorization | Matches product scope: no account system, but writes must still be enforced server-side |

---

## System Overview

The product is a single Databricks App: a React SPA served as static assets, backed by a
FastAPI process running in the same app deployment. The backend is the only component that
talks to Databricks. It has two distinct data paths that must never merge:

- **Query path (read-only, NL):** frontend → backend → Genie Conversation API → SQL
  warehouse → Unity Catalog tables → answer + SQL back to backend → frontend.
- **Direct path (reads and governed writes):** frontend → backend → SQL warehouse (direct
  parameterized SQL) → Unity Catalog tables → result back to backend → frontend.

A third path exists only for ingestion: Google Form → linked Google Sheet → Apps Script
`onFormSubmit` trigger → HTTPS webhook call into the backend's ingestion endpoint → backend
runs a direct INSERT against `event_attendance` via the same SQL warehouse. This is the only
externally-triggered write in the system, and it goes through the exact same
application-controlled write path as any other governed write — it is not a separate
ingestion pipeline or scheduled job.

```
                         ┌─────────────────────────┐
                         │        Browser           │
                         │  React SPA (frontend)     │
                         └────────────┬─────────────┘
                                      │ HTTPS (REST, JSON)
                                      ▼
                         ┌─────────────────────────┐
                         │   FastAPI backend         │
                         │  (Databricks App runtime) │
                         │                            │
                         │  /api/genie/ask  ───────┐  │
                         │  /api/events (GET)       │  │
                         │  /api/rooms/availability  │  │
                         │  /api/teachers/availability│ │
                         │  /api/bookings (POST)     │  │
                         │  /api/events (POST)       │  │
                         │  /api/ingest/attendance    │ │  ← Apps Script webhook
                         │  /api/session (role)       │  │
                         └───────┬──────────┬─────────┘
                                 │          │
                 direct SQL      │          │  Genie Conversation API
                 (reads+writes)  │          │  (NL question → SQL → answer)
                                 ▼          ▼
                         ┌─────────────────────────┐
                         │  Serverless SQL Warehouse │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │      Unity Catalog        │
                         │  campus schema, 7 tables   │
                         │  clubs, events,            │
                         │  event_attendance, rooms,   │
                         │  room_bookings,             │
                         │  teacher_timetable, students│
                         └─────────────────────────┘
                                      ▲
                                      │ INSERT via /api/ingest/attendance
                         ┌─────────────────────────┐
                         │ Google Form → Sheet →      │
                         │ Apps Script (onFormSubmit) │
                         └─────────────────────────┘
```

---

## System Boundaries

| Component / Area | Owns | May Depend On | Must NOT |
|---|---|---|---|
| Frontend (React SPA) | UI rendering, client-side state, calling backend REST endpoints | Backend REST contract only | Call Databricks, Genie, or the SQL warehouse directly; hold any Databricks credential; implement business/authorization logic |
| Backend (FastAPI) | All REST endpoints, all SQL execution, all Genie Conversation API calls, role/session issuance and verification, ingestion webhook handling | Unity Catalog schema/table names (from Data Platform), Genie Space ID (from Data Platform) | Allow Genie to execute a write; allow any write endpoint to run without a verified role; expose Databricks credentials to the client |
| Data Platform (Unity Catalog, Delta tables, Genie Space) | Table schema, seed data, column comments/synonyms, Genie Space instructions, trusted SQL functions, benchmarks | Nothing (foundational) | Contain application logic; be modified by frontend or ingestion workstreams directly |
| Genie (Genie Space) | Translating NL questions into SQL and returning grounded answers over the governed schema | Unity Catalog schema as configured by Data Platform | Perform INSERT/UPDATE/DELETE; be used as a general-purpose chatbot; be called directly by the frontend |
| Ingestion (Google Form + Apps Script) | Capturing the registration form response and calling the ingestion webhook | Backend's `/api/ingest/attendance` contract | Write directly to Delta tables; bypass the backend |
| SQL Warehouse | Executing all SQL (Genie's and the backend's) against Unity Catalog | Unity Catalog | Be queried by anything other than Genie and the backend |

---

## Folder Structure

```
campus-companion/
├── context/                          → product/architecture context (this workstream set)
│   ├── project-overview.md
│   ├── architecture.md
│   ├── data-contracts.md             → (to be produced separately; schema owned by Data Platform workstream)
│   └── build-plan.md                 → (to be produced separately)
│
├── data-platform/                    → OWNED BY: Data Platform workstream
│   ├── notebooks/
│   │   ├── 01_create_schema.sql      → catalog/schema/table DDL, Unity Catalog registration
│   │   ├── 02_seed_data.sql          → seed rows for clubs, events, rooms, teacher_timetable, students
│   │   └── 03_trusted_functions.sql  → certified SQL functions (e.g. room_is_free(room_id, ts))
│   ├── genie/
│   │   ├── instructions.md           → Genie Space instructions text (source of truth, pasted into Genie UI)
│   │   └── synonyms.md               → synonym/term mapping reference
│   └── benchmarks/
│       └── question_sql_pairs.md     → question→expected SQL test set used to validate Genie
│
├── backend/                          → OWNED BY: Backend workstream
│   ├── app/
│   │   ├── main.py                   → FastAPI app entrypoint, mounts routers + static frontend
│   │   ├── config.py                 → env var loading (warehouse id, genie space id, secrets)
│   │   ├── db.py                     → SQL warehouse connection helper (databricks-sql-connector)
│   │   ├── genie_client.py           → Genie Conversation API wrapper (databricks-sdk)
│   │   ├── auth.py                   → role/session cookie issuance + verification
│   │   ├── routers/
│   │   │   ├── genie.py              → POST /api/genie/ask
│   │   │   ├── events.py             → GET /api/events, POST /api/events
│   │   │   ├── rooms.py              → GET /api/rooms/availability, POST /api/bookings
│   │   │   ├── teachers.py           → GET /api/teachers/availability
│   │   │   ├── ingest.py             → POST /api/ingest/attendance
│   │   │   └── session.py            → POST /api/session (role selection)
│   │   └── models.py                 → Pydantic request/response models (mirrors Integration Contracts)
│   ├── tests/
│   │   └── test_contracts.py         → contract-shape tests for each endpoint
│   ├── requirements.txt
│   └── app.yaml                      → Databricks App runtime config (entrypoint, env)
│
├── frontend/                         → OWNED BY: Frontend workstream
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                   → top-level routing between the 3 surfaces
│   │   ├── pages/
│   │   │   ├── NewsletterHome.tsx
│   │   │   ├── AskGenie.tsx
│   │   │   └── AdminPanel.tsx
│   │   ├── components/
│   │   │   ├── EventCard.tsx
│   │   │   ├── RoomAvailabilityTable.tsx
│   │   │   ├── GenieAnswer.tsx       → renders answer + SQL/data basis
│   │   │   └── RoleGate.tsx          → shows/hides admin entry point based on session role
│   │   ├── api/
│   │   │   └── client.ts             → typed fetch wrappers matching Integration Contracts exactly
│   │   └── styles/
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── ingestion/                        → OWNED BY: Ingestion & Integration workstream
│   ├── apps-script/
│   │   └── on_form_submit.gs         → bound Apps Script, calls /api/ingest/attendance on submit
│   ├── form-config-notes.md          → Google Form field → payload field mapping
│   └── demo-script.md                → step-by-step live demo rehearsal script
│
├── deploy/                           → OWNED BY: Ingestion & Integration workstream
│   └── databricks_app_deploy.md      → deployment steps for Databricks Apps
│
└── README.md
```

---

## Workstream Boundaries

### Data Platform

**Responsibility**
Stand up the governed data foundation: Unity Catalog schema, all 7 Delta tables with seed
data, column comments/synonyms, and the Genie Space (instructions, synonyms, trusted SQL
functions, benchmark question set).

**Owns**
`data-platform/`, the Unity Catalog schema and tables themselves, the Genie Space
configuration, `context/data-contracts.md`.

**Consumes**
Nothing — this is the foundation.

**Produces**
- Final table names/columns (published in `data-contracts.md`).
- A working Genie Space ID.
- Seed data sufficient for every flow in `project-overview.md` to be demonstrable.
- The `room_is_free(room_id, ts)` trusted SQL function (and any other trusted assets
  needed for room/teacher availability).

**Dependencies**
None.

**Must Not Modify**
`backend/`, `frontend/`, `ingestion/`.

**Definition of Done**
All 7 tables exist in Unity Catalog with realistic seed data; the Genie Space answers the
benchmark question set correctly when tested directly in the Databricks UI; table/column
names are frozen and published in `data-contracts.md`.

---

### Backend (API)

**Responsibility**
Implement every REST endpoint in the Integration Contracts section: the Genie proxy, the
direct read endpoints, the governed write endpoints, the ingestion webhook, and role/session
handling. Serve the built frontend as static assets from the same app.

**Owns**
`backend/`.

**Consumes**
Table/column names and Genie Space ID from Data Platform (`context/data-contracts.md`).

**Produces**
The REST API described in Integration Contracts, stable for Frontend and Ingestion to build
against.

**Dependencies**
Data Platform must have frozen table names and a working Genie Space ID before the backend's
Genie proxy and read/write endpoints can be finished end-to-end (endpoints can be scaffolded
against the contract earlier).

**Must Not Modify**
`frontend/src/`, `data-platform/`, Genie Space configuration.

**Definition of Done**
Every endpoint in Integration Contracts is implemented, matches its documented
request/response shape exactly, enforces role checks on writes, and returns the documented
error shape on failure (Genie unavailable, warehouse unavailable, permission denied, booking
conflict).

---

### Frontend

**Responsibility**
Implement the three user-facing surfaces (Newsletter Home, Ask Genie, Admin Panel) purely
against the backend REST contract.

**Owns**
`frontend/`.

**Consumes**
The REST contract defined in Integration Contracts. May build against a mocked version of
the contract before the backend is complete.

**Produces**
A built static bundle the backend serves.

**Dependencies**
None blocking — can start immediately using the frozen contract shapes, and swap from mocks
to the live backend once available.

**Must Not Modify**
`backend/app/`, `data-platform/`.

**Definition of Done**
All three surfaces are implemented per `project-overview.md`'s flows, every network call
goes through `frontend/src/api/client.ts`, and no component calls Databricks or Genie
directly. Genie answers visibly render their SQL/data basis. Write actions are only
reachable after a role has been selected via `/api/session`.

---

### Ingestion & Integration

**Responsibility**
Wire the Google Form to the ingestion endpoint, validate the full end-to-end demo loop
(register → ingest → live update), and own deployment of the finished app to Databricks
Apps.

**Owns**
`ingestion/`, `deploy/`.

**Consumes**
The `/api/ingest/attendance` contract from Backend; the deployed app from Backend/Frontend.

**Produces**
A working Google Form linked to a Sheet with a bound Apps Script that calls the ingestion
endpoint on every submission; a deployment of the full app on Databricks Apps; a rehearsed
demo script.

**Dependencies**
Backend's ingestion endpoint must exist (even a stub matching the contract) before this
workstream can wire and test the webhook; final integration testing requires
Frontend + Backend + Data Platform all present.

**Must Not Modify**
`data-platform/` tables directly, `backend/app/`, `frontend/src/`.

**Definition of Done**
Submitting the live Google Form results in the attendance count changing and being
observable via both a Genie question and the Newsletter Home, with no manual steps; the app
is deployed and reachable via a single URL; the demo script has been run start-to-finish
successfully at least once.

---

## Dependency Graph

```
Data Platform  ──(hard)──▶  Backend  ──(hard)──▶  Frontend
                    │                       │
                    └────(hard)────▶  Ingestion & Integration
                                            ▲
                                            │ (integration point only,
                                            │  not a code dependency)
                                       Frontend
```

- **Hard dependency:** Backend cannot be considered *complete* without Data Platform's
  frozen table names and Genie Space ID — but Backend can scaffold all endpoints against
  the Integration Contracts immediately, in parallel with Data Platform's work.
- **Hard dependency:** Frontend and Ingestion both build against Backend's contract, not
  Backend's implementation — both can start immediately using the frozen contract shapes
  and only need the live backend for final integration.
- **Integration point:** Frontend and Ingestion do not depend on each other directly; they
  only meet at the deployed app during final integration testing.

**Minimum foundation before parallel work begins:** the Integration Contracts section of
this document (already defined below) plus a first pass at `data-contracts.md` table/column
names from Data Platform. Once those two things exist, all four workstreams can proceed
independently.

---

## Data Flow

### 1. Normal frontend data retrieval (Newsletter Home)
1. **Initiator:** Browser loads Newsletter Home.
2. **Components involved:** Frontend → Backend (`GET /api/events`, `GET
   /api/rooms/availability`).
3. **Data movement:** Backend runs parameterized SELECTs against `events`,
   `event_attendance`, `rooms`, `room_bookings` via the SQL warehouse; returns JSON.
4. **Validation:** None required (read-only, no user input beyond optional filters).
5. **Result:** Frontend renders event cards with live attendance counts and a room
   availability snapshot.
6. **Failure behavior:** If the warehouse call fails, backend returns a documented error
   shape; frontend shows "Live data unavailable — try again shortly" instead of stale or
   fabricated data.

### 2. Natural-language Genie query
1. **Initiator:** User submits a question on the Ask Genie surface.
2. **Components involved:** Frontend → Backend (`POST /api/genie/ask`) → Genie Conversation
   API → SQL warehouse → Unity Catalog.
3. **Data movement:** Backend forwards the question text to Genie via the Databricks SDK;
   Genie generates and executes SQL against the governed schema; Genie returns the answer
   text, result rows, and the SQL it ran.
4. **Validation:** Backend does not attempt to validate or rewrite the question; it passes
   it through as-is.
5. **Result:** Frontend renders the answer plus the SQL/result basis.
6. **Failure behavior:** If Genie cannot produce an answer (ambiguous question, timeout, no
   matching data) the backend returns the documented "no answer" shape; frontend shows "I
   couldn't find a governed answer to that" — never an invented answer.

### 3. Event/attendance registration (live ingestion loop)
1. **Initiator:** Student submits the Google Form.
2. **Components involved:** Google Form → linked Sheet → Apps Script (`onFormSubmit`) →
   Backend (`POST /api/ingest/attendance`) → SQL warehouse → `event_attendance` table.
3. **Data movement:** Apps Script posts the form response (event identifier + registrant
   info) as JSON to the ingestion endpoint; backend executes an INSERT.
4. **Validation:** Backend verifies the payload includes a known `event_id` and a shared
   ingestion token (see Integration Contracts); rejects otherwise.
5. **Result:** `event_attendance` row count for that event increases immediately.
6. **Failure behavior:** If the INSERT fails, backend returns a 5xx to Apps Script (which
   logs it); no partial/duplicate row is committed. If the webhook itself fails to fire,
   the count simply does not update — no fallback fabrication occurs.

### 4. Dynamic data ingestion/update (reflected read)
1. **Initiator:** Any subsequent read (Newsletter Home refresh, or a new Genie question
   about the same event).
2. **Components involved:** Frontend/Genie → Backend/Genie → SQL warehouse →
   `event_attendance`.
3. **Data movement:** A fresh SELECT/aggregate is executed; because there is no cache, it
   reflects the row inserted in Flow 3 immediately.
4. **Validation:** None beyond normal query execution.
5. **Result:** Updated count is shown to the user.
6. **Failure behavior:** Same as Flow 1/2.

### 5. Room availability
1. **Initiator:** User asks via Ask Genie ("which labs are free at 3pm") or the Admin Panel
   checks before booking.
2. **Components involved:** Genie path or Backend direct-read path (`GET
   /api/rooms/availability`) → SQL warehouse → `rooms`, `room_bookings` (via the
   `room_is_free` trusted function where used by Genie).
3. **Data movement:** Query filters rooms with no overlapping booking for the requested
   time.
4. **Validation:** Time input is parsed/validated by the backend for the direct-read path;
   Genie handles its own parsing for the NL path.
5. **Result:** List of free rooms/labs returned.
6. **Failure behavior:** Empty result is a valid, correctly-rendered answer ("no rooms
   free"); a query failure is shown as an explicit error, not as "no rooms free."

### 6. Teacher availability
1. **Initiator:** User asks via Ask Genie whether a named teacher is free at a given time.
2. **Components involved:** Genie → SQL warehouse → `teacher_timetable`.
3. **Data movement:** Genie resolves the teacher name and checks the timetable for
   overlapping scheduled time.
4. **Validation:** Genie-side name/time resolution (governed by Genie Space instructions
   and synonyms, owned by Data Platform).
5. **Result:** Direct yes/no with the relevant schedule context.
6. **Failure behavior:** Ambiguous teacher name (e.g. no match) returns Genie's "no answer"
   shape; frontend prompts the user to rephrase.

### 7. Authorised event/room editing (governed write)
1. **Initiator:** Club head/council user submits the Admin Panel's create-event or
   book-room form.
2. **Components involved:** Frontend → Backend (`POST /api/events` or `POST /api/bookings`)
   → SQL warehouse → `events`/`room_bookings`.
3. **Data movement:** Backend validates the request body, checks the session role, and
   (for bookings) checks for an overlapping booking before executing an INSERT.
4. **Validation:** Role must be `council` (verified server-side from the signed session
   cookie, not from any client-supplied field); for bookings, no existing `room_bookings`
   row may overlap the requested room/time.
5. **Result:** New row committed; response includes the created record.
6. **Failure behavior:** Missing/invalid role → 403 with documented error shape; booking
   conflict → 409 with the conflicting booking's details; downstream query failure → 5xx.
   No write is partially applied.

### 8. Authentication and authorization (role selection)
1. **Initiator:** User opens the Admin Panel or otherwise indicates they are a club
   head/council member.
2. **Components involved:** Frontend → Backend (`POST /api/session`).
3. **Data movement:** Frontend sends the shared council access code entered by the user;
   backend compares it to the server-side `COUNCIL_ACCESS_CODE` env var.
4. **Validation:** Code must match exactly; no code, or an incorrect code, results in a
   `student` role being issued (never `council`).
5. **Result:** Backend issues a signed, short-lived session cookie encoding the role;
   frontend does not need to (and must not) determine role itself.
6. **Failure behavior:** Incorrect code → student-only session; cookie tampering is
   detected via signature verification and treated as `student`.

### 9. Frontend ↔ Databricks integration
The frontend never talks to Databricks directly. All flows above route exclusively through
the backend's REST endpoints. This is a hard invariant, not a convenience default.

---

## Integration Contracts

All endpoints are served by the backend under `/api`. All request/response bodies are
JSON. All write endpoints require the session cookie issued by `/api/session`.

### Contract: Ask Genie
**Producer:** Backend (`POST /api/genie/ask`)
**Consumer:** Frontend
**Purpose:** Submit a natural-language campus question and receive a grounded answer.
**Input:**
```json
{ "question": "Which labs are free at 3pm today?" }
```
**Output (success):**
```json
{
  "status": "ok",
  "answer": "The Robotics Lab and Lab 204 are free at 3pm today.",
  "sql": "SELECT r.name FROM rooms r WHERE ...",
  "rows": [{ "name": "Robotics Lab" }, { "name": "Lab 204" }]
}
```
**Output (no answer):**
```json
{ "status": "no_answer", "message": "Genie could not find a governed answer to that question." }
```
**Error behavior:** Genie/warehouse failure returns HTTP 502 with
`{ "status": "error", "message": "..." }`. The frontend must render `no_answer` and `error`
distinctly from a successful answer, and must never synthesize its own answer.
**Ownership:** Backend owns implementation; shape is frozen by this contract.
**Stability requirement:** Field names (`status`, `answer`, `sql`, `rows`, `message`) are
fixed for the hackathon; do not rename.

---

### Contract: List events
**Producer:** Backend (`GET /api/events`)
**Consumer:** Frontend
**Purpose:** Power the Newsletter Home event list with live attendance counts.
**Input:** none (optionally `?upcoming=true`, defaulting to true).
**Output:**
```json
{
  "events": [
    {
      "event_id": "evt_001",
      "name": "AI Workshop",
      "club": "AI Club",
      "start_ts": "2026-09-05T15:00:00",
      "room": "Auditorium",
      "attendance_count": 42
    }
  ]
}
```
**Error behavior:** Query failure → HTTP 502, `{ "events": [], "error": "..." }`. Frontend
shows an explicit error state, not an empty-events state, when `error` is present.
**Ownership:** Backend.
**Stability requirement:** Field names fixed.

---

### Contract: Room availability
**Producer:** Backend (`GET /api/rooms/availability`)
**Consumer:** Frontend
**Purpose:** Power the Newsletter Home snapshot and pre-booking checks in the Admin Panel.
**Input:** optional query params `type` (e.g. `lab`), `at` (ISO timestamp; defaults to now).
**Output:**
```json
{ "at": "2026-09-05T15:00:00", "free_rooms": [{ "room_id": "r_204", "name": "Lab 204", "type": "lab" }] }
```
**Error behavior:** HTTP 502 with `{ "free_rooms": [], "error": "..." }`.
**Ownership:** Backend.
**Stability requirement:** Field names fixed.

---

### Contract: Teacher availability
**Producer:** Backend (`GET /api/teachers/availability`)
**Consumer:** Frontend
**Purpose:** Direct (non-Genie) teacher availability check, used as a fallback/simple
lookup surface if needed by the Admin Panel; the primary teacher-availability experience is
via Ask Genie (Flow 6).
**Input:** query params `teacher_name`, `at` (ISO timestamp).
**Output:**
```json
{ "teacher_name": "Prof. Rao", "at": "2026-09-05T15:00:00", "available": true }
```
**Error behavior:** Unknown teacher name → HTTP 404,
`{ "error": "teacher_not_found" }`. Query failure → HTTP 502.
**Ownership:** Backend.
**Stability requirement:** Field names fixed.

---

### Contract: Create booking
**Producer:** Backend (`POST /api/bookings`)
**Consumer:** Frontend (Admin Panel)
**Purpose:** Governed room booking by an authorised club head/council user.
**Input:**
```json
{ "room_id": "r_204", "event_id": "evt_001", "start_ts": "2026-09-05T15:00:00", "end_ts": "2026-09-05T17:00:00" }
```
**Output (success):** HTTP 201,
```json
{ "booking_id": "bk_010", "room_id": "r_204", "event_id": "evt_001", "start_ts": "...", "end_ts": "..." }
```
**Error behavior:**
- No/invalid role → HTTP 403, `{ "error": "forbidden" }`.
- Conflicting booking → HTTP 409, `{ "error": "conflict", "conflicting_booking": { ... } }`.
- Query failure → HTTP 502.
**Ownership:** Backend enforces role and conflict checks; not delegable to the frontend.
**Stability requirement:** Field names fixed; role check must never be bypassable by
omitting or altering client-side UI state.

---

### Contract: Create event
**Producer:** Backend (`POST /api/events`)
**Consumer:** Frontend (Admin Panel)
**Purpose:** Governed event creation by an authorised club head/council user.
**Input:**
```json
{ "name": "AI Workshop", "club": "AI Club", "start_ts": "2026-09-05T15:00:00", "room_id": "r_204", "topic": "AI" }
```
**Output (success):** HTTP 201,
```json
{ "event_id": "evt_002", "name": "AI Workshop", "club": "AI Club", "start_ts": "...", "room_id": "r_204", "topic": "AI" }
```
**Error behavior:** Same role-check pattern as Create booking (403 for missing/invalid
role); HTTP 502 on query failure.
**Ownership:** Backend.
**Stability requirement:** Field names fixed.

---

### Contract: Attendance ingestion webhook
**Producer:** Ingestion (Apps Script) as caller; Backend (`POST /api/ingest/attendance`) as
implementer.
**Consumer:** Backend (implements), Ingestion (calls).
**Purpose:** Record a new event registration/attendance row the moment the Google Form is
submitted.
**Input:**
```json
{
  "token": "shared-ingestion-secret",
  "event_id": "evt_001",
  "registrant_name": "Aditi",
  "registrant_email": "aditi@example.edu",
  "submitted_at": "2026-09-05T14:58:00"
}
```
**Output (success):** HTTP 201, `{ "status": "ok", "attendance_id": "att_1042" }`.
**Error behavior:**
- Missing/incorrect `token` → HTTP 401, `{ "status": "unauthorized" }`.
- Unknown `event_id` → HTTP 404, `{ "status": "unknown_event" }`.
- Query failure → HTTP 502, `{ "status": "error" }`.
**Ownership:** Backend owns the endpoint and the INSERT logic; Ingestion owns the Apps
Script caller and must match this payload shape exactly.
**Stability requirement:** The `token` field is the only authorization mechanism for this
endpoint; it must be treated as a secret (see Environment Configuration) and never logged
or exposed client-side.

---

### Contract: Session / role selection
**Producer:** Backend (`POST /api/session`)
**Consumer:** Frontend
**Purpose:** Let a user identify as club head/council for the duration of their session,
without a full account system.
**Input:**
```json
{ "access_code": "optional-club-code" }
```
**Output:** HTTP 200, sets a signed HTTP-only session cookie; body:
```json
{ "role": "council" }
```
or
```json
{ "role": "student" }
```
**Error behavior:** This endpoint never errors — any invalid/missing code simply results in
`role: "student"`. It is not a login form and must not imply failure to the user.
**Ownership:** Backend owns cookie signing and role derivation; the frontend must treat the
returned `role` (not any client-held state) as authoritative for which UI to show, and the
backend independently re-verifies the cookie on every write endpoint regardless of what the
frontend displays.
**Stability requirement:** Cookie is HTTP-only and signed; field name `role` fixed.

---

## Database / Data Storage Architecture

- **Storage technology:** Delta Lake tables registered in Unity Catalog, in a single
  catalog and schema (e.g. `<catalog>.campus`) containing exactly the 7 tables named in
  `project-overview.md`: `clubs`, `events`, `event_attendance`, `rooms`, `room_bookings`,
  `teacher_timetable`, `students`.
- **Table organization:** Flat — one schema, no per-environment duplication, no staging
  layer. This is a hackathon dataset, not a multi-stage pipeline; seed data is loaded
  directly into these tables by Data Platform's setup notebooks.
- **Read/write boundaries:** Genie only ever issues SELECT-class queries (enforced by
  Genie's own read-only query generation and by not granting it any write-capable
  identity/warehouse permission beyond SELECT). The backend is the only component that
  issues INSERT statements, and only through the specific, reviewed SQL in the write
  endpoints (`/api/bookings`, `/api/events`, `/api/ingest/attendance`).
- **Ingestion paths:** The only ingestion path during the hackathon is the webhook-driven
  INSERT described in Flow 3. There is no batch/scheduled ingestion job.
- **Transformation boundaries:** No transformation layer exists; tables are queried and
  written to directly in their seed/registered shape. Any derived value (e.g. attendance
  count per event) is computed at query time via aggregation, not materialized.
- **Query access patterns:** Point lookups and small aggregations only (per-event counts,
  per-room/time overlap checks, per-teacher timetable checks) — all cheap enough for a
  serverless SQL warehouse at hackathon data volumes.
- **Ownership:** Data Platform owns table definitions and seed data; Backend owns all query
  and mutation logic against those tables; no other component issues SQL.
- **Environment separation:** None. A single workspace/catalog/schema is used for
  development and the demo; there is no separate production environment for this hackathon.

---

## Databricks Architecture

- **Delta tables:** The 7 tables are the sole system of record. All reads and writes in the
  entire product ultimately resolve to these tables.
- **Unity Catalog:** Registers the 7 tables, holds column comments used by Genie for
  disambiguation, and is the governance boundary — Genie and the backend's service
  identity are both granted access exclusively through Unity Catalog permissions, and
  nothing outside this catalog/schema is in scope.
- **SQL warehouse (serverless):** The single query execution engine used by both Genie
  (for NL-generated SQL) and the backend (for direct reads/writes). One warehouse is
  sufficient; no separate warehouses per workload.
- **Genie / Genie Space:** Configured once by Data Platform with: table/column
  descriptions, instructions and synonyms (e.g. "free room", "prof", "CS"), trusted SQL
  functions (`room_is_free(room_id, ts)` and any others needed for availability
  questions), and a benchmark question set used to validate accuracy before the demo. The
  backend talks to this Genie Space exclusively via the Genie Conversation API — it never
  reconfigures the space at runtime.
- **Ingestion pipelines:** None in the traditional sense. The single ingestion event
  (attendance) is a synchronous INSERT triggered by the webhook, not a pipeline or job.
- **Databricks Apps:** Hosts the entire application (built frontend static assets + FastAPI
  backend process) as one deployable unit inside the workspace, giving the backend
  workspace-scoped credentials to reach the SQL warehouse and Genie without managing
  separate secrets infrastructure.
- **Direction of data flow:** Writes flow strictly `Ingestion/Admin Panel → Backend → SQL
  Warehouse → Delta tables`. Reads flow strictly `Delta tables → SQL Warehouse → (Genie or
  Backend) → Frontend`. Genie only participates in the read direction.
- **Responsibility summary:**
  - *Reads data:* Genie, Backend (direct SQL).
  - *Writes data:* Backend only (direct SQL, three specific write endpoints).
  - *Transforms data:* Nobody — no transformation layer exists.
  - *Queries data:* Genie (NL-driven), Backend (parameterized SQL).
  - *Governs access:* Unity Catalog.
  - *Provides NL interaction:* Genie exclusively.

---

## Authentication and Authorization

- **Authentication mechanism:** None for end users — per `project-overview.md`, the product
  explicitly excludes account systems and login. The only "authentication" concept is a
  single shared access code (`COUNCIL_ACCESS_CODE`) that grants the `council` role for the
  session.
- **Session/user identity:** A signed, HTTP-only cookie issued by `POST /api/session`,
  containing only a `role` claim (`student` or `council`) and an expiry. No personal
  identity is stored server-side beyond what a user voluntarily submits on the Google Form.
- **Roles:** `student` (default, no code required) and `council` (requires the correct
  access code).
- **Permissions:**
  - `student`: all read endpoints (`/api/events`, `/api/rooms/availability`,
    `/api/teachers/availability`, `/api/genie/ask`).
  - `council`: everything `student` can do, plus `/api/bookings` (POST) and `/api/events`
    (POST).
- **Protected surfaces:** The Admin Panel is shown in the frontend only when the session
  role is `council`, but this is a UX convenience, not the enforcement mechanism.
- **Protected operations:** `POST /api/bookings` and `POST /api/events` are the only
  protected operations, and both independently re-verify the signed cookie's `role` claim
  server-side before executing any SQL. A request with a missing, expired, invalid, or
  tampered cookie is treated as `student` and rejected with HTTP 403 for these two
  endpoints.
- **Where authorization is enforced:** Exclusively in the backend, at the top of each
  protected route handler, before any query is constructed. The frontend hiding a button is
  never sufficient by itself and must not be relied upon.

---

## Client / Server Patterns

- **Client-side code:** All Databricks/Genie interaction is forbidden on the client. The
  only allowed network calls from `frontend/src` are to the backend's `/api/*` endpoints via
  `frontend/src/api/client.ts`, which contains one typed function per contract in
  Integration Contracts.
- **Server-side code:** All SQL construction and execution, and all Genie Conversation API
  calls, live in `backend/app/`. Route handlers in `backend/app/routers/*` are thin: parse
  input → check role (for writes) → call `db.py`/`genie_client.py` → shape the documented
  response.
- **Data fetching (reads):** Standard `fetch`/`GET` from the frontend to the backend; no
  client-side caching layer beyond simple in-memory component state (no need for a data
  library given the small number of endpoints).
- **Mutations:** Standard `fetch`/`POST` from the frontend; on success, the frontend
  re-fetches the relevant read endpoint (e.g. re-fetch `/api/rooms/availability` after a
  successful booking) rather than optimistically mutating local state, to guarantee the UI
  reflects the single source of truth.
- **API calls example (frontend):**
  ```ts
  // frontend/src/api/client.ts
  export async function askGenie(question: string) {
    const res = await fetch("/api/genie/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    return res.json(); // shape per "Contract: Ask Genie"
  }
  ```
- **Environment variables:** Only ever read on the backend (`backend/app/config.py`). The
  frontend receives configuration, if any, only through backend-served responses — never
  through a client-side `.env` containing Databricks values.
- **Privileged operations:** Genie Conversation API calls and all SQL execution are
  privileged operations and exist only in `backend/app/genie_client.py` and
  `backend/app/db.py` respectively. No other file may import Databricks SDK or SQL
  connector packages.

---

## External Integrations

### Google Forms + Apps Script
- **Purpose:** Capture student event registrations and trigger the live attendance update.
- **Direction of communication:** Outbound only, from Apps Script (running in Google's
  infrastructure) to the backend's `/api/ingest/attendance` endpoint.
- **Authentication:** A shared secret token (`INGEST_TOKEN`) embedded in the Apps Script
  and checked by the backend on every call.
- **Data format:** JSON payload matching the "Attendance ingestion webhook" contract.
- **Integration boundary:** The backend treats this exactly like any other write request —
  it does not trust the caller beyond the token check, and applies the same validation as
  any other write endpoint.
- **Failure behavior:** If the backend is unreachable or returns an error, Apps Script logs
  the failure (visible in the Apps Script execution log); the form submission itself still
  succeeds from the student's perspective (the Sheet row is written), but the attendance
  count will not update until the ingestion call succeeds — this is called out explicitly
  in the demo script so it can be rehearsed and verified beforehand.
- **Local/development behavior:** During development, the ingestion endpoint can be tested
  directly with a manual HTTP request carrying the same payload shape, without needing a
  live Google Form.

---

## Environment Configuration

| Variable | Purpose | Server/Client | Required? |
|---|---|---|---|
| `DATABRICKS_HOST` | Workspace URL for SDK/SQL connector | Server | Yes |
| `DATABRICKS_TOKEN` / workspace-provided app identity | Auth for SQL warehouse + Genie Conversation API | Server | Yes (provided automatically by Databricks Apps runtime where possible) |
| `SQL_WAREHOUSE_ID` | Target serverless SQL warehouse for backend queries | Server | Yes |
| `GENIE_SPACE_ID` | Target Genie Space for Conversation API calls | Server | Yes |
| `UNITY_CATALOG_SCHEMA` | Fully qualified `catalog.schema` for the 7 tables | Server | Yes |
| `COUNCIL_ACCESS_CODE` | Shared code granting the `council` role | Server | Yes |
| `SESSION_SIGNING_SECRET` | Signs the role session cookie | Server | Yes |
| `INGEST_TOKEN` | Shared secret checked on the attendance ingestion webhook | Server | Yes |

None of these are ever read by, bundled into, or exposed to the frontend build. The
frontend has no `.env` of Databricks-related values. Locally, agents load these from a
`.env` file consumed only by `backend/app/config.py` (via `python-dotenv` or equivalent),
which must be gitignored.

---

## Error and Failure Boundaries

| Failure | Detected By | System Behavior | User Experience |
|---|---|---|---|
| Genie cannot answer / times out | Backend's Genie Conversation API call | Return `status: "no_answer"` or HTTP 502 per contract | "I couldn't find a governed answer to that question." |
| SQL warehouse unavailable | Backend's SQL connector call raises | Return HTTP 502 with documented error shape on the relevant endpoint | "Live data unavailable — try again shortly." |
| Query fails (bad SQL, timeout) | Backend catches exception from `db.py` | Return HTTP 502 | Same as above; never shows partial/stale data as if current |
| Attendance ingestion fails | Backend returns non-2xx to Apps Script | Apps Script logs the failure; no row committed | Student sees the form's normal "response recorded" (Google-side); the count simply does not increase until resolved |
| User lacks permission (student attempts a write) | Backend re-verifies session cookie role | HTTP 403, no query executed | "You don't have permission to do that." Admin Panel is not shown to this user in the first place |
| Booking conflict | Backend's conflict check before INSERT | HTTP 409 with conflicting booking details | "That room is already booked for that time." with the conflicting booking shown |
| Missing/ambiguous data (e.g. unknown teacher) | Backend or Genie returns not-found/no-answer | HTTP 404 or `no_answer` per contract | "I don't have data on that." — never an invented answer |
| Google Form/Apps Script integration itself is down | Apps Script execution log | No ingestion call is made at all | Demo script includes a manual fallback: directly POST to `/api/ingest/attendance` to continue the demo if Apps Script fails during the live show |

---

## Observability and Debugging

- **Backend logging:** Standard Python logging to stdout (captured by the Databricks App
  runtime's log viewer). Every request to a write endpoint or the Genie proxy logs: route,
  role (for writes), and success/failure — never the ingestion token, session secret, or
  Databricks credentials.
- **Genie call tracing:** The backend logs the question sent to Genie and the `status`
  returned (`ok`/`no_answer`/`error`), so a failed demo question can be diagnosed by
  reading the log rather than reproducing it live.
- **SQL error visibility:** SQL exceptions are logged with the failing statement (with
  parameter values, not literal user PII where avoidable) so a broken query can be found
  quickly.
- **Frontend debugging:** Network errors surface in the browser console via standard `fetch`
  rejection handling; no separate frontend error-reporting service is introduced.
- **Ingestion debugging:** Apps Script's built-in execution log is the debugging surface
  for the webhook trigger; the manual-POST fallback (see Error and Failure Boundaries) is
  also the primary debugging tool for isolating "is it the form or the backend."
- No external observability service (e.g. Sentry, Datadog) is introduced — unnecessary for
  a 12-hour, single-deployment hackathon build.

---

## Deployment / Runtime Architecture

- **Frontend:** Built once (`vite build`) into static assets, served directly by the
  FastAPI backend as static files — there is no separate frontend hosting service.
- **Backend/server logic:** Runs as a single FastAPI process inside a Databricks App. The
  Databricks App runtime provides the process's environment variables and workspace-scoped
  credentials.
- **Databricks components:** The serverless SQL warehouse, Unity Catalog schema, and Genie
  Space all run inside the same Databricks workspace as the App; no cross-workspace calls
  are required.
- **Communication:** Browser ↔ Databricks App over HTTPS (single URL for the whole product);
  Databricks App ↔ SQL warehouse/Genie over the workspace-internal Databricks SDK/SQL
  connector paths; Apps Script ↔ Databricks App over HTTPS (the ingestion webhook).
- **Required environment configuration:** As listed in Environment Configuration, set as
  Databricks App environment/secret configuration at deploy time — never committed to the
  repository.
- **Simplest viable arrangement:** One Databricks App = one URL = the entire product's
  runtime surface. This is deliberately the smallest possible deployment topology for the
  12-hour constraint, and it is also what the demo is run from directly (no separate "prod"
  vs. "demo" deployment).

---

## Invariants

1. Genie is the only component permitted to translate a natural-language question into an
   answer; no other component may implement question-answering logic.
2. Genie never executes INSERT/UPDATE/DELETE; all writes originate from the backend's three
   write endpoints (`/api/bookings`, `/api/events`, `/api/ingest/attendance`) only.
3. The frontend never calls Databricks, Genie, or the SQL warehouse directly — every network
   call from the frontend targets a backend `/api/*` endpoint.
4. Every write endpoint independently re-verifies the caller's role from the signed session
   cookie server-side, regardless of what the client UI displays or sends.
5. There is exactly one Unity Catalog schema and one set of 7 tables acting as the sole
   source of truth for both Genie and the application; no cache or secondary store may
   diverge from it.
6. A failed Genie call, SQL call, or ingestion call must produce a visible, explicit failure
   state to the user — never a fabricated or silently stale answer.
7. Secrets (`DATABRICKS_TOKEN`, `SESSION_SIGNING_SECRET`, `INGEST_TOKEN`,
   `COUNCIL_ACCESS_CODE`) are read only by the backend and never appear in frontend code,
   frontend network responses, or logs.
8. Table and column names, once published in `context/data-contracts.md` by the Data
   Platform workstream, are frozen for the duration of the hackathon; any change must be
   re-published before other workstreams may rely on it.
9. The Integration Contracts in this document are the only interface other workstreams may
   assume; no workstream may depend on another's internal implementation details.
10. The attendance ingestion webhook is the only externally-triggered write path in the
    system; no other external service may write to the governed tables.

---

## Architectural Decisions

**Decision:** Host the entire product (frontend + backend) as a single Databricks App.
**Reason:** Matches the project's own "zero-infra" positioning, avoids managing a separate
frontend host and CORS configuration, and gives the backend workspace-native access to the
SQL warehouse and Genie without a separate secrets pipeline.
**Trade-off:** Less flexibility to scale frontend and backend independently.
**Alternative rejected:** Separate static frontend host (e.g. Vercel/Netlify) calling a
standalone backend — adds a deployment target and a CORS/auth boundary with no benefit at
hackathon scale.

**Decision:** Use a lightweight FastAPI backend as a mandatory intermediary between the
frontend and Databricks/Genie, rather than letting the frontend call Genie's Conversation
API directly.
**Reason:** Keeps Databricks credentials server-side only, gives one place to enforce the
read/write and role boundaries, and gives one place to shape Genie's raw response into the
product's answer/SQL/rows contract.
**Trade-off:** One extra network hop per request versus a client-direct integration.
**Alternative rejected:** Frontend directly authenticating to Databricks — would require
distributing workspace credentials to the browser, violating the no-secrets-on-client
invariant.

**Decision:** Google Apps Script webhook (event-driven) instead of a scheduled
notebook/job polling the linked Google Sheet.
**Reason:** The product's differentiator is a live, immediate "+1 on submit" update; a
scheduled poll would add latency and complexity (job scheduling, incremental-read
tracking) disproportionate to a 12-hour build.
**Trade-off:** Dependent on Apps Script's trigger reliability, with a documented manual
fallback for the demo.
**Alternative rejected:** Databricks Lakeflow Connect / notebook polling of the Sheet — more
"native" to Databricks but heavier to build and slower to reflect updates than the demo
requires.

**Decision:** Role handling via a single shared access code and a signed cookie, rather
than any real authentication provider.
**Reason:** `project-overview.md` explicitly excludes account systems, but write actions
still need real, non-UI-only enforcement; a signed cookie with server-side re-verification
satisfies both constraints with minimal implementation cost.
**Trade-off:** Not a real multi-user identity system; anyone with the access code has full
council privileges for their session.
**Alternative rejected:** Full OAuth/user accounts — explicitly out of scope and unnecessary
for a single-code role distinction.

**Decision:** A single shared Unity Catalog schema/warehouse for both Genie and the
backend's direct SQL, with no separate read replica or cache layer.
**Reason:** Guarantees Genie and the application always see identical, current state —
directly required by the "immediately reflected" success criteria in
`project-overview.md`.
**Trade-off:** All load (Genie + app reads + app writes) shares one warehouse; acceptable
at hackathon data/traffic volumes.
**Alternative rejected:** A separate application database synced from Delta — would
introduce a second source of truth and directly violate the product's grounding guarantee.
