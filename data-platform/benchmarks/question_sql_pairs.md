# Genie Benchmark Question/SQL Pairs

The ten required benchmarks from `context/genie.md`'s **Benchmarks** section,
each with a reference (ground-truth) SQL query against the seed data in
`../notebooks/02_seed_data.sql`, and the expected answer traced by hand against
that exact seed data.

**How to use this file:** after configuring the Genie Space with
`instructions.md` and `synonyms.md`, ask each question below directly in the
Databricks Genie UI and confirm Genie's answer matches "Expected result."
Genie is not required to generate the exact reference SQL shown — only to
reach the same correct answer, using `room_is_free()` for room questions per
`context/genie.md`. Record the outcome of each row in
`context/progress-tracker.md`'s Genie Readiness table.

**Status of this pass:** this repository has no live Databricks workspace
credentials available in the current environment (no `databricks` CLI, no
`.databrickscfg`, no `DATABRICKS_*` env vars — see `progress-tracker.md`
Blockers). The reference SQL and expected results below were derived by
manually tracing the overlap/aggregation logic against the literal seed rows
in `02_seed_data.sql`, not by executing against a live SQL warehouse or Genie
Space. **This is not a substitute for the required live run** — re-run all ten
questions in the Databricks UI once workspace access exists, and correct any
row below where the live result disagrees (the live result is authoritative;
if it disagrees, first check for a transcription bug in the seed data or this
file before assuming the reference logic is wrong).

Reference queries assume "now" / "today" = **2026-09-02** (the date this seed
set is built around — see `02_seed_data.sql`'s header) unless a benchmark
names an explicit date.

---

### 1. "Which labs are free at 3pm today?"

```sql
SELECT r.room_id, r.name
FROM campus_companion.campus.rooms r
WHERE r.type = 'lab'
  AND campus_companion.campus.room_is_free(r.room_id, TIMESTAMP_NTZ '2026-09-02 15:00:00');
```

**Expected result:** all three labs — **Robotics Lab** (`room_004`), **Lab
204** (`room_005`), **Lab 305** (`room_009`). None of the three has a booking
that falls on 2026-09-02 (Robotics Lab is only booked 2026-09-03, Lab 204 only
2026-09-05, Lab 305 is never booked). Confirms the "intentionally-unbooked
lab" (`room_009`) always appears, per `data-contracts.md`'s Synthetic Data
Requirements.

---

### 2. "Is Lab 204 available right now?"

```sql
SELECT campus_companion.campus.room_is_free('room_005', <now>);
```

**Expected result:** time-dependent — Lab 204 (`room_005`) is booked
(`bk_0001`, confirmed) only during **2026-09-05T15:00:00 to
2026-09-05T17:00:00** (exclusive of 17:00). Asked at any other time, the
answer is **true / available**. Asked between 15:00 and just before 17:00 on
2026-09-05, the answer is **false / unavailable**.

---

### 3. "Is Prof. Rao free at 3pm?" (and "at 1pm?", exercising both a busy and a free period)

```sql
SELECT NOT EXISTS (
  SELECT 1 FROM campus_companion.campus.teacher_timetable
  WHERE teacher_name = 'Prof. Rao'
    AND start_ts <= <ts>
    AND <ts> < end_ts
) AS is_free;
```

**Expected result at 2026-09-02T15:00:00 ("3pm"):** **false / busy** — `tt_0002`
("Faculty Meeting") occupies exactly `[15:00, 16:00)`.
**Expected result at 2026-09-02T12:00:00 ("noon"):** **true / free** — no
`teacher_timetable` row for Prof. Rao covers midday on 2026-09-02 (his only
entries that day are `[13:00, 15:00)` and `[15:00, 16:00)`).
Together these two queries exercise both a busy-period row and a free gap for
the same named teacher, per `context/genie.md`'s benchmark #3.

---

### 4. "How many people are attending the AI Workshop?"

```sql
SELECT COUNT(*) AS attendance_count
FROM campus_companion.campus.event_attendance
WHERE event_id = 'evt_001';
```

**Expected result:** **5** (raw row count, duplicates-inclusive convention —
there happen to be no duplicates within this specific event, but the count
rule is the same regardless). This is the seeded live-demo event; submitting
the Google Form for `evt_001` should move this to 6.

---

### 5. "What AI events are happening this week?"

```sql
SELECT e.name, e.start_ts, e.end_ts
FROM campus_companion.campus.events e
WHERE e.topic = 'AI'
  AND e.status = 'scheduled'
  AND e.start_ts >= TIMESTAMP_NTZ '2026-08-31 00:00:00'  -- Monday of the current week
  AND e.start_ts <  TIMESTAMP_NTZ '2026-09-07 00:00:00'; -- following Monday
```

**Expected result:** **AI Workshop** (`evt_001`), 2026-09-05 15:00-17:00. It
is the only `topic = 'AI'` event in the seed set, and it falls inside the
current week (2026-08-31 to 2026-09-06).

---

### 6. "Which room is the AI Workshop in?"

```sql
SELECT r.name
FROM campus_companion.campus.events e
JOIN campus_companion.campus.room_bookings b
  ON b.event_id = e.event_id AND b.status = 'confirmed'
JOIN campus_companion.campus.rooms r
  ON r.room_id = b.room_id
WHERE e.event_id = 'evt_001';
```

**Expected result:** **Lab 204** (`room_005`), via the confirmed booking
`bk_0001`. Equivalently, `events.room_id` for `evt_001` is already `room_005`
(the denormalized mirror agrees, as it must per the Data Integrity
Invariants).

---

### 7. "How many events has the Robotics Club run?"

```sql
SELECT COUNT(*) AS event_count
FROM campus_companion.campus.events e
JOIN campus_companion.campus.clubs c ON c.club_id = e.club_id
WHERE c.name = 'Robotics Club';
```

**Expected result:** **4** — `evt_002` (Robotics Bootcamp), `evt_003`
(Robotics Showcase), `evt_004` (Robotics Intro Talk), `evt_011` (Robotics Club
Open Lab Hours). This is unfiltered by `status`/date, matching a "how many has
it run" (historical/total) framing rather than an "upcoming" one.

---

### 8. "How many Computer Science majors attended the AI Workshop?"

```sql
SELECT COUNT(*) AS cs_attendee_count
FROM campus_companion.campus.event_attendance a
JOIN campus_companion.campus.students s ON s.student_id = a.student_id
WHERE a.event_id = 'evt_001'
  AND s.major = 'Computer Science';
```

**Expected result:** **3** — `stu_0001` (Aditi Sharma), `stu_0009` (Ananya
Menon), `stu_0013` (Ritika Bose). The 4th named registrant (`stu_0004`, Karan
Mehta) is Mechanical, and the 5th row (the unmatched guest registrant) has
`student_id = NULL` and is correctly excluded by the join rather than
miscounted.

---

### 9. Boundary-time check (half-open interval)

**Question:** "Is Lab 204 available at 5pm on 2026-09-05?"

```sql
SELECT campus_companion.campus.room_is_free('room_005', TIMESTAMP_NTZ '2026-09-05 17:00:00');
```

**Expected result:** **true / available**. `bk_0001` books Lab 204 for
`[2026-09-05 15:00:00, 2026-09-05 17:00:00)` — the end instant, 17:00, is
excluded by the half-open interval rule, so the room reads as free at exactly
that moment even though the booking's `end_ts` literal is `17:00:00`. This is
the single most important case to get right, per `data-contracts.md`'s Time,
Date, and Status Semantics.

*(A second, teacher-side boundary case is already covered by benchmark #3's
"3pm" query: `tt_0001` ends at exactly 15:00 and does **not** cover it, but
`tt_0002` starts at exactly 15:00 and **does** — the aggregate answer is
"busy" either way, but only `tt_0002` is the correct reason, which the
evidence disclosure should show.)*

---

### 10. Out-of-scope question

**Question:** "What's the cafeteria menu today?"

**Expected result:** Genie declines cleanly — no SQL is generated or
executed. Per `instructions.md`'s SCOPE rules, the response should be
equivalent to: "I can only answer questions about campus events, rooms,
teacher availability, and attendance." This must render as the `no_answer` UI
state (per `context/ui-rules.md`), not `error`.

---

## Verification checklist

- [ ] All 10 questions asked directly in the Databricks Genie UI, against the
      live seeded schema.
- [ ] Each answer matches "Expected result" above (or this file has been
      corrected to match a verified, correct live result).
- [ ] Benchmark #9's boundary case specifically confirmed — this is the
      highest-risk correctness bug in the whole product per
      `data-contracts.md`.
- [ ] Benchmark #10 confirmed to decline cleanly, not hallucinate.
- [ ] Results recorded in `context/progress-tracker.md`'s Genie Readiness
      table.
- [ ] Re-run once more through the real `POST /api/genie/ask` endpoint once
      Backend's proxy exists (Checkpoint 2), to confirm the proxy doesn't
      alter Genie's behavior, per `context/build-plan.md`.
