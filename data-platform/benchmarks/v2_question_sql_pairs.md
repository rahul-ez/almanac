# V2 Genie / Data Benchmark Question–SQL Pairs

Companion to `question_sql_pairs.md` (the original 10). This set proves that the
**governed data + the canonical semantics** can support the V2 API/UI surfaces defined in
`v2-api-contracts.md` — Event Detail (§3.2), Campus Pulse (§4), Analytics (§5), Activity
(§6), Genie → Action row shapes (§7.2) — plus the `internships` surface.

Each item gives reference (ground-truth) SQL against the seed data in
`../notebooks/02_seed_data.sql` and the expected answer traced by hand against those exact
rows.

**Status of this pass — same caveat as the original 10.** No live Databricks workspace
credentials are available in this environment (no `databricks` CLI, no `.databrickscfg`,
no `DATABRICKS_*` env vars — see `context/progress-tracker.md` Blockers). Reference SQL and
expected results below were derived by hand-tracing the overlap / aggregation logic against
the literal seed rows, **not** by executing against a live SQL warehouse or Genie Space.
Re-run every item once workspace access exists; the live result is authoritative, and if it
disagrees, first check for a seed-data or transcription bug before assuming the reference
logic is wrong.

**Conventions**
- `S` = `campus_companion.campus`.
- "now" / "today" = **2026-09-02** (the date the seed set is built around). Where a
  benchmark needs a specific instant it is stated explicitly; the canonical Campus Pulse
  instant used below is **`2026-09-02 14:00:00`** (during `evt_006`, so "events now" is
  non-empty).
- Half-open interval `[start_ts, end_ts)` everywhere; `room_is_free(room_id, ts)` is the
  trusted function.
- `attendance_count` = raw `COUNT(*)` of `event_attendance` for the event (duplicates and
  `student_id IS NULL` rows included) — never `COUNT(DISTINCT …)` unless the question says
  "unique/distinct".
- These reference queries are **direct-read SQL** (what the backend's `db.py` runs). They
  are not asserting Genie generates this exact SQL — only that the correct answer is
  reachable from governed data.

---

## A. Event Detail — `GET /api/events/{event_id}` (`v2-api-contracts.md` §3.2)

### A1. Full record for a booked, scheduled event

**Question (Genie framing):** "Tell me everything about the AI Workshop."

```sql
SELECT e.event_id, e.name, c.name AS club, e.club_id, e.topic, e.description,
       r.name AS room, e.room_id, e.start_ts, e.end_ts, e.status,
       (SELECT COUNT(*) FROM S.event_attendance a WHERE a.event_id = e.event_id) AS attendance_count,
       e.created_at
FROM S.events e
JOIN S.clubs c ON c.club_id = e.club_id
LEFT JOIN S.rooms r ON r.room_id = e.room_id
WHERE e.event_id = 'evt_001';
```

**Expected (one row):**
`evt_001` · "AI Workshop" · club "AI Club" (`club_001`) · topic "AI" · description
"Hands-on intro to large language models" · room "Lab 204" (`room_005`) · start
`2026-09-05T15:00:00` · end `2026-09-05T17:00:00` · status `scheduled` ·
**`attendance_count = 5`** · `created_at 2026-09-01T09:00:00`.
`room`/`room_id` come from `events.room_id`, which the seed keeps in sync with the
confirmed booking `bk_0001` (Data Integrity Invariants).

### A2. Cancelled + unbooked event → room is null

**Question:** "Show me the Study Skills Workshop."

```sql
SELECT e.event_id, e.status, e.room_id, r.name AS room,
       (SELECT COUNT(*) FROM S.event_attendance a WHERE a.event_id = e.event_id) AS attendance_count
FROM S.events e
LEFT JOIN S.rooms r ON r.room_id = e.room_id
WHERE e.event_id = 'evt_010';
```

**Expected:** `evt_010` · status **`cancelled`** · `room_id = NULL` · `room = NULL` ·
`attendance_count = 0`. Demonstrates the contract's "`room`/`room_id` are `null` if the
event has no confirmed booking" and that a cancelled event surfaces as cancelled, not
hidden, from a direct by-ID lookup. (Booking `bk_0008` for this event exists but is
`status = 'cancelled'`, and `events.room_id` was nulled — the two cancellations travel
together.)

### A3. Unknown id → 404

```sql
SELECT 1 FROM S.events WHERE event_id = 'evt_999';
```

**Expected:** zero rows → backend returns `404 {"error":"event_not_found"}` (never a
fabricated event).

---

## B. Campus Pulse — `GET /api/campus/pulse` (`v2-api-contracts.md` §4.1)

All evaluated at **`at = 2026-09-02 14:00:00`** unless noted.

### B1. `events_now`

```sql
SELECT e.event_id, e.name, c.name AS club, r.name AS room, e.end_ts
FROM S.events e
JOIN S.clubs c ON c.club_id = e.club_id
LEFT JOIN S.rooms r ON r.room_id = e.room_id
WHERE e.status = 'scheduled'
  AND e.start_ts <= TIMESTAMP_NTZ '2026-09-02 14:00:00'
  AND TIMESTAMP_NTZ '2026-09-02 14:00:00' < e.end_ts
ORDER BY e.end_ts;
```

**Expected:** exactly **1 row** — `evt_006` "Career Fair Prep", club "Debate Society",
room "Lecture Hall B", `end_ts 2026-09-02T15:00:00` (`[13:00, 15:00)` contains 14:00).

### B2. `events_now` — boundary case at the end instant

Same query with `at = 2026-09-02 15:00:00`. **Expected: 0 rows** — `evt_006`'s
`[13:00, 15:00)` does **not** contain `15:00` (half-open). `events_now: []` is a valid,
non-error response ("nothing happening right now").

### B3. `events_upcoming` (next 5 scheduled, `start_ts > at`, ascending)

```sql
SELECT e.event_id, e.name, c.name AS club, e.start_ts
FROM S.events e
JOIN S.clubs c ON c.club_id = e.club_id
WHERE e.status = 'scheduled' AND e.start_ts > TIMESTAMP_NTZ '2026-09-02 14:00:00'
ORDER BY e.start_ts
LIMIT 5;
```

**Expected (5 rows, in order):**
1. `evt_002` Robotics Bootcamp — `2026-09-03T10:00:00`
2. `evt_005` Photography Walk — `2026-09-04T07:00:00`
3. `evt_001` AI Workshop — `2026-09-05T15:00:00`
4. `evt_012` AI Club Peer Tutoring — `2026-09-05T15:00:00` (same instant as `evt_001`;
   tie broken by `event_id`)
5. `evt_007` Public Speaking Workshop — `2026-09-06T10:00:00`

`evt_010` (cancelled) is excluded; `evt_011` (09-06 14:00), `evt_004` (09-10), `evt_008`
(09-12) fall outside the first 5.

### B4. `rooms_available_count` / `rooms_total_count`

```sql
SELECT
  (SELECT COUNT(*) FROM S.rooms) AS total,
  (SELECT COUNT(*) FROM S.rooms r
   WHERE NOT EXISTS (
     SELECT 1 FROM S.room_bookings b
     JOIN S.events e ON e.event_id = b.event_id
     WHERE b.room_id = r.room_id AND b.status = 'confirmed'
       AND e.status <> 'cancelled'
       AND b.start_ts <= TIMESTAMP_NTZ '2026-09-02 14:00:00'
       AND TIMESTAMP_NTZ '2026-09-02 14:00:00' < b.end_ts
   )) AS available;
```

**Expected:** `total = 9`, `available = 8`. Only `room_002` is occupied at 14:00 (booking
`bk_0004`, `evt_006`, `[13:00, 15:00)`). `bk_0008` is `cancelled` and does not count.
At `at = 2026-09-02 15:00:00` → `available = 9` (booking ends at 15:00, half-open).

### B5. `registrations_today`

```sql
SELECT COUNT(*) AS n
FROM S.event_attendance
WHERE CAST(registered_at AS DATE) = DATE '2026-09-02';
```

**Expected:** **3** — `att_0003`, `att_0004`, `att_0005` (all `evt_001`, `registered_at`
on 2026-09-02). Raw count, duplicates would be included if any fell on this date.

### B6. `next_major_event`

First row of B3 → **`evt_002` Robotics Bootcamp, `2026-09-03T10:00:00`**. Convenience
field; equals `events_upcoming[0]`.

### B7. Composite success shape

`GET /api/campus/pulse` at 14:00 returns:
```json
{
  "at": "2026-09-02T14:00:00",
  "events_now": [ { "event_id": "evt_006", "name": "Career Fair Prep", "club": "Debate Society", "room": "Lecture Hall B", "end_ts": "2026-09-02T15:00:00" } ],
  "events_upcoming": [ evt_002, evt_005, evt_001, evt_012, evt_007 ],
  "rooms_available_count": 8,
  "rooms_total_count": 9,
  "registrations_today": 3,
  "next_major_event": { "event_id": "evt_002", "name": "Robotics Bootcamp", "start_ts": "2026-09-03T10:00:00" }
}
```
If any sub-query errors, the whole endpoint returns `502` — never a partial payload.

---

## C. Analytics — `GET /api/analytics/*` (`v2-api-contracts.md` §5), all-time (no `from`/`to`)

### C1. `/analytics/overview`

| Field | Reference SQL (all-time) | Expected |
|---|---|---|
| `total_events` | `SELECT COUNT(*) FROM S.events WHERE status <> 'cancelled'` | **11** (12 − `evt_010`) |
| `upcoming_events` | `SELECT COUNT(*) FROM S.events WHERE status='scheduled' AND start_ts > <now>` | **8** at `now = 2026-09-02 14:00` (`evt_002, evt_005, evt_001, evt_012, evt_007, evt_011, evt_004, evt_008`). *Edge:* if `now` is taken as `2026-09-02 00:00`, `evt_006` (starts 13:00 same day) also counts → 9. |
| `total_registrations` | `SELECT COUNT(*) FROM S.event_attendance` | **47** |
| `average_attendance_per_event` | `47 / 11` rounded to 1 dp | **4.3** |
| `active_clubs` | `SELECT COUNT(*) FROM S.clubs WHERE active = true` | **5** (`club_006` inactive) |
| `rooms_booked_now` / `rooms_total` | occupancy at `<now>` / `COUNT(rooms)` | **1 / 9** at `now = 2026-09-02 14:00` (only `room_002`) |

Note: `total_events` excludes cancelled because there is no explicit date range. If a
`from`/`to` range is supplied the query counts **all** statuses in range (explicit range =
historical framing) — that is the implemented behavior, documented in `db.get_analytics_overview`.

### C2. `/analytics/events` (all-time, `limit = 10`)

```sql
-- attendance_count per event
SELECT e.event_id, e.name,
  (SELECT COUNT(*) FROM S.event_attendance a WHERE a.event_id = e.event_id) AS attendance_count
FROM S.events e;
```

Per-event counts: `evt_003=16`, `evt_001=5`, `evt_002=5`, `evt_008=5`, `evt_006=4`,
`evt_007=3`, `evt_009=3`, `evt_005=2`, `evt_011=2`, `evt_012=2`, `evt_004=0`, `evt_010=0`.

- **`popular_events`** (`attendance_count > 0`, desc by count then `event_id`, top 10):
  `evt_003`(16), `evt_001`(5), `evt_002`(5), `evt_008`(5), `evt_006`(4), `evt_007`(3),
  `evt_009`(3), `evt_005`(2), `evt_011`(2), `evt_012`(2).
- **`low_attendance_events`** (`attendance_count > 0`, asc, top 10):
  `evt_005`(2), `evt_011`(2), `evt_012`(2), `evt_007`(3), `evt_009`(3), `evt_006`(4),
  `evt_001`(5), `evt_002`(5), `evt_008`(5), `evt_003`(16).
- **`zero_attendance_events`** (`attendance_count = 0`):
  **`evt_004`** (Robotics Intro Talk), **`evt_010`** (Study Skills Workshop). Exactly 2 —
  satisfies `data-contracts.md`'s "≥ 2 events with zero attendance rows" seed requirement.
  `evt_010` is cancelled but still appears here (this endpoint has no status filter in the
  all-time framing) — expected, not a bug.

### C3. `/analytics/rooms` (all-time)

**`room_utilization`** — confirmed bookings only (`bk_0008` excluded), hours =
`(end_ts − start_ts)`:

| room | confirmed_bookings | total_booked_hours | bookings |
|---|---|---|---|
| `room_001` Lecture Hall A | 2 | 4.0 | `bk_0005` 2h + `bk_0009` 2h |
| `room_006` Main Auditorium | 2 | 10.0 | `bk_0003` 2h + `bk_0006` 8h |
| `room_002` Lecture Hall B | 1 | 2.0 | `bk_0004` |
| `room_003` Seminar Room C | 1 | 3.0 | `bk_0007` (`bk_0008` cancelled → excluded) |
| `room_004` Robotics Lab | 1 | 3.0 | `bk_0002` |
| `room_005` Lab 204 | 1 | 2.0 | `bk_0001` |
| `room_007` Study Room 1 | 1 | 2.0 | `bk_0010` |
| `room_008` Study Room 2 | 0 | 0.0 | — |
| `room_009` Lab 305 | 0 | 0.0 | — (intentionally never booked) |

Order: `confirmed_bookings` desc, then `room_id`.

**`peak_booking_periods`** — `hour(start_ts)` of confirmed bookings:

| hour_of_day | booking_count | which |
|---|---|---|
| 9 | 1 | `bk_0006` |
| 10 | 3 | `bk_0002`, `bk_0005`, `bk_0007` |
| 13 | 1 | `bk_0004` |
| 14 | 2 | `bk_0003`, `bk_0009` |
| 15 | 2 | `bk_0001`, `bk_0010` |

Order by `hour_of_day`. Peak hour = **10:00** (3 bookings).

### C4. `/analytics/clubs` (all-time)

```sql
SELECT c.club_id, c.name, c.active,
  COUNT(DISTINCT e.event_id) AS event_count,
  COUNT(a.attendance_id)     AS total_registrations
FROM S.clubs c
LEFT JOIN S.events e ON e.club_id = c.club_id
LEFT JOIN S.event_attendance a ON a.event_id = e.event_id
GROUP BY c.club_id, c.name, c.active
ORDER BY event_count DESC, c.club_id;
```

**Expected:**

| club | active | event_count | total_registrations |
|---|---|---|---|
| `club_002` Robotics Club | true | 4 | 23 (`evt_002`5 + `evt_003`16 + `evt_004`0 + `evt_011`2) |
| `club_001` AI Club | true | 3 | 7 (`evt_001`5 + `evt_010`0 + `evt_012`2) |
| `club_004` Debate Society | true | 2 | 7 (`evt_006`4 + `evt_007`3) |
| `club_003` Photography Club | true | 1 | 2 (`evt_005`) |
| `club_005` Campus Sports Club | true | 1 | 5 (`evt_008`) |
| `club_006` Chess Club | false | 1 | 3 (`evt_009`) |

Sum of `total_registrations` = 47 = total `event_attendance` rows (sanity check).
`club_001.event_count` includes the cancelled `evt_010` — `event_count` has no status
filter (matches `data-contracts.md` benchmark #7's "how many has it run" historical
framing, and `club_002 = 4` here equals that benchmark's expected answer).

---

## D. Activity feed — `GET /api/activity` (`v2-api-contracts.md` §6.1)

Derived from `events.created_at` + `room_bookings.created_at`, merged, newest first.

```sql
SELECT 'event_created' AS type, e.created_at AS at, e.event_id, e.name, NULL AS booking_id
FROM S.events e
UNION ALL
SELECT 'room_booked', b.created_at, b.event_id, r.name, b.booking_id
FROM S.room_bookings b
JOIN S.rooms r ON r.room_id = b.room_id
ORDER BY at DESC
LIMIT 20;
```

**Expected top of feed (newest `created_at` first):** `evt_012` created `2026-08-31 09:00`,
then `bk_0010` booked `2026-08-31 09:05`… down through the older seed rows. Every seeded
`created_at` is between `2026-07-01` and `2026-09-01`, so with 12 events + 10 bookings = 22
candidate items, a `limit = 20` request drops the 2 oldest.

**Known limitation (documented, not a failure):** the feed can only show *creations*.
Cancellations (`evt_010`, `bk_0008`) have no timestamp in the schema, so they cannot be
placed chronologically. This is `data-contracts.md`'s proposed amendment **PA-1**
(`status_changed_at`) — flagged, not built. The feed shipping creation-only is the
documented fallback and does **not** block V2.

---

## E. Genie → Action row shapes (`v2-api-contracts.md` §7.2)

Genie stays read-only. These confirm that representative answers return rows whose column
names let the frontend heuristic recognize an actionable entity. **Recommendation for the
Genie Space:** for the event- and room-availability question families, ensure the
generated SQL consistently **selects and aliases `event_id` and `room_id`** (via Space
instructions / trusted-function shape), so the frontend match is reliable.

### E1. Event rows → "View Event" / "Register"

**Question:** "What events are happening this week?"

```sql
SELECT e.event_id, e.name, e.topic, e.start_ts, e.end_ts, e.status
FROM S.events e
WHERE e.status = 'scheduled'
  AND e.start_ts >= TIMESTAMP_NTZ '2026-08-31 00:00:00'
  AND e.start_ts <  TIMESTAMP_NTZ '2026-09-07 00:00:00'
ORDER BY e.start_ts;
```

**Expected — 7 rows**, each carrying `event_id` + `name` + `start_ts`:
`evt_006` (09-02), `evt_002` (09-03), `evt_005` (09-04), `evt_001` (09-05), `evt_012`
(09-05), `evt_007` (09-06), `evt_011` (09-06). `evt_010` (09-04) excluded — cancelled.
Row shape signal present → frontend renders **View Event** (everyone) and **Register**
(links to the external form with `event_id`).

### E2. Free-room rows → "Book Room" (council only)

**Question:** "Which labs are free at 3pm on 2026-09-05?"

```sql
SELECT r.room_id, r.name, r.type
FROM S.rooms r
WHERE r.type = 'lab'
  AND campus_companion.campus.room_is_free(r.room_id, TIMESTAMP_NTZ '2026-09-05 15:00:00');
```

**Expected — 2 rows:** `room_004` "Robotics Lab", `room_009` "Lab 305". `room_005`
"Lab 204" is **excluded** — `bk_0001` `[15:00, 17:00)` contains the *start* instant 15:00
(the start IS occupied; only the end instant is free). Rows carry `room_id` + `name` +
`type` → for a `council` session the frontend renders **Book Room**, pre-filling
`room_id` + the queried `[15:00, ?)` window into the existing `POST /api/bookings` form.
The write still goes through the unchanged booking contract (event selection + explicit
submit + server-side role re-check + conflict check). Genie never triggers the write.

### E3. Safe failure

**Question:** "Which room has the best natural light?" → no governed column supports this →
Genie `no_answer`; no rows, no action controls. Absence of an action is never an error.

---

## F. Internships — `internships` table (`data-contracts.md` #internships)

### F1. Open internships (default framing)

```sql
SELECT internship_id, company_name, role_title, deadline_ts
FROM S.internships
WHERE status = 'open'
ORDER BY deadline_ts;
```

**Expected — 5 rows** (`int_006` Amazon is `closed` → excluded), ordered by deadline:
`int_005` Campus AI Lab (`2026-09-12 17:00`), `int_004` Tesla (`2026-09-18 23:59:59`),
`int_003` Microsoft (`2026-09-25 18:00`), `int_001` Databricks (`2026-09-30 23:59:59`),
`int_002` Google (`2026-10-15 23:59:59`).

### F2. "Which internship closes soonest?"

**Expected:** `int_005` — "GenAI Student Researcher" at Campus AI Lab, deadline
`2026-09-12T17:00:00`, stipend "Rs 25,000/month". (`int_006`'s `2026-08-31` deadline is
earlier but it is `closed`, so it is not a valid answer to "closes soonest" among open
opportunities.)

### F3. "Show internships that have already closed."

```sql
SELECT internship_id, company_name, role_title FROM S.internships WHERE status = 'closed';
```

**Expected — 1 row:** `int_006` Amazon, "Cloud Solutions Architect Intern".

### F4. Attribute lookup

**Question:** "What's the stipend and eligibility for the Databricks internship?"

```sql
SELECT stipend, eligibility FROM S.internships WHERE internship_id = 'int_001';
```

**Expected:** stipend "Rs 75,000/month", eligibility "3rd & 4th Year CS/IT/Data Science".
Both quoted verbatim — no parsing of `stipend`, no join of `eligibility` to `students`.

### F5. Out-of-model internship question

**Question:** "Have any students from my class applied to the Google internship?" →
`internships` has no applicant/relationship data → Genie `no_answer` (there is no data to
answer from), **not** a guess.

---

## Verification checklist (fill in once a live Genie Space exists)

- [ ] Section A (event detail): A1 exact field values; A2 cancelled→null room; A3 no-row.
- [ ] Section B (Campus Pulse): B1–B7, including the B2 half-open boundary (`events_now: []`
      at 15:00) and B4's `available = 9` at the 15:00 boundary.
- [ ] Section C (Analytics): C1 six metrics; C2 the three event buckets incl. exactly 2
      zero-attendance events; C3 utilization + peak hour = 10:00; C4 per-club counts summing
      to 47 registrations.
- [ ] Section D (Activity): newest-first ordering; creation-only limitation confirmed as
      acceptable for V2.
- [ ] Section E (Genie → Action): E1 event rows expose `event_id`; E2 free-room rows expose
      `room_id` and correctly exclude `room_005` at the 15:00 start instant; E3 safe
      no-action failure.
- [ ] Section F (internships): F1 five open, deadline order; F2 `int_005`; F3 `int_006`;
      F4 verbatim attributes; F5 clean `no_answer`.
- [ ] Re-run through the live `POST /api/genie/ask` proxy where the question is
      Genie-answerable, to confirm the proxy doesn't alter behavior (Checkpoint 2).
- [ ] Results recorded in `context/progress-tracker.md`'s Agent 1 (V2) rows.
