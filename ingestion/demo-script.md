# Campus Companion — Live Demo Rehearsal Script

This document provides the step-by-step walkthrough script for demonstrating **Campus Companion** live.

---

## Pre-Demo Checklist (T-minus 10 Minutes)

1. [ ] **Deployed App Live:** Open `https://<databricks-app-url>` in primary presentation browser tab.
2. [ ] **Google Form Ready:** Open the registration form in a secondary tab or on a mobile phone:
   * Title: `Campus Companion Event Check-in & Registration`
   * Event pre-selected: `AI Workshop (evt_001)`
3. [ ] **Seed Data Verified:**
   * `AI Workshop (evt_001)` has an initial attendance count of **5**.
   * `Lab 204` is currently available.
   * `Prof. Rao` has timetable entries matching benchmark queries.
4. [ ] **Council Access Code Prepared:** `campus_council_2026` (or configured value in `COUNCIL_ACCESS_CODE`).
5. [ ] **Fallback Ingestion Command Ready:** Terminal open with the manual curl command if Google network fails.

---

## Step-by-Step Demo Walkthrough

### Part 1: Introduction & Newsletter Home (1 minute)
* **Action:** Presenter loads the **Newsletter Home** page.
* **Narrative:**
  > *"Campus information is notoriously scattered across static portals, PDFs, and WhatsApp groups. Today, a student wanting to know free rooms, professor availability, or club events has no single source of truth. Campus Companion solves this with governed Lakehouse intelligence."*
* **What to highlight:**
  * Clean, scannable newsletter layout with upcoming events and room availability snapshot.
  * Point out the **AI Workshop** (hosted by AI Club in Auditorium) showing exactly **5 registered attendees**.
  * Point out the room availability table showing free labs and classrooms.

---

### Part 2: Ask Genie — Grounded Q&A with Evidence (2 minutes)
* **Action:** Click **Ask Genie** in the top navigation.
* **Query 1 (Room Availability):** Type or click suggested chip:
  > *"Which labs are free at 3pm today?"*
* **Narrative:**
  > *"Genie doesn't hallucinate or guess from general LLM training. It translates natural language directly into parameterized SQL over our Unity Catalog Delta tables."*
* **What to highlight:**
  * Direct grounded answer listing available labs.
  * Click **"How this was answered"** evidence disclosure to reveal the exact SQL executed and result rows.
* **Query 2 (Teacher Availability):**
  > *"Is Prof. Rao free at 3pm?"*
* **What to highlight:**
  * Direct yes/no answer grounded in `teacher_timetable` data.

---

### Part 3: Flagship Live Ingestion Loop (2 minutes)
* **Action:**
  1. Return to **Newsletter Home** (or stay on Ask Genie).
  2. Open the **Google Form** on a smartphone (or separate browser tab).
  3. Enter Name: `Aditi Sharma`, Email: `aditi.sharma@campus.edu`, Event: `AI Workshop`.
  4. Click **Submit**.
* **Narrative:**
  > *"Watch what happens the moment a student registers on campus. The Google Form triggers an immediate Apps Script webhook into our FastAPI backend, executing a governed Delta Lake INSERT."*
* **What to highlight:**
  * Within seconds (via 15s polling or clicking Refresh), the attendance count on **AI Workshop** increases from **5 to 6** with an accent pulse.
  * Ask Genie: *"How many people are attending the AI Workshop?"* → Genie immediately answers **6**.
  * Emphasize: **No manual ETL, no batch sync, no stale cache. One single lakehouse source of truth.**

---

### Part 4: Governed Administrative Writes & Conflict Prevention (2 minutes)
* **Action 1:** Click **Council access** in top navigation.
* **Action 2:** In the `AccessCodeModal`, enter the council code and click **Continue**.
* **Action 3 (Create Event):**
  * Fill out Create Event: Name: `GenAI Hackathon`, Club: `AI Club`, Date/Time: Today 17:00–19:00, Topic: `AI`.
  * Click **Create event**.
  * Success banner confirms event created in Delta tables.
* **Action 4 (Book Room & Conflict Check):**
  * Fill out Book Room: Room: `Lab 204`, Event: `evt_001`, Time: 15:00–17:00.
  * Click **Book room** → Success banner confirms booking.
  * Now attempt to book `Lab 204` again for an overlapping window (e.g. 16:00–18:00).
  * Click **Book room** → Immediate **HTTP 409 Conflict Banner** appears, showing the existing conflicting booking details.
* **Narrative:**
  > *"Writes are strictly governed. Role checks occur server-side, foreign keys are validated, and conflict detection uses mathematically precise half-open interval overlap checks."*

---

## Emergency Fallback Procedures

### Fallback 1: Google Apps Script Webhook Fails (Network Issue)
If the Google Form submission does not reach the backend during the live presentation:
1. Open a terminal and run the emergency ingestion curl command:
```bash
curl -X POST "https://<databricks-app-url>/api/ingest/attendance" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "shared-ingestion-secret",
    "event_id": "evt_001",
    "registrant_name": "Aditi Sharma",
    "registrant_email": "aditi.sharma@campus.edu",
    "submitted_at": "2026-09-05T14:58:00"
  }'
```
2. Verify response: `{"status":"ok","attendance_id":"att_..."}`.
3. Refresh Newsletter Home to show the updated count.

### Fallback 2: Improvised Genie Question Failure
If an audience member asks an unsupported or ambiguous question:
* Stick to the verified 10 benchmark queries from `genie.md`.
* Explain that Genie safely declines out-of-scope questions ("I can only answer questions about campus events, rooms, teacher availability, and attendance") rather than fabricating answers.
