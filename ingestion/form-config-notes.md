# Google Form & Ingestion Configuration Notes

This document provides complete instructions for configuring the Google Form, linked Google Sheet, and Google Apps Script ingestion webhook for **Campus Companion**.

---

## 1. Google Form Setup

### Form Details
* **Form Title:** `Campus Companion Event Check-in & Registration`
* **Form Description:** `Register your attendance for campus events. Submissions are processed live into campus intelligence.`

### Questions / Fields Configuration

| Field Label | Question Type | Options / Validation | Target Payload Field | Required? |
|---|---|---|---|---|
| **Event** | Multiple Choice or Dropdown | `AI Workshop (evt_001)`<br>`Robotics Showcase (evt_002)`<br>`Hackathon Info Session (evt_003)`<br>`Web Dev Bootcamp (evt_004)`<br>`Design Systems Workshop (evt_005)` | `event_id` (extracted as `evt_001`, etc.) | **Yes** |
| **Full Name** | Short answer text | Synthetic student name (e.g. `Aditi Sharma`) | `registrant_name` | **Yes** |
| **Campus Email** | Short answer text | Email validation (e.g. `aditi.sharma@campus.edu`) | `registrant_email` | **Yes** |

> **Note:** The Apps Script extracts `event_id` automatically from strings like `"AI Workshop (evt_001)"` or `"evt_001"`.

---

## 2. Linked Google Sheet Setup

1. In the Google Form, click the **Responses** tab.
2. Click **Link to Sheets** (Create a new spreadsheet).
3. Spreadsheet Name: `Campus Companion Event Registrations (Responses)`.
4. The sheet will contain columns:
   * `Timestamp` (Column A)
   * `Event` (Column B)
   * `Full Name` (Column C)
   * `Campus Email` (Column D)

---

## 3. Google Apps Script Installation

1. From the linked Google Sheet (or Google Form), open **Extensions > Apps Script**.
2. Rename the project to `CampusCompanionIngestion`.
3. In the code editor, replace the contents of `Code.gs` with `ingestion/apps-script/on_form_submit.gs`.
4. Click **Save** (Ctrl+S).

---

## 4. Script Properties (Environment Configuration)

To avoid hardcoding secrets inside the script, configure Script Properties:

1. In the Apps Script editor, click **Project Settings** (gear icon on the left menu).
2. Scroll to **Script Properties** and click **Add script property**.
3. Add the following properties:

| Property | Description | Example / Default Value |
|---|---|---|
| `INGEST_API_URL` | Webhook URL of Campus Companion | `https://<databricks-app-url>/api/ingest/attendance` (or local ngrok URL during testing) |
| `INGEST_TOKEN` | Shared secret token matching server's `INGEST_TOKEN` env var | `shared-ingestion-secret` |

4. Click **Save script properties**.

---

## 5. Installable Trigger Configuration

To ensure the webhook fires immediately on every student submission:

1. In the Apps Script editor, click **Triggers** (clock icon on the left menu).
2. Click **Add Trigger** (bottom right).
3. Configure the trigger settings:
   * **Choose which function to run:** `onFormSubmit`
   * **Choose which deployment should run:** `Head`
   * **Select event source:** `From spreadsheet` (or `From form` if script is bound directly to Form)
   * **Select event type:** `On form submit`
   * **Failure notification settings:** `Notify me immediately`
4. Click **Save**.
5. When prompted, grant the necessary permissions (`UrlFetchApp` access to external endpoints).

---

## 6. Testing Procedure

### A. Local / Stub Testing (Phase 2)
1. Run the local Python stub server (`python ingestion/test_stub_server.py --port 8000`).
2. If testing Apps Script from Google Cloud, expose localhost via `ngrok http 8000` or test using direct HTTP requests.
3. In Apps Script, set `INGEST_API_URL` to the public/ngrok URL: `https://<ngrok-id>.ngrok-free.app/api/ingest/attendance`.
4. In Apps Script Editor, select `testSubmission` or `testDirectWebhook` function and click **Run**.
5. Check the Apps Script execution log (`View > Execution log`) and verify HTTP 201 response.

### B. Real Integration Testing (Phase 3)
1. Ensure the Backend FastAPI app is running with `POST /api/ingest/attendance` connected to the SQL warehouse.
2. In Apps Script, set `INGEST_API_URL` to `https://<databricks-app-host>/api/ingest/attendance`.
3. Submit a real entry through the Google Form.
4. Verify:
   * Google Sheet logs the row.
   * Apps Script execution log records HTTP 201 with `{"status": "ok", "attendance_id": "att_..."}`.
   * `event_attendance` table in Unity Catalog has a new row with `source = 'google_form'`.
   * Next call to `GET /api/events` or Ask Genie reflects `attendance_count + 1`.

---

## 7. Webhook Payload Contract Reference

**Endpoint:** `POST /api/ingest/attendance`  
**Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "token": "shared-ingestion-secret",
  "event_id": "evt_001",
  "registrant_name": "Aditi Sharma",
  "registrant_email": "aditi.sharma@campus.edu",
  "submitted_at": "2026-09-05T14:58:00"
}
```

**Success Response (201 Created):**
```json
{
  "status": "ok",
  "attendance_id": "att_1042"
}
```

**Error Responses:**
* `401 Unauthorized`: `{"status": "unauthorized"}` (token mismatch/missing)
* `404 Not Found`: `{"status": "unknown_event"}` (invalid `event_id`)
* `502 Bad Gateway`: `{"status": "error"}` (warehouse/database query failure)
