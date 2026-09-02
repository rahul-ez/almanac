<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project

**Campus Companion** — a Databricks Genie-powered campus intelligence application.

**Stack:** React + Vite + TypeScript frontend, Python + FastAPI backend, Databricks Apps, Unity Catalog, Delta Lake, Serverless SQL Warehouse, Databricks Genie.

---

## Before Writing Code

Read the project context files in this exact order:

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/data-contracts.md`
4. `context/genie.md`
5. `context/model.md`
6. `context/ui-tokens.md`
7. `context/ui-rules.md`
8. `context/ui-registry.md`
9. `context/code-standards.md`
10. `context/build-plan.md`
11. `context/progress-tracker.md`

These files are the project's source of truth.

When documents appear to conflict, use this authority order:

1. `architecture.md` — system boundaries and technical architecture
2. `data-contracts.md` — data semantics and schemas
3. `genie.md` — Genie behavior and configuration
4. `ui-tokens.md` — visual tokens
5. `ui-rules.md` — UI behavior and composition
6. `ui-registry.md` — existing reusable UI patterns
7. `code-standards.md` — engineering conventions
8. `build-plan.md` — implementation sequencing
9. `progress-tracker.md` — current implementation state

Do not infer missing requirements when the context files are authoritative.

---

## Non-Negotiable Architecture Rules

* **Genie is the only natural-language query path.**
* Never implement a second NL-to-answer system in the frontend or backend.
* **Genie is read-only.** It must never execute `INSERT`, `UPDATE`, or `DELETE`.
* All application writes go through the documented FastAPI write endpoints.
* The frontend must never call Databricks, Genie, or the SQL Warehouse directly.
* Every frontend network request goes through `frontend/src/api/client.ts`.
* Every write endpoint independently verifies the caller's role server-side.
* Never trust client-side role information for authorization.
* Unity Catalog Delta tables are the single source of truth.
* Do not introduce a cache, secondary database, or duplicate datastore.
* All backend SQL execution goes through `backend/app/db.py`.
* All Genie Conversation API calls go through `backend/app/genie_client.py`.
* The Google Form/Apps Script integration must write only through `/api/ingest/attendance`.
* Secrets must remain server-side and must never be exposed to frontend code, responses, or logs.
* Failed Genie, SQL, or ingestion operations must produce explicit failure states.
* Never replace an error with an empty result or fabricated answer.
* Do not redesign the architecture after the first end-to-end vertical slice.
* Optimize for a reliable end-to-end demo rather than maximum feature count.

These boundaries are explicitly defined by the architecture.

---

## Core Product Surfaces

The frontend has exactly three primary destinations:

1. **Home** — newsletter-style campus information, events, attendance, and room availability.
2. **Ask Genie** — conversational natural-language campus queries with grounded evidence.
3. **Council access** — role-gated club/council administration for event creation and room booking.

Primary navigation is always visible and contains exactly these three destinations.

---

## Core Features

The initial product supports:

* Natural-language campus Q&A through Genie.
* Teacher availability queries.
* Room/lab/study-space availability.
* Event discovery.
* Event attendance counts.
* Google Form event registration.
* Live attendance ingestion into Delta tables.
* Council/club-head event creation.
* Council/club-head room booking.
* Role-gated administrative writes.
* Newsletter-style campus frontend.
* Transparent Genie answers showing their SQL/data basis.

The seven governed tables are:

`clubs`, `students`, `rooms`, `events`, `room_bookings`, `teacher_timetable`, `event_attendance`.

---

## UI Rules

Before creating a UI component:

1. Check `ui-registry.md`.
2. Reuse an existing component/pattern when one exists.
3. Follow `ui-rules.md`.
4. Use only tokens from `ui-tokens.md`.
5. Add the new reusable component to `ui-registry.md`.

Never:

* hardcode colors;
* introduce arbitrary spacing/radius/type values;
* use another icon library;
* add a second design system;
* create a component that duplicates an existing registry component;
* remove visible focus states;
* use horizontal page scrolling;
* introduce a mobile menu for the primary navigation.

Use `lucide-react` exclusively for icons. Interactive controls must maintain a minimum 40×40px hit area.

---

## Data and SQL Rules

* `context/data-contracts.md` defines the meaning and schema of the data.
* Do not create an alternate interpretation of a field or enum.
* Do not duplicate the database schema in another model/schema file.
* Use parameterized SQL for every value originating outside the query itself.
* Never interpolate user input into SQL.
* Keep SQL operations in `db.py`.
* Keep route handlers thin.
* Use the documented half-open interval convention for availability and booking logic.
* Centralize the overlap calculation rather than reimplementing it.
* Validate foreign keys before writes.
* Reject booking conflicts explicitly.
* Do not represent unavailable data as an empty successful result.

The data model is deliberately constrained to seven entities and one governed source of truth.

---

## Genie Rules

* Genie receives the user's question without backend rewriting.
* Do not prepend prompts or inject hidden NL parsing logic.
* Do not manually answer a question that Genie cannot answer from governed data.
* Preserve the documented `ok`, `no_answer`, and `error` distinction.
* Show Genie's SQL/data evidence in the frontend.
* Use the configured Genie Space, instructions, synonyms, trusted SQL functions, and benchmarks.
* Do not allow Genie to become a generic chatbot.

All Genie API integration belongs in `backend/app/genie_client.py`.

---

## Role and Security Rules

The application has at least two relevant roles:

* `student`
* `council`

Client-side role state controls presentation only.

Server-side authorization controls actual access.

Every write operation must verify the signed session cookie before executing the operation.

Never expose:

* `DATABRICKS_TOKEN`
* `SESSION_SIGNING_SECRET`
* `INGEST_TOKEN`
* `COUNCIL_ACCESS_CODE`

to the browser, frontend bundle, API response, or logs.

---

## Third-Party Libraries

Before introducing or using a third-party library:

1. Check for an installed skill.
2. Read `context/library-docs.md`.
3. Check `context/code-standards.md`.
4. Use an already-approved dependency when possible.
5. If a new dependency is genuinely required, document it before depending on it.

Approved core dependencies include:

* React
* Vite
* TypeScript
* Tailwind CSS
* FastAPI
* Pydantic
* `databricks-sdk`
* `databricks-sql-connector`
* `python-dotenv`
* `lucide-react`
* `pytest`

Do not introduce React Query, SWR, Redux, Zustand, an ORM, or another UI framework without an explicit architectural decision.

---

## Build Discipline

Follow `context/build-plan.md`.

Build one feature at a time.

For each feature:

1. Read its requirements.
2. Verify dependencies are complete.
3. Build the UI/state surface.
4. Implement the required logic.
5. Test the feature's states.
6. Integrate against the documented contract.
7. Verify the end-to-end flow.
8. Update `context/progress-tracker.md`.
9. Update `context/ui-registry.md` when reusable UI components were added or changed.

Do not silently skip integration checkpoints.

A feature is not considered complete merely because it has been implemented. It must reach the verification stage defined by the build plan.

---

## Scope Control

* Do not add major features after the build-plan scope cutoff.
* Do not redesign the architecture after the first successful vertical slice.
* Prefer simplifying a feature over removing it.
* Do not introduce unrelated refactors.
* Do not add dependencies without justification.
* Protect the core Genie experience above secondary polish.
* Prioritize end-to-end reliability over feature count.

If the hackathon clock conflicts with the planned schedule, cut scope rather than pretending the schedule still holds.

---

## Verification

Before declaring work complete:

* TypeScript builds successfully.
* Python code is formatted and passes relevant tests.
* API contracts match `architecture.md`.
* SQL uses parameter binding.
* Role checks occur server-side.
* Error states are explicit.
* UI states include loading, empty, error, and normal states where applicable.
* Responsive behavior follows `ui-tokens.md` and `ui-rules.md`.
* No secrets are exposed.
* Relevant core flows are manually verified.

Integration checkpoints are mandatory.

The final product must successfully demonstrate the core flows against the deployed Databricks App before demo preparation begins.

---

## Context Maintenance

After every completed feature:

### Update `context/progress-tracker.md`

* Mark the feature appropriately.
* Update the current phase.
* Set the next feature.
* Record important implementation decisions.
* Record anything the next session needs to know.

### Update `context/ui-registry.md`

Only when UI work changes the reusable component system:

* add newly created reusable components;
* update changed component patterns;
* record file paths;
* record important implementation notes.

Never mark a feature as verified if it has only been implemented.

---

## Recovery Rule

If the same problem persists after one corrective attempt:

**Stop. Do not repeatedly patch the same symptom.**

Run `/recover` and reassess the implementation against the context files before continuing.

For complex features, use `/architect` before implementation.

Before demo/release, use `/review`.

---

## Final Principle

**Follow the context. Follow the contracts. Build the smallest reliable end-to-end system.**

Do not guess when the context defines the answer.

