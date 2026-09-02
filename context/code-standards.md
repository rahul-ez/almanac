# Code Standards

## Engineering Principles

- **Simplicity.** The simplest implementation that satisfies the requirement wins. This is
  a 12-hour build with four parallel agents — every layer of indirection is a place
  integration can silently drift.
- **Correctness over cleverness.** Code must match `data-contracts.md`'s semantics exactly
  (half-open intervals, `attendance_count` as raw row count, status filtering) even when a
  looser reading would be easier to write.
- **Explicitness.** No implicit coercion of types, no silently-defaulted business logic, no
  "magic" behavior a teammate would have to read the implementation to discover. Prefer a
  named constant or explicit branch over an inferred one.
- **Predictable behavior.** The same input produces the same output; the same component
  behaves identically wherever it's used (see `ui-registry.md`); the same error condition
  always produces the same documented response shape.
- **Maintainability within scope.** Code should be easy for a teammate to read cold, not
  necessarily easy to extend past the hackathon. Don't build for requirements that don't
  exist yet.
- **Security is non-negotiable, not a phase.** Role checks, secret handling, and Genie's
  read-only boundary are enforced from the first line of code that touches them, never
  retrofitted later.
- **Debuggability.** Every failure must be traceable from a log line or a documented error
  shape — never a silent `except: pass` or an unexplained blank UI state.
- **Reuse where it genuinely helps.** Use `ui-registry.md`'s components and this file's
  patterns; do not invent a parallel way to do something already standardized.
- **Minimal abstraction.** No factories, no dependency-injection containers, no generic
  "framework" layers for a product with three pages and seven tables. A function and a
  clear file boundary are usually enough.
- **Integration safety.** A change that alters a documented interface (REST contract,
  component prop, data field) is treated as a breaking change and follows the process in
  `architecture.md` / `ui-tokens.md` / `ui-registry.md`, not a silent edit.

---

## Technology-Specific Standards

Only the technologies named in `architecture.md`'s Stack table are used. No agent
introduces an additional framework, state library, ORM, or build tool.

### Frontend — React (Vite, TypeScript)
- Function components with hooks only. No class components.
- TypeScript strict mode on. No `any` except at a genuinely untyped boundary (e.g. a raw
  Genie result row), and even then it's narrowed immediately into a typed shape.
- Styling is Tailwind utility classes generated from `ui-tokens.md`'s token config, per
  that file's Implementation Format. No CSS-in-JS, no separate CSS modules per component
  beyond `tokens.css`.
- Data fetching uses plain `fetch` through `frontend/src/api/client.ts` only (per
  `architecture.md`). No React Query, SWR, Redux, or Zustand — the number of endpoints and
  the polling need (Newsletter Home, 15s) don't justify a data-fetching library.
- Icons from `lucide-react` exclusively, sized and stroked per `ui-tokens.md`.

### Backend — Python, FastAPI
- Python 3.11+, fully type-hinted (function signatures, Pydantic models). `mypy`/editor
  type-checking is advisory, not a build gate, given the time budget.
- Pydantic models for every request/response body, mirroring `architecture.md`'s
  Integration Contracts field-for-field. A route handler never returns a raw dict for a
  documented contract.
- Route handlers are thin: parse/validate input → check role (writes only) → call
  `db.py`/`genie_client.py` → shape the documented response. No business logic embedded in
  a route function beyond that sequence.
- One FastAPI router per resource area, matching `architecture.md`'s file layout
  (`genie.py`, `events.py`, `rooms.py`, `teachers.py`, `ingest.py`, `session.py`).

### Databricks / Data Access
- All SQL execution goes through `backend/app/db.py`. No other backend file imports
  `databricks-sql-connector` or issues SQL.
- Every query is parameterized. No f-string/`.format()`-built SQL with user-supplied
  values, ever — including for the ingestion webhook and Admin Panel writes.
- Query logic implements the exact overlap/interval formulas from `data-contracts.md`
  (half-open `[start_ts, end_ts)`, `a_start < b_end AND b_start < a_end`). This formula is
  written once, in one place, and reused — see Data Access Standards.

### Genie Integration
- All Genie Conversation API calls go through `backend/app/genie_client.py`. No other file
  imports `databricks-sdk`'s Genie client.
- The backend never rewrites, augments, or "fixes" the question text or Genie's answer
  text before returning it — per `genie.md`, Genie's output is passed through as-is,
  reshaped only into the documented contract envelope (`status`, `answer`, `sql`, `rows`).

### APIs
- REST over JSON, one FastAPI router per resource, exactly the endpoints and shapes in
  `architecture.md`'s Integration Contracts. No GraphQL, no RPC layer.

### Configuration
- `python-dotenv` locally, workspace-provided environment variables in Databricks Apps.
  See Configuration and Secrets.

### Testing
- `pytest` for the backend (contract-shape and data-logic tests). No frontend test runner
  is introduced given the time budget — frontend validation is manual/checklist-driven per
  the Testing Standards section below, not automated component tests.

---

## Project Structure

Matches `architecture.md`'s folder structure exactly — this file adds no new top-level
directories and no agent restructures it.

```
campus-companion/
├── context/                 → this document set (read-only during implementation)
├── data-platform/           → Data Platform workstream
│   ├── notebooks/
│   ├── genie/
│   └── benchmarks/
├── backend/                 → Backend workstream
│   └── app/
│       ├── main.py
│       ├── config.py        → all env var reads, one place
│       ├── db.py            → all SQL execution, one place
│       ├── genie_client.py  → all Genie Conversation API calls, one place
│       ├── auth.py          → session cookie issuance/verification
│       ├── models.py        → Pydantic request/response models
│       └── routers/         → one file per resource area
├── frontend/                 → Frontend workstream
│   └── src/
│       ├── main.tsx, App.tsx
│       ├── pages/            → one file per surface, composition only
│       ├── components/       → registered components from ui-registry.md
│       ├── api/client.ts     → the only file allowed to call fetch("/api/...")
│       └── styles/           → tokens.css, tokens.ts (per ui-tokens.md)
├── ingestion/                → Ingestion & Integration workstream
└── deploy/                   → Ingestion & Integration workstream
```

- **Data-access logic** lives only in `backend/app/db.py`.
- **Genie integration** lives only in `backend/app/genie_client.py`.
- **Types/interfaces:** backend types are Pydantic models in `models.py`; frontend types
  are TypeScript interfaces colocated in `frontend/src/api/client.ts` next to the fetch
  function that uses them (a small enough surface that a separate `types/` directory adds
  no value).
- **Shared utilities:** only introduced if a genuine cross-cutting need appears (e.g. a
  timestamp formatter used on every page) — placed in `frontend/src/lib/` or
  `backend/app/lib/` respectively, created on first real duplication, not preemptively.
- **Tests:** `backend/tests/`, mirroring `backend/app/`'s structure.
- **Static assets:** none beyond what Vite bundles; no separate asset pipeline.

---

## Naming Conventions

One convention per language, applied consistently.

| Element | Convention | Example |
|---|---|---|
| Python files/modules | `snake_case` | `genie_client.py`, `db.py` |
| Python functions/variables | `snake_case` | `get_free_rooms`, `event_id` |
| Python classes / Pydantic models | `PascalCase` | `BookingRequest`, `GenieAnswer` |
| Python constants | `UPPER_SNAKE_CASE` | `INGEST_TOKEN_HEADER` |
| TS/TSX files (components) | `PascalCase.tsx` | `EventCard.tsx`, `GenieMessage.tsx` |
| TS/TSX files (non-component) | `camelCase.ts` | `client.ts`, `formatTime.ts` |
| React components | `PascalCase`, named after what they are, not the page (see `ui-registry.md` Naming Convention) | `RoomAvailabilityTable`, not `NewsletterRoomBox` |
| React hooks | `useCamelCase`, prefixed `use` | `useSession`, `useGenieConversation` |
| TS variables/functions | `camelCase` | `attendanceCount`, `askGenie()` |
| TS types/interfaces | `PascalCase`, no `I`/`T` prefix | `EventSummary`, not `IEventSummary` |
| TS constants | `UPPER_SNAKE_CASE` for true constants, `camelCase` for config objects | `MAX_VISIBLE_ROWS`, `apiConfig` |
| API routes | `kebab-case` segments matching `architecture.md` exactly | `/api/rooms/availability` |
| Database identifiers | exactly as `data-contracts.md` defines — never renamed locally | `event_attendance.registrant_email` |
| Environment variables | `UPPER_SNAKE_CASE`, matching `architecture.md`'s Environment Configuration table exactly | `SQL_WAREHOUSE_ID`, `GENIE_SPACE_ID` |

**Correct:** `RoomAvailabilityTable.tsx`, `get_free_rooms(room_type, at)`,
`COUNCIL_ACCESS_CODE`.
**Incorrect:** `roomTable.tsx` (wrong case for a component), `GetFreeRooms` (wrong case for
a Python function), `council_access_code` used as a frontend variable name for a value that
should never reach the frontend at all.

---

## Component and Module Design

- **Single responsibility.** A component renders one thing; a backend module does one job
  (`db.py` executes SQL, `genie_client.py` talks to Genie, a router parses/validates/calls/
  shapes). A function that does two of these things is split.
- **Component size.** If a `.tsx` file exceeds roughly 150 lines or mixes more than one
  concern (e.g. data fetching *and* complex layout *and* form validation), extract a
  registered sub-component per `ui-registry.md` rather than growing the file.
- **Module boundaries mirror workstream boundaries.** `backend/app/db.py` is the only
  module with SQL knowledge; `frontend/src/api/client.ts` is the only module with fetch/URL
  knowledge. No component constructs a URL or SQL string itself.
- **Composition over configuration.** Prefer composing two registered components over
  adding a third boolean prop that toggles unrelated behavior on an existing one.
- **Dependency direction:** `pages/` depend on `components/`; `components/` depend on
  `api/client.ts` types but never on a specific page. `routers/` depend on `db.py` and
  `genie_client.py`; neither of those depends back on a router. No circular imports —
  if one appears, the shared logic moves to a lower-level module both sides can import.
- **Shared/reusable logic:** promoted to a shared utility only after it's needed in a
  second place — no speculative shared helpers "in case another page needs it."
  extraction happens once, immediately, when it happens.
- **Avoid god components/modules.** `App.tsx` only routes between the three pages; a page
  file composes registered components and calls `api/client.ts` — it does not itself
  contain table-rendering or form-validation logic that belongs in a component.
- **Abstraction is justified only when:** (a) a concrete second use case exists right now,
  or (b) the pattern is explicitly registered in `ui-registry.md` and this is its intended
  reuse. Otherwise, write the specific thing.

---

## State Management

The simplest mechanism for each kind of state — nothing global by default.

| State kind | Mechanism | Notes |
|---|---|---|
| **Local UI state** (form field values, expanded/collapsed disclosure, filter selection) | `useState`/`useReducer` inside the owning component | Never lifted higher than the component that needs it plus its immediate parent. |
| **Server/data state** (events list, room availability, Genie answers) | Fetched via `api/client.ts` into component state (`useState` + a small `useEffect`/handler), re-fetched after a successful mutation per `ui-rules.md` ("re-fetch the relevant read endpoint... rather than optimistically mutating local state") | No client-side cache layer; no data library (see Technology-Specific Standards). |
| **Shared application state** (current session role) | One `useSession()` hook wrapping the `role` value from `POST /api/session`, read from wherever `RoleGate`/`TopBar`/`AccessCodeModal` need it | Not Redux/Context-heavy — a single small React Context provided once at the app root is sufficient, since it's one value (`role`). |
| **Authentication/role state** | Server-issued signed cookie is the only source of truth (per `architecture.md`); the frontend's `useSession()` state is a *cache* of what the server returned, re-verified by the server on every write regardless of what the client believes | Frontend state is never treated as authorization — see Authentication and Authorization. |
| **Genie conversation state** | Held in the `AskGenie` page (or a `useGenieConversation()` hook it owns), an in-memory array of messages, persisted only for the tab's session lifetime per `ui-rules.md` ("restored when the user returns to Ask Genie during the same session") | No `localStorage`/`sessionStorage` (per the artifact/browser-storage restriction and because this is app code, not an artifact — persistence is intentionally session-only, not cross-reload). |

Do not introduce a global store merely because "it might be needed later." With three
pages and one shared value (`role`), a global store is unjustified overhead.

---

## API and Integration Standards

- **Request/response shapes are frozen by `architecture.md`'s Integration Contracts.** No
  agent renames a field, adds an undocumented field a consumer might rely on, or changes a
  status code without updating that file first (per its own Data Contract Change Rules
  equivalent — see Rules for This File).
- **HTTP semantics:** `GET` for reads (idempotent, no side effects), `POST` for the three
  writes and the Genie ask endpoint (not idempotent by design — see Data Access Standards
  for the specific idempotency notes on booking). Status codes exactly as documented: `200`
  reads, `201` successful creates, `401` bad ingestion token, `403` forbidden, `404` not
  found, `409` conflict, `502` upstream failure.
- **Validation:** request bodies are validated by Pydantic models at the FastAPI boundary;
  a malformed request never reaches `db.py` or `genie_client.py`.
- **Authentication context:** every write handler reads the role from the verified session
  cookie via `auth.py` — never from a request body field, header, or query param the client
  could set.
- **Loading states:** the frontend shows a loading state for any request not yet resolved,
  per the specific per-operation rules in `ui-rules.md`'s Loading and Async Behaviour
  (skeleton on first load, quiet "Updating…" on poll/refresh, button loading state on
  submit) — never a blank screen.
- **Error responses:** always the documented shape for that endpoint (`{"status": "error",
  "message": "..."}` for Genie; `{"error": "..."}` variants for direct endpoints per
  `architecture.md`). A route handler never lets a raw exception/traceback reach the
  client.
- **Retries:** no automatic retries anywhere (frontend or backend) — every retry is a
  user-initiated "Try again" button press, per `ui-rules.md`. The one exception is none;
  this is a hard rule for demo predictability.
- **Idempotency:** the ingestion endpoint is intentionally *not* deduplicated (repeat
  registrations are valid, per `data-contracts.md`). The booking endpoint is not idempotent
  either — a duplicate identical booking request creates a new booking record and cancels
  the prior one, exactly per the Write Contracts in `data-contracts.md`; the backend does
  not attempt to detect and short-circuit a "same" request.

---

## Data Access Standards

- **`data-contracts.md` is authoritative.** No backend code defines its own notion of a
  field's meaning, an enum's allowed values, or an interval convention — every query
  implements exactly what that file specifies.
- **Query organization:** one function per read/write operation in `db.py` (e.g.
  `get_free_rooms(room_type, at)`, `is_teacher_free(teacher_name, at)`,
  `create_booking(room_id, event_id, start_ts, end_ts)`, `insert_attendance(...)`). A route
  handler calls one such function; it does not embed inline SQL.
- **Parameterization:** every function takes typed parameters and uses the SQL connector's
  parameter binding — no string interpolation of any value that ultimately comes from user
  input (form fields, ingestion webhook payload, Genie is separately sandboxed and never
  writes at all).
- **The overlap formula is centralized.** The half-open-interval overlap check
  (`a_start < b_end AND b_start < a_end`) is implemented exactly once, in `db.py`, and
  reused by every function that needs it (room availability, teacher availability, booking
  conflict check) — it is never re-derived or approximated in a second place, matching
  `data-contracts.md`'s explicit requirement that Genie and the backend never disagree.
- **Validation before write:** foreign keys (`club_id`, `room_id`, `event_id`) are checked
  to exist before an INSERT is attempted, per the Write Contracts in `data-contracts.md`;
  a write that would violate a documented invariant (overlapping confirmed booking, missing
  required field) is rejected with the documented error shape, not attempted and rolled
  back.
- **Separation from presentation:** `db.py` returns plain typed data (dicts/dataclasses
  matching the Pydantic response models); it never returns HTML, pre-formatted display
  strings, or anything UI-specific. Formatting (e.g. "15:00–17:00") happens in the frontend
  per `ui-rules.md`'s Typography rules.
- **No duplicated schema.** Table/column names are referenced directly from
  `data-contracts.md`; no ORM model or separate schema file re-declares the shape of a
  table with different names.
- **Unavailable/stale data:** a SQL exception is caught at the router level and turned into
  the documented `502` shape — never returned as an empty result that looks like a valid
  "no data" answer (which would misrepresent `empty` as `error`, the exact confusion
  `ui-rules.md` guards against).

---

## Genie Integration Standards

- **Location:** all Genie Conversation API calls live in `backend/app/genie_client.py`.
  The `POST /api/genie/ask` router (`routers/genie.py`) is a thin caller: receive the
  question, call `genie_client.ask(question)`, shape the result into the contract envelope,
  return it.
- **Request handling:** the question string is passed through unmodified — the backend
  does not prepend instructions, rewrite the question, or attempt its own NL parsing (that
  would violate `architecture.md` Invariant 1 — Genie is the only NL-to-answer component).
- **Response handling:** the backend maps Genie's returned status into exactly one of
  `ok` / `no_answer` / `error` per the documented contract; it does not invent a fourth
  status or collapse `no_answer` and `error` together (per `genie.md`'s Failure Handling
  and `ui-rules.md`'s explicit three-state distinction).
- **Loading/error states:** the frontend shows the "Checking campus data…" placeholder
  while the request is in flight, and renders the three-state (`ok`/`no_answer`/`error`)
  `GenieMessage` variants from `ui-registry.md` — never a generic spinner-only or
  unstyled-JSON fallback.
- **Result normalization:** row data returned by Genie is passed through to
  `GenieResultTable` as-is (arbitrary column shape, since it depends on Genie-generated
  SQL); the backend does not attempt to rename columns or infer types beyond what's needed
  to serialize to JSON.
- **Unexpected responses:** if the Genie Conversation API returns a shape the backend
  doesn't recognize (SDK error, timeout, malformed payload), it is treated as `error` (HTTP
  502) — never partially parsed and shown as a degraded "answer."
- **Logging/debugging:** the backend logs the question text and the resulting `status`
  (not the full answer/rows, to keep logs small) so a failed demo question can be diagnosed
  from logs alone, per `architecture.md`'s Observability section.
- **Separation from mutations:** `genie_client.py` never imports or calls anything from
  `db.py`'s write functions, and no code path allows a Genie response to trigger an INSERT.
  This is enforced structurally (separate modules, no shared write-capable connection
  object passed to `genie_client.py`), not just by convention.

---

## Authentication and Authorization

- **Authentication:** there is no user login; the only credential is the shared
  `COUNCIL_ACCESS_CODE` compared server-side in `POST /api/session`, per
  `architecture.md`.
- **Role/permission checks happen exactly once per request, at the top of the route
  handler**, before any query is constructed — for `POST /api/bookings` and
  `POST /api/events` only. Every other endpoint is open to any session.
- **Backend enforcement is the only enforcement.** `auth.py` verifies the signed cookie's
  `role` claim on every protected route. A missing, expired, or tampered cookie is treated
  as `student` and rejected with `403` — never treated as an error to retry, never defaulted
  to `council`.
- **Frontend visibility is not authorization.** Hiding the Admin Panel's forms for a
  `student` session (`RoleGate.tsx`) is a UX convenience only. No frontend check may be
  treated as sufficient by any agent, for any endpoint, under any circumstance — this
  mirrors `architecture.md` Invariant 4 exactly and is repeated here because it is the
  single highest-risk shortcut a rushed agent could take.
- **Protected routes/actions:** `POST /api/bookings`, `POST /api/events`. Nothing else is
  role-gated. `POST /api/ingest/attendance` is gated by the separate `INGEST_TOKEN` shared
  secret, not by role, and is never combined with the session-cookie mechanism.
- **Unauthorized responses:** always `403 {"error": "forbidden"}` for role failures,
  `401 {"status": "unauthorized"}` for ingestion token failures — exactly per
  `architecture.md`. No endpoint returns `200` with an error message embedded in the body
  for an authorization failure.
- **Server-side trust boundary:** nothing the client sends (body field, header, cookie
  content before signature verification) is trusted for a permission decision. Only the
  cryptographically verified cookie claim and the ingestion token comparison are trusted.

---

## Error Handling

| Error type | Caught where | Propagation | User-facing result |
|---|---|---|---|
| Validation error (bad request body) | FastAPI/Pydantic, automatically | Returned before any handler logic runs | `422`-equivalent handled by FastAPI's default; frontend shows the field-level error per `ui-rules.md` Forms |
| Authentication/ingestion-token error | `routers/ingest.py`, checked first | Short-circuits before any DB call | `401 {"status": "unauthorized"}` |
| Authorization error | `auth.py`, called at the top of `bookings.py`/`events.py` handlers | Short-circuits before any DB call | `403 {"error": "forbidden"}`; frontend reopens `AccessCodeModal` |
| Booking conflict | `db.py`'s conflict check, raised as a typed exception | Caught in `routers/rooms.py`, mapped to `409` | `{"error": "conflict", "conflicting_booking": {...}}`; frontend shows the `conflict` Banner |
| Databricks/SQL error | `db.py`, wraps the connector call in try/except | Re-raised as a generic backend exception, caught at the router level | `502` with the documented per-endpoint error shape; frontend shows the `error` state, never stale data presented as current |
| Genie error/timeout | `genie_client.py`, wraps the SDK call | Caught in `routers/genie.py` | `502 {"status": "error", "message": "..."}`; frontend shows the `error` `GenieMessage` with "Try again" |
| Genie no-answer | Returned by Genie itself as a normal (non-exception) result | Mapped directly | `200 {"status": "no_answer", "message": "..."}`; frontend shows the `no_answer` `GenieMessage` |
| External integration failure (Apps Script can't reach the backend) | Apps Script's own execution log | Not caught by the backend at all — the backend never knows the call didn't happen | No count increase; demo script's documented manual-POST fallback is used |
| Unexpected/unhandled exception | A top-level FastAPI exception handler in `main.py` | Logged with a stack trace server-side | Generic `502` — never a raw traceback or exception message returned to the client |

- **No silent failures anywhere.** Every caught exception either produces a documented
  error response or is re-raised — never swallowed with a bare `except: pass`.
- **Retries are user-initiated only** (see API and Integration Standards) — no automatic
  retry logic exists in any error path.

---

## Logging and Debugging

- **What is logged:** for every request to a write endpoint or the Genie proxy — the
  route, the resolved role (writes only), and success/failure. For Genie specifically —
  the question text and the resulting `status` (`ok`/`no_answer`/`error`), per
  `architecture.md`'s Observability section.
- **What is never logged:** `DATABRICKS_TOKEN`, `SESSION_SIGNING_SECRET`, `INGEST_TOKEN`,
  `COUNCIL_ACCESS_CODE`, session cookie contents, or any registrant's full submitted
  payload beyond what's needed to diagnose an ingestion failure (event_id and a status, not
  the registrant's name/email logged in plaintext beyond what the DB row already stores).
- **Error logging:** SQL exceptions are logged with the failing statement and parameter
  placeholders (not literal PII values where avoidable), so a broken query can be found
  without reproducing it live.
- **Development vs production behavior:** identical — there is one environment for this
  hackathon (see `architecture.md`'s Environment Separation: "None"). No debug-only logging
  branch that behaves differently at demo time than it did during development.
- **Debugging conventions:** standard Python `logging` to stdout on the backend (captured
  by the Databricks App runtime's log viewer); standard browser console/`fetch` rejection
  handling on the frontend, with no separate error-reporting service introduced.
- **No `print()` debugging left in committed code** — use `logging` on the backend and
  remove `console.log` calls before a file is considered done (see Code Quality).

---

## Configuration and Secrets

- **All environment variables are read in exactly one place per side:**
  `backend/app/config.py` on the backend. The frontend never reads a `.env` file
  containing any Databricks-related value — per `architecture.md`, it receives
  configuration only through backend responses.
- **The canonical variable list is `architecture.md`'s Environment Configuration table.**
  No agent introduces a new environment variable without adding it there first.
- **Local development:** a `.env` file consumed only by `config.py` via `python-dotenv`,
  and gitignored — never committed, never shared in chat/screenshots during the hackathon.
- **Deployment configuration:** set as Databricks App environment/secret configuration at
  deploy time, owned by the Ingestion & Integration workstream per `architecture.md`.
- **Secrets are never:** hardcoded, logged, returned in any API response body, embedded in
  frontend code, or passed as a URL query parameter. The `INGEST_TOKEN` and
  `COUNCIL_ACCESS_CODE` are compared server-side only.
- **Configuration is centralized and predictable:** any code needing a config value imports
  it from `config.py`'s exported settings object — no second `os.environ.get(...)` call
  scattered elsewhere in the backend.

---

## Validation

| Layer | What it validates | Authoritative? |
|---|---|---|
| **Client-side** (frontend forms) | Required fields present, end time after start time — "only what's obviously fixable" per `ui-rules.md` | No — a UX convenience only |
| **Server-side** (FastAPI/Pydantic + route handler logic) | Full shape validation, foreign-key existence, role/authorization, booking-overlap conflict | **Yes — authoritative for every mutation** |
| **Data layer** (`db.py`) | Enum values, required-field presence at the SQL level (constraint-shaped checks before INSERT) | Yes, as the last line of defense before a write |
| **External service boundary** (ingestion webhook) | `INGEST_TOKEN` presence/correctness, `event_id` existence | Yes — the only "authentication" this endpoint has |

Client-side validation exists purely so the user isn't surprised by an obviously-preventable
error; it is never trusted as the reason a write is safe. Every mutation is re-validated
fully on the server regardless of what the client already checked.

---

## Testing Standards

Testing is scaled to risk, not to coverage percentage — a 12-hour build tests the paths
that would sink the demo if broken, not every function.

- **Unit tests (backend, `pytest`):** the overlap-interval formula (`db.py`'s
  `room_is_free`-equivalent function) with boundary cases (booking ending exactly at the
  query instant); `attendance_count` calculation; role-check logic in `auth.py`. These are
  the functions where a subtle bug produces a wrong-but-plausible-looking answer — the
  worst kind of hackathon bug.
- **Component tests:** not automated, given the time budget (see Technology-Specific
  Standards). Instead, each registered component from `ui-registry.md` is manually
  exercised against its documented states (default/loading/empty/error) once, at
  implementation time, by the agent who builds it.
- **API/integration tests (backend, `pytest` + FastAPI's `TestClient`):** one test per
  endpoint asserting the documented success shape and at least one documented error shape
  (e.g. `POST /api/bookings` → `201` on success, `409` on conflict, `403` without a
  council session).
- **Data validation:** Data Platform runs the full benchmark question set from `genie.md`
  directly in the Databricks UI before declaring the Genie Space done — this is a required
  gate, not optional polish.
- **Genie validation:** the same benchmark set is re-run through the actual
  `POST /api/genie/ask` endpoint once the backend proxy exists, to confirm the proxy
  doesn't alter Genie's behavior.
- **End-to-end/critical-flow testing:** the six flows in `project-overview.md`'s Core User
  Flows, walked manually end-to-end at each integration checkpoint (see the build plan's
  Integration Checkpoints) — ask a question, check room availability, check teacher
  availability, register for an event and see the count update, book a room as council, and
  browse the newsletter view.
- **Regression testing:** re-run the benchmark set and the six core flows after any change
  to `data-contracts.md`-affecting code (schema, query logic) or to a shared component.
- **Minimum before any integration checkpoint:** the relevant endpoint(s) return the
  documented shape for both a success and a failure case, and the relevant frontend surface
  renders without a console error against real (not mocked) backend data.

---

## Git and Parallel Development

- **One branch per workstream** (`data-platform`, `backend`, `frontend`, `ingestion`),
  branched from `main`, merged back at each integration checkpoint — not continuously,
  which would create constant small-conflict overhead for four people on laptops.
- **Commits are small and scoped to one file/module's concern** (e.g. "add
  room_is_free overlap check to db.py"), not "backend work" — so a broken commit can be
  identified and reverted without losing unrelated progress.
- **No agent commits directly to `main`.** Merges into `main` happen only at an integration
  checkpoint, reviewed at minimum by a quick read-through from the merging agent.
- **Shared files** (`architecture.md`, `data-contracts.md`, `ui-tokens.md`, `ui-rules.md`,
  `ui-registry.md`, this file) are edited only when a documented, deliberate contract
  change is being made — never as a side effect of unrelated feature work — and the change
  is announced to the other three agents at the next integration checkpoint at the latest.
- **Avoiding unrelated changes:** a commit touching `frontend/` does not also reformat
  `backend/` files it happened to open; no drive-by refactors of another workstream's code.
- **Minimizing merge conflicts:** because ownership is exclusive per `architecture.md`'s
  "Must Not Modify" columns (see Ownership below), conflicts should be rare by
  construction — they signal a boundary violation, not just bad luck, and are worth
  investigating as such.
- **Integration:** at each checkpoint, workstream branches merge into `main` in dependency
  order (Data Platform → Backend → Frontend/Ingestion, per `architecture.md`'s Dependency
  Graph), and the six core flows are walked manually against the merged result before the
  checkpoint is declared passed.
- **Handing work to another agent:** see Agent Handoff Rules in the build plan — at minimum,
  the branch is merged, the relevant contract file is up to date, and the six core flows
  have been walked once against the current `main`.

---

## Dependencies and Libraries

A new dependency is added only when it:

1. Solves a real requirement already in scope (not a "might be useful" addition).
2. Is compatible with the chosen stack (React/Vite/TS; Python/FastAPI) — no competing
   framework.
3. Materially reduces implementation effort or risk versus writing the small amount of
   code by hand (e.g. `databricks-sql-connector` and `databricks-sdk` are justified — hand
   -rolling that protocol is not a good use of hackathon time).
4. Does not introduce disproportionate integration or deployment complexity for a single
   Databricks App deployment (e.g. no dependency requiring its own server process, database,
   or background worker).

`context/library-docs.md` is the canonical reference for approved libraries and their
usage patterns once it exists; an agent needing a dependency not already named in
`architecture.md`'s Stack table checks there first, and if still unresolved, adds it there
(or requests it be added) before depending on it — a dependency should never be introduced
silently in a single file with no record of the decision.

Already-approved, in-scope dependencies (from `architecture.md`): React, Vite, TypeScript,
Tailwind CSS, FastAPI, Pydantic, `databricks-sdk`, `databricks-sql-connector`,
`python-dotenv`, `lucide-react`, `pytest`. No additional state-management, data-fetching,
ORM, or UI-kit library is added on top of these without a documented reason.

---

## Comments and Documentation

Comments explain **why**, not what — the code itself should make the "what" obvious given
these standards.

Appropriate:
- Non-obvious reasoning: *"// half-open interval: booking ending at T does not occupy T —
  see data-contracts.md Time semantics."*
- Constraints inherited from another workstream: *"# Genie never writes — this function
  intentionally has no INSERT path."*
- Workarounds: *"// Apps Script retries on 5xx with no backoff; keep this handler fast and
  idempotent-safe for duplicate calls."*
- Important business rules that aren't self-evident from the code shape: *"# attendance_count
  is a raw COUNT(*), duplicates included by design — see data-contracts.md Business Rules."*
- Integration assumptions: *"# Assumes role has already been verified by auth.py's
  dependency — do not call this function from an unauthenticated path."*

Not appropriate:
- Restating the code (`# increment counter` above `count += 1`).
- Commented-out old code left "just in case" — delete it; Git history is the record.
- A comment explaining what a well-named function already says.

---

## Code Quality

- **Formatting:** `prettier` defaults for TS/TSX, `black` defaults for Python — run before
  a commit that will be merged at a checkpoint. No hand-tuned formatting debates.
- **Linting:** `eslint` (React/TS recommended config) and `ruff`/`flake8` defaults are
  advisory during the build, not a blocking gate — fix what's fast to fix, don't burn
  hackathon time chasing every warning.
- **Type safety:** TypeScript strict mode and full Python type hints, as stated in
  Technology-Specific Standards; a typed boundary is not skipped just because "it's a
  hackathon."
- **Duplication:** the overlap-interval formula, the token config, and any registered
  `ui-registry.md` component are each implemented exactly once — duplication of these
  specific things is treated as a defect, per those files' own rules, not just a style
  nit.
- **Dead code:** removed before a checkpoint merge, not left "for later."
- **Unused imports:** removed — they're free to catch with the linter and add noise to
  code review during a fast-moving build.
- **Magic values:** the four `rooms.type` values, the two `events.status`/`room_bookings.status`
  enums, and similar closed sets from `data-contracts.md` are referenced as named
  constants/TS union types, not repeated string literals scattered across files.
- **Overly complex functions:** if a function needs a comment to explain what section does
  what, it's a candidate to split — this is a judgment call, not a line-count rule, given
  the time budget.
- **Unnecessary abstractions:** per Component and Module Design — no interface/base class
  with a single implementation, no generic repository pattern over `db.py`'s few functions.
- **Debug leftovers:** no `console.log`, `print()`, commented-out blocks, or
  test/placeholder data left in code that's merged at a checkpoint.

---

## Definition of Done

A piece of code is not "done" because it was written. It passes through three states:

- **Implemented** — the agent has written the code, it runs locally, and it appears to do
  what's intended in isolation (e.g. the endpoint returns the right shape when called
  directly, the component renders with mock data).
- **Integrated** — the code has been merged and exercised against the *real* neighboring
  workstream's code — the frontend component calling the actual backend endpoint (not a
  mock), the backend endpoint querying the actual seeded Databricks tables, the Genie proxy
  calling the actual configured Genie Space.
- **Verified** — the integrated behavior has been walked through as part of one of the six
  core user flows from `project-overview.md` and produces the correct, documented result,
  including its documented error/empty states.

Minimum criteria, applied per feature:
- Functionality works against real data, not mocks.
- The correct fields/types from `data-contracts.md` and `architecture.md`'s contracts are
  used, unmodified.
- Server-side validation exists for any mutation.
- Authorization is enforced server-side for the two protected write endpoints.
- Documented error states (`no_answer`/`error`/`empty`/`conflict`/`forbidden`) are handled,
  not just the happy path.
- UI matches `ui-tokens.md`/`ui-rules.md`/`ui-registry.md` — no inline hex colors, no
  invented spacing, no unregistered component fork.
- The relevant `pytest` test(s) pass.
- No debug leftovers remain (see Code Quality).
- The interface (REST shape, component props) is stable — nothing downstream had to change
  to accommodate a last-minute rename.
- Any contract change made along the way is reflected in the relevant context file.

A feature claimed as "done" that has only reached **Implemented** must be described as
such, not reported as complete, at any integration checkpoint.

---

## Rules for This File

1. This file is the canonical engineering-standard reference for Campus Companion.
2. All four agents follow these conventions regardless of workstream.
3. `architecture.md` defines architecture, not this document — this document defines how
   code within that architecture is written.
4. `data-contracts.md` defines data semantics; all data-access code implements it exactly.
5. `genie.md` defines Genie-specific behavior and configuration; this file only defines the
   engineering conventions around calling and rendering Genie's results.
6. `ui-tokens.md`, `ui-rules.md`, and `ui-registry.md` define UI decisions; this file
   defines how frontend code is organized and written to implement them.
7. Shared interfaces (REST contracts, component props, data field names) must remain
   stable — changed only through the documented process in the owning file.
8. Security-sensitive operations (role checks, secret handling, the ingestion token) are
   enforced server-side, always, with no exception for convenience or time pressure.
9. Agents avoid unrelated refactors, especially inside files owned by another workstream.
10. Agents do not silently change another workstream's contracts — a needed change is
    proposed and reflected in the owning context file, not made unilaterally.
11. Simplicity is preferred over unnecessary abstraction throughout.
12. These standards remain practical for a 12-hour hackathon — where a rule and the time
    budget conflict, the simplest compliant option is chosen, not a shortcut that violates
    security, data correctness, or the documented contracts.
