# Data Platform Workstream

Owns the governed data foundation for Campus Companion: the Unity Catalog
schema, all **8** Delta tables with seed data (the 7 core tables + `internships`),
column comments, the trusted `room_is_free` SQL function, and the Genie Space
configuration. See `context/architecture.md`'s Data Platform workstream
definition and `context/build-plan.md`'s Data Platform tasks for the
authoritative scope.

## Contents

| Path | Purpose |
|---|---|
| `notebooks/01_create_schema.sql` | Catalog/schema DDL for all 8 tables — PK/FK constraints, `CHECK` constraints on closed enums, and column/table comments (the Genie tuning step). |
| `notebooks/02_seed_data.sql` | Synthetic seed data satisfying every scenario in `context/data-contracts.md`'s Synthetic Data Requirements. |
| `notebooks/03_trusted_functions.sql` | The one trusted SQL function, `room_is_free(room_id, ts)`. |
| `genie/instructions.md` | Ready-to-paste text for the Genie Space's Instructions field (already updated for the 8-table surface + internship rules). |
| `genie/synonyms.md` | Informal-term → canonical-value mapping for the Genie Space's synonym configuration (includes an Internships section). |
| `benchmarks/question_sql_pairs.md` | The 10 original benchmark questions, reference SQL, and expected answers traced against the seed data. |
| `benchmarks/v2_question_sql_pairs.md` | **V2 additions** — reference SQL + expected answers for Event Detail, Campus Pulse, Analytics, Activity, Genie → Action row shapes, and internships. Proves the governed data supports the `v2-api-contracts.md` surfaces. |

## Setup order

1. Run `notebooks/01_create_schema.sql` against a Databricks SQL warehouse (SQL
   editor, a notebook attached to the warehouse, or `databricks` CLI).
2. Run `notebooks/02_seed_data.sql` against the now-empty schema.
3. Run `notebooks/03_trusted_functions.sql`, then run its commented-out smoke
   tests manually and confirm the expected results.
4. In the Databricks workspace, create (or open) the project's Genie Space,
   add all **8** tables from `campus_companion.campus` (`clubs`, `students`,
   `rooms`, `events`, `room_bookings`, `teacher_timetable`, `event_attendance`,
   `internships`), then paste `genie/instructions.md`'s instructions block and
   configure the synonyms in `genie/synonyms.md`. Register `room_is_free` as a
   trusted SQL function in the Genie Space's settings.
5. Run every question in `benchmarks/question_sql_pairs.md` **and**
   `benchmarks/v2_question_sql_pairs.md` directly in the Genie UI / SQL editor
   and confirm each answer matches its documented expected result.
6. **Record the Genie Space ID** where the backend expects it: the
   `GENIE_SPACE_ID` environment variable (see `context/architecture.md`'s
   Environment Configuration table; consumed by `backend/app/config.py` →
   `backend/app/genie_client.py`). Set it in `backend/.env` for local runs and
   in the Databricks App's configured env for deployment. There is no
   Space-ID file in this repo by design — it is configuration, not source.
7. Update `context/progress-tracker.md`'s Genie Readiness table and Data
   Platform / Agent 1 workstream rows as each step completes.

## Naming

Fully qualified schema: **`campus_companion.campus`**. This must match the
`UNITY_CATALOG_SCHEMA` environment variable the Backend workstream will
configure per `context/architecture.md`'s Environment Configuration table. If
your workspace requires a different catalog name, change the identifier
consistently across all three `notebooks/*.sql` files (a single find/replace
of `campus_companion` is sufficient — no other renaming is needed) and note
the change in `context/progress-tracker.md`'s Decision Log.

## Live-run status

Per `context/progress-tracker.md`'s Workstream Tracker, the schema, seed data,
column comments, and the `room_is_free` UDF **have since been run live** against
the project workspace (`dbc-d39584f1-d4ad.cloud.databricks.com`, warehouse
`453a0b7e543bf445`): all DDL statements succeeded, live row counts match the
seed exactly (`clubs=6, students=20, rooms=9, events=12, room_bookings=10,
teacher_timetable=19, event_attendance=47`; `internships` seeds 6 rows), and the
5 `room_is_free` smoke tests passed live including the half-open boundary case.

**Still outstanding (blocked on manual Databricks UI work):**

- Create/configure the Genie Space (add all 8 tables, paste
  `genie/instructions.md`, configure `genie/synonyms.md` synonyms, register
  `room_is_free` as a trusted function), then record `GENIE_SPACE_ID`.
- Run the original 10 benchmarks (`benchmarks/question_sql_pairs.md`) and the
  V2 benchmarks (`benchmarks/v2_question_sql_pairs.md`) live and record results.
- Re-run Genie-answerable questions through the live `POST /api/genie/ask`
  proxy (Checkpoint 2).

The current V2 documentation pass (this revision) also had **no** live workspace
credentials available, so the `internships` contract in
`context/data-contracts.md` was transcribed from the authoritative DDL/seed
files rather than a live `DESCRIBE TABLE`, and the V2 benchmark expected results
were hand-traced. Verify both against the live warehouse when access exists.

See `context/progress-tracker.md`'s Blockers and Risks table.
