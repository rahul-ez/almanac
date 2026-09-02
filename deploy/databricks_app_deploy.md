# Databricks Apps Deployment Guide

This guide details the deployment procedure for **Campus Companion** as a single, unified Databricks App containing both the FastAPI backend and the built React frontend static bundle.

---

## 1. Deployment Topology

* **Platform:** Databricks Apps (Serverless compute runtime)
* **Packaging:** Single container/process running FastAPI (Uvicorn), which mounts and serves the Vite-built React SPA static assets from `frontend/dist`.
* **Workspace Authentication:** Workspace-native identity granted automatically by Databricks Apps to query the SQL Warehouse and the Genie Space without exposing credentials to the client.

```
┌─────────────────────────────────────────────────────────────┐
│                    Databricks App Runtime                   │
│                                                             │
│  FastAPI (Uvicorn on port 8000 / $DATABRICKS_APP_PORT)       │
│  ├── /api/genie/ask ──────▶ Genie Conversation API (SDK)    │
│  ├── /api/events, etc. ───▶ Serverless SQL Warehouse        │
│  ├── /api/ingest/attendance ◀── Apps Script Webhook         │
│  └── /* ──────────────────▶ Static Files (frontend/dist)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Environment Variables & Secrets

Configure the following environment variables in the Databricks App settings (or via Databricks CLI):

| Variable | Scope | Description | Example Value |
|---|---|---|---|
| `DATABRICKS_HOST` | Server | Workspace URL | `https://dbc-xxxx.cloud.databricks.com` |
| `DATABRICKS_TOKEN` | Server | App service principal or workspace PAT | `dapi...` |
| `SQL_WAREHOUSE_ID` | Server | Serverless SQL warehouse ID | `1a2b3c4d5e6f7g8h` |
| `GENIE_SPACE_ID` | Server | Genie Space ID for conversation queries | `01ef...` |
| `UNITY_CATALOG_SCHEMA` | Server | Fully qualified `catalog.schema` | `main.campus` |
| `COUNCIL_ACCESS_CODE` | Server | Shared code for council/club admin role | `campus_council_2026` |
| `SESSION_SIGNING_SECRET`| Server | Secret key for signing role session cookies | `random-64-char-secret` |
| `INGEST_TOKEN` | Server | Shared token verified on attendance webhook | `shared-ingestion-secret` |

> **CRITICAL INVARIANT:** None of these variables are ever exposed to the frontend bundle or client network responses.

---

## 3. App Manifest (`app.yaml`)

The `app.yaml` file in the project root/backend directory configures the Databricks App entry point:

```yaml
version: 1
name: campus-companion
description: "Campus intelligence powered by Databricks Genie"

command:
  - "uvicorn"
  - "backend.app.main:app"
  - "--host"
  - "0.0.0.0"
  - "--port"
  - "8000"

env:
  - name: UNITY_CATALOG_SCHEMA
    value: "main.campus"
  - name: SQL_WAREHOUSE_ID
    value: "<your-warehouse-id>"
  - name: GENIE_SPACE_ID
    value: "<your-genie-space-id>"
  - name: COUNCIL_ACCESS_CODE
    value: "campus_council_2026"
  - name: INGEST_TOKEN
    value: "shared-ingestion-secret"
  - name: SESSION_SIGNING_SECRET
    value: "production-session-secret-key"
```

---

## 4. Build & Deployment Steps

### Step 1: Build the Frontend Static Bundle
```bash
# In frontend directory
cd frontend
npm install
npm run build
# Output is generated in frontend/dist
```

### Step 2: Prepare Python Dependencies
Ensure `backend/requirements.txt` includes:
```text
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
databricks-sdk>=0.20.0
databricks-sql-connector>=3.0.0
python-dotenv>=1.0.0
itsdangerous>=2.1.2
```

### Step 3: Deploy via Databricks CLI

```bash
# 1. Authenticate Databricks CLI
databricks auth login --host https://<databricks-instance>

# 2. Create the App (first time only)
databricks apps create campus-companion

# 3. Sync source files to Databricks App directory
databricks sync . /Workspace/Users/<user>/campus-companion

# 4. Deploy and start the app
databricks apps deploy campus-companion \
  --source-code-path /Workspace/Users/<user>/campus-companion
```

---

## 5. Post-Deployment Verification Checklist

Once the Databricks App status shows **RUNNING**, navigate to the published App URL:

1. [ ] **Single URL Loading:** The React application loads at `https://<databricks-app-url>` with no 404 or asset loading errors.
2. [ ] **Health/Read API Check:** `GET /api/events` and `GET /api/rooms/availability` return valid data from the SQL warehouse.
3. [ ] **Ask Genie Proxy Check:** Submit *"Which labs are free at 3pm today?"* in Ask Genie and verify grounded answer with SQL evidence.
4. [ ] **Ingestion Webhook Check:** Run test suite against the live URL:
   ```bash
   python ingestion/test_stub_server.py --target-url "https://<databricks-app-url>"
   ```
5. [ ] **Role Session & Writes Check:** Click "Council access", enter `campus_council_2026`, and verify that the Admin Panel opens and successfully writes to Delta tables.
6. [ ] **Live Form Check:** Submit a test entry via Google Form and verify attendance increments on the deployed Newsletter Home.

---

## 6. Troubleshooting & Rollback

| Symptom | Probable Cause | Resolution |
|---|---|---|
| `502 Bad Gateway` on `/api/genie/ask` | `GENIE_SPACE_ID` invalid or warehouse stopped | Check Genie Space ID in App settings; ensure SQL warehouse is running. |
| `401 Unauthorized` on `/api/ingest/attendance` | `INGEST_TOKEN` mismatch in Apps Script | Update `INGEST_TOKEN` in Google Apps Script properties. |
| Frontend routing returns 404 on refresh | SPA fallback route missing in FastAPI | Ensure `backend/app/main.py` serves `index.html` for all non-API GET routes. |
| Databricks App fails to start | Missing Python dependency or incorrect entrypoint | Check `databricks apps logs campus-companion` for startup trace. |
