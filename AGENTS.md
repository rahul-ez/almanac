# Campus Companion — AGENTS.md

## Project

Campus Companion is a React + Vite + TypeScript campus application backed by FastAPI, Databricks, and Genie.

The MVP is working and shortlisted for the final hackathon round.

V2 goal:

> **Turn the MVP into a polished, useful, deployable campus product without breaking the existing system.**

---

## Context Files

Read the relevant context before making changes.

| Purpose          | File                                            |
| ---------------- | ----------------------------------------------- |
| Product scope    | `v2-product-plan.md`                            |
| API contracts    | `v2-api-contracts.md`                           |
| UI/UX            | `v2-ui-spec.md`                                 |
| Integration      | `v2-integration-plan.md`                        |
| Architecture     | `architecture.md`                               |
| Data semantics   | `data-contracts.md`                             |
| Genie            | `genie.md`                                      |
| UI system        | `ui-tokens.md`, `ui-registry.md`, `ui-rules.md` |
| Coding standards | `code-standards.md`                             |
| Progress         | `progress-tracker.md`                           |

More specific context files override general assumptions.

---

## Non-Negotiable Rules

### Architecture

```text
Frontend → FastAPI → Databricks / Genie
```

* Frontend never accesses Databricks directly.
* Frontend never accesses Genie directly.
* Backend owns authorization and writes.
* Databricks remains the source of truth.
* Do not rewrite the existing architecture without explicit approval.

### Genie

* Genie is **read-only**.
* Genie must never perform writes.
* Genie → Action means: Genie provides information → frontend presents an action → backend performs the authorized write.

### Security

* Authorization must be enforced server-side.
* Hiding a button in the frontend is not authorization.
* Never expose secrets or credentials.

---

## V2 Priorities

### MUST SHIP

* Role-aware entry
* Event Grid
* Calendar
* Event Details
* Campus Pulse
* Genie → Action
* Council Control Center
* Core analytics
* Reliable live data loop

### SHOULD SHIP

* Activity feed
* Better room discovery
* Event editing
* Responsive/polish improvements

### DEFER IF TIME IS LIMITED

* Personalization
* Notifications
* SSO implementation
* Multi-campus infrastructure
* Advanced analytics
* Decorative features

**Reliability and polish are more important than feature count.**

---

## Agent Ownership

### Agent 1 — Data + Genie

Data, Genie, benchmarks, analytics queries, Campus Pulse data.

### Agent 2 — Backend

FastAPI, APIs, sessions, authorization, writes, booking conflicts, Genie integration.

### Agent 3 — Student UI

Home, Events, Calendar, Event Details, Genie, Campus Pulse, student experience.

### Agent 4 — Council + Integration

Council Control Center, analytics UI, integration, E2E testing, final polish.

Do not modify another agent's area unnecessarily.

---

## Development Rules

Before coding:

1. Read the relevant context.
2. Inspect the existing implementation.
3. Reuse existing components and patterns.
4. Make the smallest coherent change.
5. Do not invent data or API behavior.
6. Do not break working MVP functionality.
7. Run relevant tests/build checks.
8. Report blockers and cross-agent dependencies.

When contracts conflict, stop and resolve the conflict explicitly rather than silently choosing a behavior.

---

## Definition of Done

A feature is complete when it:

* follows the relevant context specification
* uses real data
* respects API contracts
* enforces authorization correctly
* handles loading/empty/error states
* passes relevant tests
* does not introduce regressions
* integrates with the existing application

**Build V2 as an evolution of the working MVP, not as a rewrite.**
