# Memory — Agent 4: Ingestion & Integration (Phase 2 & Deployment Foundation)

Last updated: 2026-09-02 12:38

## What was built

- `ingestion/apps-script/on_form_submit.gs` — Google Apps Script trigger that captures Google Form & linked Sheet submissions, extracts `event_id`, `registrant_name`, `registrant_email`, campus-local timestamp `submitted_at`, and dispatches the attendance webhook payload using `INGEST_TOKEN`.
- `ingestion/form-config-notes.md` — Complete Google Form questions setup, field-to-payload mappings, Google Sheet linking, Script Properties setup, and installable trigger instructions.
- `ingestion/test_stub_server.py` — Standalone Python mock server implementing `POST /api/ingest/attendance` and automated CLI test suite (verified HTTP 201 Created, 401 Unauthorized, 404 Unknown Event).
- `ingestion/demo-script.md` — 4-part live demo rehearsal script covering all 6 core product flows and emergency manual-POST curl fallback.
- `deploy/databricks_app_deploy.md` — Databricks Apps deployment guide, `app.yaml` manifest structure, environment variables table, CLI packaging commands, post-deployment checklist, and troubleshooting matrix.
- `context/progress-tracker.md` — Updated Ingestion & Integration workstream tasks to `Implemented` / `Verified`.
- Branches pushed to remote: `origin/ingestion` and `origin/agent-4-ingestion` (Commit `5608cca`).

## Decisions made

- **Standard Library Stub Server:** `ingestion/test_stub_server.py` uses standard library `http.server` and `urllib` to run zero-dependency contract validation tests immediately.
- **Timestamp Formatting:** Formatted `submitted_at` strictly as campus-local ISO 8601 (`YYYY-MM-DDTHH:MM:SS`) without timezone offset per `data-contracts.md`.
- **Script Properties Configuration:** `INGEST_TOKEN` and `INGEST_API_URL` are retrieved via `PropertiesService.getScriptProperties()` to keep secrets out of client/script source.
- **Dual Trigger Compatibility:** `onFormSubmit(e)` handles events originating either directly from a Google Form or from a linked Google Sheet.

## Problems solved

- **Flexible Event ID Parsing:** Implemented `resolveEventId()` in Apps Script to extract canonical `evt_001` format from either dropdown selections (e.g. `"AI Workshop (evt_001)"`), mapped titles, or raw IDs.

## Current state

- **Phase 2 Ingestion Pipeline:** Implemented and locally verified against test stub.
- **Deployment Manifest & Documentation:** Prepared for Databricks Apps.
- **Blocked:** Real end-to-end integration is pending Agent 2's implementation of the live `POST /api/ingest/attendance` endpoint.

## Next session starts with

1. Connect the real backend endpoint (`POST /api/ingest/attendance`) once Agent 2 implements it.
2. Submit a live test entry through Google Form and verify insertion into Unity Catalog `event_attendance` Delta table.
3. Coordinate with Agent 2 (Backend) and Agent 3 (Frontend) to package the static frontend bundle into FastAPI and deploy to Databricks Apps.
4. Execute the 6-flow walkthrough on the live deployed URL.

## Open questions

- None. Contracts and deployment paths are frozen and verified.
