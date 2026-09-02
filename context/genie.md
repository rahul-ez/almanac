# Genie

## Role

Genie is the sole natural-language intelligence layer of Campus Companion. Every "ask a
campus question" experience — room availability, teacher availability, event/attendance
questions, club and cross-entity questions — is answered by Genie translating the question
into SQL over the governed schema and returning a grounded result.

Genie's responsibility ends at **producing an answer from data it reads**. It is never
responsible for:
- Authentication or authorization (handled entirely by the backend's session/role logic).
- Validating or executing writes (bookings, event creation, attendance ingestion are all
  application-controlled INSERTs — see `architecture.md`).
- Any business logic beyond interpreting a question and querying governed tables.

**Division of responsibility:**
| | Genie | Application/backend |
|---|---|---|
| Answers "is Lab 204 free at 3pm?" | ✅ | — |
| Books Lab 204 | ❌ | ✅ |
| Answers "how many people registered for the AI Workshop?" | ✅ | — |
| Records a new registration | ❌ | ✅ |
| Decides if the caller is allowed to book a room | ❌ | ✅ |

---

## Data Surface

Genie is configured over exactly the seven tables defined in `data-contracts.md`, in a
single Unity Catalog schema. No other data is in Genie's scope.

| Table | Purpose for Genie |
|---|---|
| `clubs` | Resolve club names/categories for event/club questions |
| `students` | Support aggregate questions about attendee composition (major, year) — never for personalizing the response to "the current user" |
| `rooms` | Resolve room name/type for availability questions |
| `events` | The core "what's happening" entity — name, topic, time, club, status |
| `room_bookings` | Authoritative source for room occupancy/conflict — Genie must use this, not `events.room_id`, to determine availability |
| `teacher_timetable` | Authoritative source for teacher occupancy |
| `event_attendance` | Authoritative source for attendance/registration counts |

**Trusted SQL function:** `room_is_free(room_id, ts)` — encodes the half-open-interval
overlap check against `room_bookings` (joined to `events.status`) exactly as defined in
`data-contracts.md`. Genie must call this function for room-availability questions rather
than re-deriving the overlap logic itself, so its answers can never disagree with the
backend's direct-read endpoint, which uses the same logic.

---

## Semantic Rules

These are the interpretation rules Genie must apply consistently. Full definitions live in
`data-contracts.md`; this is the operational summary.

- **Room/teacher "free" or "available"** means no occupying record whose
  `[start_ts, end_ts)` interval contains the query instant. The interval is half-open: a
  booking/timetable entry ending at `T` does **not** occupy `T` itself. Always use
  `room_is_free()` for rooms; apply the identical logic manually for teachers (no separate
  function exists, but the formula is the same).
- **Attendance / "how many are attending/registered"** defaults to a raw row count of
  `event_attendance` for that event (duplicates included). Only use a distinct-email count
  if the question explicitly says "unique" or "different people."
- **Event status:** `scheduled` events are what "upcoming"/"happening" questions mean by
  default. `cancelled` events are excluded from default/current framing but remain valid
  answers to explicit historical questions ("did X run last month"). A cancelled event's
  room must be treated as free.
- **Booking status:** only `confirmed` bookings occupy a room. `cancelled` bookings never
  count toward availability.
- **Dates/times:** all timestamps are campus-local with no timezone offset; never convert.
  "Today," "this week," "right now" resolve against the current campus local time at query
  time. "This week" = the current Monday–Sunday.
- **Teacher identity:** a teacher is identified only by the exact `teacher_name` string —
  there is no separate teacher ID. Match names as configured in Synonyms (below); do not
  fuzzy-guess an unlisted name.
- **Room type vocabulary:** `classroom`, `lab`, `auditorium`, `study_room` are the only
  valid `rooms.type` values — map natural phrases ("study space," "lecture hall") to these
  four, never invent a fifth.

---

## Genie Instructions

Configure the Genie Space with these behavioral rules:

1. **Answer only from the seven governed tables listed above.** Never use outside
   knowledge, assumptions about the institution, or general information about universities
   in general to answer a question.
2. **Use the canonical definitions above for "free," "attending," "upcoming," and room
   types** — do not substitute an intuitive-but-different reading.
3. **Do not invent information.** If a name, room, or teacher isn't in the data, say the
   data doesn't contain it — never guess a plausible-sounding answer.
4. **Handle ambiguity by asking for the missing detail, not by guessing.** E.g. "free at
   3pm" with no date specified should assume today (campus local date) rather than asking,
   since that is the overwhelmingly common intent; but "is the professor free" with no name
   or time given should prompt for the missing detail rather than answering for an
   arbitrary teacher.
5. **Refuse unsupported questions cleanly.** Anything outside the seven tables (course
   grades, admissions, financial data, general knowledge, non-campus topics) gets a direct
   "I can only answer questions about campus events, rooms, teacher availability, and
   attendance" — not a best-effort guess.
6. **Never attempt a write.** Genie only ever issues read (SELECT) queries. If a user
   phrases a request as an action ("book Lab 204 for me," "register me for the workshop"),
   Genie must respond that it can't perform that action and point the user to the
   booking/registration flow in the app — it must not attempt to construct or execute a
   write, even if technically capable.
7. **Always be prepared to show the SQL/data basis for an answer** — the app surfaces this
   for transparency, so Genie's response should be structured so the underlying query and
   result rows are available to return alongside the natural-language answer.

---

## Core Query Capabilities

**Events**
- "What events are happening this week?"
- "When is the AI Workshop?"

**Attendance**
- "How many people are attending the AI Workshop?"
- "Which event has the highest attendance?"

**Rooms**
- "Which labs are free at 3pm today?"
- "Is Lab 204 available right now?"

**Teachers**
- "Is Prof. Rao free at 3pm?"
- "When is Prof. Rao busy today?"

**Clubs**
- "What events is the AI Club running this week?"
- "How many events has the Robotics Club run?"

**Cross-entity**
- "Which room is the AI Workshop in?"
- "How many Computer Science majors attended the AI Workshop?"

**Aggregations**
- "How many events is each club running this week?"
- "What's the total attendance across all events today?"

**Time-based**
- "What's on campus tomorrow?"
- "Which rooms are free for the next hour?"

---

## Trusted Assets / Tuning

Given the 12-hour constraint, only the mechanisms that materially reduce answer risk are
used:

- **Table and column descriptions (required):** every table and every non-obvious column
  (especially `status` enums, `room_id` on `events` vs. `room_bookings`, `student_id`
  nullability) gets a plain-English comment in Unity Catalog. This is the single highest-
  leverage tuning step and must be done for all seven tables before anything else.
- **Synonyms (required):** map the informal terms students actually use to the canonical
  schema — "free room" → available room via `room_is_free`; "prof"/"professor" →
  `teacher_name`; "CS" → `"Computer Science"` (matches `students.major`); club abbreviations
  as seeded (e.g. if a club is seeded as "AI Club," map "AI club," "the AI society," etc.
  to it).
- **Instructions (required):** the behavioral rules in Genie Instructions above, plus the
  semantic rules (interval convention, attendance-count default, status filtering) — pasted
  into the Genie Space's instructions field verbatim in spirit.
- **Trusted SQL function (required, one only):** `room_is_free(room_id, ts)`. This is the
  only trusted function needed — teacher availability and attendance counts are simple
  enough for Genie to derive correctly once the semantic rules are in the instructions, and
  adding more functions than necessary is not worth the setup time in a 12-hour build.
- **Benchmarks (required):** the query set below, run and verified before the demo.
- **Metric views:** not used. The project's only two derived metrics
  (`attendance_count`, `free_rooms_at`) are simple enough to express as plain SQL/instructions
  and don't justify the extra Unity Catalog metric-view setup step in this timeframe.

---

## Application Integration

```
User → Frontend (Ask Genie) → Backend (/api/genie/ask) → Genie Conversation API
     → SQL Warehouse → Unity Catalog tables → answer + SQL + rows
     → Backend → Frontend
```

- **Authentication/authorization:** not performed by Genie at any point. The Ask Genie
  surface is available to any session (student or council) since it is read-only; writes
  are handled entirely outside this path, by the backend's role-checked endpoints
  (`/api/bookings`, `/api/events`, `/api/ingest/attendance`), per `architecture.md`.
- **Writes:** never occur on this path. If a Genie answer is followed by a user wanting to
  act on it (book a room, register), the frontend directs them to the Admin Panel or Event
  Registration surface — separate, application-controlled flows.

---

## Synthetic Data

All data Genie queries is synthetic, per `data-contracts.md`. No real student, faculty, or
institutional data exists anywhere in the schema. Genie's instructions, synonyms, and
benchmark questions are written against the specific synthetic seed records defined there
(e.g. "Prof. Rao," "AI Club," "AI Workshop," "Lab 204") — these exact names must exist in
the seeded data before benchmarking, and any change to seed data that renames or removes a
benchmark's referenced entity requires updating the corresponding benchmark question.

---

## Benchmarks

The following must return correct, reliable answers before the demo. Each maps directly to
a synthetic seed scenario required by `data-contracts.md`.

1. "Which labs are free at 3pm today?" → returns the intentionally-unbooked lab plus any
   other lab not booked at that time.
2. "Is Lab 204 available right now?" → correct yes/no based on current `room_bookings`.
3. "Is Prof. Rao free at 3pm?" → correct yes/no, exercising both the busy-period and
   free-period seed entries for that teacher.
4. "How many people are attending the AI Workshop?" → returns the exact seeded
   `attendance_count` (raw count, duplicates included).
5. "What AI events are happening this week?" → returns the seeded AI-topic event(s) within
   the current week, excluding any cancelled event.
6. "Which room is the AI Workshop in?" → returns the room from that event's confirmed
   `room_booking`.
7. "How many events has [a multi-event club] run?" → correct count across that club's
   seeded events.
8. "How many Computer Science majors attended the AI Workshop?" → correct count via
   `event_attendance` → `students.major` join, exercising the unmatched-registrant
   (`student_id = null`) exclusion.
9. A boundary-time check: ask about a room/teacher exactly at a seeded back-to-back
   boundary instant (e.g. a booking ending at 15:00) → confirms the half-open interval rule
   is applied correctly (available at the boundary, not "occupied").
10. An out-of-scope question ("what's the cafeteria menu today?") → Genie declines cleanly
    rather than guessing.

---

## Failure Handling

- **Data unavailable (warehouse/Genie call fails):** Genie/backend returns the documented
  `error` status (see `architecture.md`); the app shows an explicit "live data unavailable"
  state. Never shown as a normal answer.
- **Ambiguous question (missing name, time, or room type Genie can't safely default):**
  Genie asks for the missing detail rather than guessing; it does not silently pick an
  arbitrary teacher, room, or event.
- **Unsupported question (outside the seven tables or non-campus topic):** Genie responds
  that it can only answer questions about campus events, rooms, teachers, and attendance —
  it does not attempt a best-effort answer from general knowledge.
- **Requested write (e.g. "book this room for me"):** Genie declines to perform it and
  points the user to the appropriate app flow (Admin Panel or Event Registration); it never
  attempts to execute or simulate a write.
- **Answer cannot be reliably determined** (e.g. an entity name matches nothing in the
  data, or the question requires data outside scope): Genie returns a "no data" / "I don't
  have that information" response rather than an approximate or invented one, consistent
  with the `no_answer` contract in `architecture.md`.
