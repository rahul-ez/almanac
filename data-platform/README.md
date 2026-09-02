# Data Platform Workstream

Owns the governed data foundation for Campus Companion: the Unity Catalog
schema, all 7 Delta tables with seed data, column comments, the trusted
`room_is_free` SQL function, and the Genie Space configuration. See
`context/architecture.md`'s Data Platform workstream definition and
`context/build-plan.md`'s Data Platform tasks for the authoritative scope.

## Contents

| Path | Purpose |
|---|---|
| `notebooks/01_create_schema.sql` | Catalog/schema DDL for all 7 tables — PK/FK constraints, `CHECK` constraints on closed enums, and column/table comments (the Genie tuning step). |
| `notebooks/02_seed_data.sql` | Synthetic seed data satisfying every scenario in `context/data-contracts.md`'s Synthetic Data Requirements. |
| `notebooks/03_trusted_functions.sql` | The one trusted SQL function, `room_is_free(room_id, ts)`. |
| `genie/instructions.md` | Ready-to-paste text for the Genie Space's Instructions field. |
| `genie/synonyms.md` | Informal-term → canonical-value mapping for the Genie Space's synonym configuration. |
| `benchmarks/question_sql_pairs.md` | The 10 required benchmark questions, reference SQL, and expected answers traced against the seed data. |

## Setup order

1. Run `notebooks/01_create_schema.sql` against a Databricks SQL warehouse (SQL
   editor, a notebook attached to the warehouse, or `databricks` CLI).
2. Run `notebooks/02_seed_data.sql` against the now-empty schema.
3. Run `notebooks/03_trusted_functions.sql`, then run its commented-out smoke
   tests manually and confirm the expected results.
4. In the Databricks workspace, create (or open) the project's Genie Space,
   add all 7 tables from `campus_companion.campus`, then paste
   `genie/instructions.md`'s instructions block and configure the synonyms in
   `genie/synonyms.md`. Register `room_is_free` as a trusted SQL function in
   the Genie Space's settings.
5. Run every question in `benchmarks/question_sql_pairs.md` directly in the
   Genie UI and confirm each answer matches its documented expected result.
6. Update `context/progress-tracker.md`'s Genie Readiness table and Data
   Platform workstream rows as each step completes.

## Naming

Fully qualified schema: **`campus_companion.campus`**. This must match the
`UNITY_CATALOG_SCHEMA` environment variable the Backend workstream will
configure per `context/architecture.md`'s Environment Configuration table. If
your workspace requires a different catalog name, change the identifier
consistently across all three `notebooks/*.sql` files (a single find/replace
of `campus_companion` is sufficient — no other renaming is needed) and note
the change in `context/progress-tracker.md`'s Decision Log.

## Known limitation — no live workspace access at authoring time

These files were authored and internally validated (referential integrity,
enum/CHECK compliance, half-open-interval overlap correctness, and every
Synthetic Data Requirements scenario) by parsing the SQL directly with a
standalone script — **not** by executing against a live Databricks SQL
warehouse or a real Genie Space, because no `databricks` CLI, `.databrickscfg`,
or `DATABRICKS_*` credentials were available in the authoring environment.

Before this workstream can be marked `Verified` (as opposed to `Implemented`)
per `context/progress-tracker.md`'s Status Definitions, someone with real
workspace access must:

- Run `01_create_schema.sql`, `02_seed_data.sql`, `03_trusted_functions.sql`
  against an actual SQL warehouse and confirm they succeed unmodified.
- Configure and test the Genie Space per the Setup order above.
- Run the 10 benchmarks in `benchmarks/question_sql_pairs.md` live and record
  the results.

See `context/progress-tracker.md`'s Blockers and Risks table for this item.
