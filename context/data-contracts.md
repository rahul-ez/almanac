# Data Contracts

## Data Model Overview

Campus Companion's data model is deliberately small: seven entities, one schema, no
transformation layer, no secondary store. Every entity exists because a specific product
flow in `project-overview.md` needs it, and every field exists because either the frontend,
Genie, or a write flow depends on it.

The model has three groups of entities:

- **Reference/ownership data** — `clubs`, `students`, `rooms` — relatively static
  records that other entities point to.
- **Scheduled activity data** — `events`, `room_bookings`, `teacher_timetable` — records
  that occupy a specific time window and are the basis of every availability question.
- **Activity/registration data** — `event_attendance` — the one entity created by an
  end-user action outside the Admin Panel (the Google Form), and the basis of the live
  "attendance ticks up" demo.

Collectively, these seven entities let Genie and the application answer every flagship
question the product commits to (room availability, teacher availability, event attendance
counts, what's happening on campus) and let the Admin Panel perform the two governed writes
the product supports (creating events, booking rooms), while the ingestion webhook performs
the third (recording attendance).

This document defines the **meaning** of the data. `architecture.md` defines the systems
that read and write it; `genie.md` (separate file) defines how Genie is configured to use
it.

---

## Entity Inventory

| Entity | Purpose | Authoritative Source | Primary Identifier | Used By |
|---|---|---|---|---|
| `clubs` | The organisations that run events | Data Platform seed data / Admin Panel (future) | `club_id` | Events (ownership), Newsletter Home, Genie |
| `students` | Minimal roster used to enrich/resolve attendance and support aggregate questions | Data Platform seed data | `student_id` | `event_attendance` (optional resolution), Genie |
| `rooms` | Bookable physical spaces (classrooms, labs, auditorium, study rooms) | Data Platform seed data | `room_id` | `room_bookings`, `events`, Genie, Admin Panel |
| `events` | Scheduled campus events students can attend | Admin Panel (create) / Data Platform seed data | `event_id` | Newsletter Home, `event_attendance`, `room_bookings`, Genie |
| `room_bookings` | Confirmed reservations of a room for an event's time window; authoritative source for room availability | Admin Panel (create) / Data Platform seed data | `booking_id` | Rooms availability checks, Genie, Newsletter Home |
| `teacher_timetable` | Time periods during which a named teacher is occupied; authoritative source for teacher availability | Data Platform seed data | `entry_id` | Genie (teacher availability questions) |
| `event_attendance` | Individual registrations/attendance records for an event; authoritative source for attendance counts | Ingestion webhook (Google Form) / Data Platform seed data | `attendance_id` | Newsletter Home, Genie, live demo loop |

---

## Entity Contracts

### `clubs`

**Purpose**
Represents a student organisation that owns and runs events. Exists so events can be
grouped and attributed, and so Genie can answer questions like "how many events has the AI
Club run."

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `club_id` | string | Yes | Canonical identifier for the club | `club_` + 3-digit zero-padded number | `club_001` |
| `name` | string | Yes | Display name of the club; unique | Free text, unique across all clubs | `AI Club` |
| `category` | string | No | Broad classification used for grouping/filtering | One of: `Technical`, `Cultural`, `Sports`, `Academic`, `Social` | `Technical` |
| `active` | boolean | Yes | Whether the club currently runs events | `true` / `false`; default `true` | `true` |

**Identity**
`club_id` is the sole identifier. `name` must be unique but is not the identifier (names
are display values and could theoretically change; IDs never do).

**Relationships**
One `club` has many `events` (1:N via `events.club_id`).

**Lifecycle**
Created only by Data Platform seed data during this hackathon. No create/edit flow exists
in the Admin Panel for clubs (out of scope per `project-overview.md`). `active = false`
marks a club as inactive without deleting it; inactive clubs may still have historical
events but should not be offered when creating a new event.

**Invariants**
- `club_id` is immutable once created.
- `name` is unique (case-insensitive) across all clubs.
- Every `events.club_id` must reference an existing `clubs.club_id`.

**Example Record**
```json
{ "club_id": "club_001", "name": "AI Club", "category": "Technical", "active": true }
```

---

### `students`

**Purpose**
A minimal synthetic roster used to (a) optionally resolve an attendance registration to a
known student, and (b) support aggregate Genie questions about attendee composition (e.g.
"how many second-year students attended the AI Workshop"). This entity does not back any
login, account, or personalization feature — the product has no student-facing identity
system.

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `student_id` | string | Yes | Canonical identifier for the student | `stu_` + 4-digit zero-padded number | `stu_0001` |
| `name` | string | Yes | Synthetic display name | Free text, synthetic only | `Aditi Sharma` |
| `email` | string | Yes | Synthetic campus email; unique | Synthetic domain, e.g. `@campus.edu`; unique across all students | `aditi.sharma@campus.edu` |
| `year` | integer | No | Year of study | `1`–`4` | `1` |
| `major` | string | No | Field of study, used only for aggregate Genie questions | Free text from a fixed synthetic set, e.g. `Computer Science`, `Electronics`, `Mechanical`, `Civil`, `Biotechnology` | `Computer Science` |

**Identity**
`student_id` is the sole identifier. `email` is unique and is the field used to resolve an
incoming attendance registration to an existing student record (see `event_attendance`
lifecycle).

**Relationships**
One `student` may appear in zero or many `event_attendance` records (1:N, optional link).

**Lifecycle**
Created only by Data Platform seed data. There is no student self-registration or
account-creation flow. A registrant on the Google Form who does not match an existing
`students.email` is still recorded in `event_attendance` (with `student_id = null`); no new
`students` row is created from the ingestion path.

**Invariants**
- `student_id` is immutable.
- `email` is unique (case-insensitive) across all students.
- No field on this entity is ever used to grant application permissions; role (`student`
  vs `council`) is entirely session-based per `architecture.md` and is unrelated to this
  entity.

**Example Record**
```json
{ "student_id": "stu_0001", "name": "Aditi Sharma", "email": "aditi.sharma@campus.edu", "year": 1, "major": "Computer Science" }
```

---

### `rooms`

**Purpose**
Represents a physical, bookable space. Exists to answer room-availability questions and to
be the target of `room_bookings`.

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `room_id` | string | Yes | Canonical identifier for the room | `room_` + 3-digit zero-padded number | `room_204` is illustrative only; actual IDs are sequential, e.g. `room_001` |
| `name` | string | Yes | Display name; unique | Free text, unique across all rooms | `Lab 204` |
| `type` | string | Yes | Category of space, used for filtering ("free labs" questions) | One of: `classroom`, `lab`, `auditorium`, `study_room` | `lab` |
| `capacity` | integer | No | Maximum occupancy | Positive integer | `40` |

**Identity**
`room_id` is the sole identifier. `name` is unique but not the identifier.

**Relationships**
One `room` has many `room_bookings` (1:N). A `room` may be referenced by many `events` via
the denormalized `events.room_id` convenience field (see `events` below).

**Lifecycle**
Created only by Data Platform seed data. No create/edit flow exists for rooms in this
hackathon.

**Invariants**
- `room_id` is immutable.
- `name` is unique (case-insensitive).
- `type` must be one of the four allowed values; Genie's synonym mapping (documented in
  `genie.md`) depends on this fixed, closed set.

**Example Record**
```json
{ "room_id": "room_005", "name": "Lab 204", "type": "lab", "capacity": 30 }
```

---

### `events`

**Purpose**
Represents a scheduled campus event that students can learn about and register attendance
for. The central entity of the Newsletter Home view.

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `event_id` | string | Yes | Canonical identifier | `evt_` + 3-digit zero-padded number | `evt_001` |
| `name` | string | Yes | Display name of the event | Free text | `AI Workshop` |
| `club_id` | string | Yes | Owning club | Must reference an existing `clubs.club_id` | `club_001` |
| `topic` | string | No | Subject tag used for topical questions ("AI events this week") | Free text from a small synthetic set, e.g. `AI`, `Robotics`, `Career`, `Cultural`, `Sports`, `Workshop` | `AI` |
| `description` | string | No | Short free-text description | Free text | `Hands-on intro to LLMs` |
| `room_id` | string | No | The room this event is currently confirmed to use; denormalized from `room_bookings` (see below) | Must reference an existing `rooms.room_id`, or `null` if unbooked | `room_005` |
| `start_ts` | timestamp | Yes | When the event begins | ISO 8601, campus local time (see Time, Date, and Status Semantics) | `2026-09-05T15:00:00` |
| `end_ts` | timestamp | Yes | When the event ends | ISO 8601; must be strictly after `start_ts`; if not supplied at creation, defaults to `start_ts + 1 hour` | `2026-09-05T17:00:00` |
| `status` | string | Yes | Lifecycle state of the event | `scheduled` or `cancelled`; default `scheduled` | `scheduled` |
| `created_at` | timestamp | Yes | When the event record was created | ISO 8601 | `2026-09-01T09:00:00` |

**Identity**
`event_id` is the sole identifier.

**Relationships**
- Many `events` belong to one `club` (N:1 via `club_id`, required).
- One `event` may have zero or one confirmed `room_booking` at a time (1:0..1 — an event
  is not double-booked into two rooms simultaneously in this model).
- One `event` has many `event_attendance` records (1:N).

**Lifecycle**
Created by an authorised (`council`) user via the Admin Panel, or by Data Platform seed
data. There is no edit or delete flow in this hackathon (see Features Out of Scope in
`project-overview.md`); an event that must not proceed is marked `status = "cancelled"`
rather than deleted — but no UI to perform this transition is required for the MVP; the
field exists so the semantics are defined if a Data Platform seed scenario needs it.

**Invariants**
- `club_id` must reference an existing, `active = true` club at creation time.
- `end_ts` is always strictly after `start_ts`.
- `room_id`, when non-null, must always equal the `room_id` of that event's current
  confirmed `room_booking`, if one exists. The application (not Genie) is responsible for
  keeping this denormalized field in sync at the moment a booking is created — see Write
  Contracts.
- `status = "cancelled"` events are excluded from "upcoming events" reads and from room/
  teacher availability implications (a cancelled event's booking, if any, is not treated as
  occupying the room — see Business Rules).

**Example Record**
```json
{
  "event_id": "evt_001",
  "name": "AI Workshop",
  "club_id": "club_001",
  "topic": "AI",
  "description": "Hands-on intro to large language models",
  "room_id": "room_005",
  "start_ts": "2026-09-05T15:00:00",
  "end_ts": "2026-09-05T17:00:00",
  "status": "scheduled",
  "created_at": "2026-09-01T09:00:00"
}
```

---

### `room_bookings`

**Purpose**
The authoritative record of which room is reserved, for which event, during which time
window. This is the entity room-availability logic (both Genie's and the backend's direct
reads) actually checks — `events.room_id` is a convenience mirror, never the source of
truth for availability.

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `booking_id` | string | Yes | Canonical identifier | `bk_` + 4-digit zero-padded number | `bk_0001` |
| `room_id` | string | Yes | Room being booked | Must reference an existing `rooms.room_id` | `room_005` |
| `event_id` | string | Yes | Event the booking is for | Must reference an existing `events.event_id`; every booking belongs to exactly one event (no standalone/general-purpose bookings in this model) | `evt_001` |
| `start_ts` | timestamp | Yes | Booking window start | ISO 8601, campus local time | `2026-09-05T15:00:00` |
| `end_ts` | timestamp | Yes | Booking window end | ISO 8601; strictly after `start_ts` | `2026-09-05T17:00:00` |
| `status` | string | Yes | Booking state | `confirmed` or `cancelled`; default `confirmed` | `confirmed` |
| `created_at` | timestamp | Yes | When the booking was made | ISO 8601 | `2026-09-01T09:05:00` |

**Identity**
`booking_id` is the sole identifier.

**Relationships**
- Many `room_bookings` belong to one `room` (N:1, required).
- Each `room_booking` belongs to exactly one `event` (N:1, required — note this means an
  event may have multiple *historical* bookings over time, e.g. if rebooked, but at most
  one `status = "confirmed"` booking at a time; see Business Rules).

**Lifecycle**
Created by an authorised (`council`) user via the Admin Panel's booking flow, or by Data
Platform seed data. There is no cancel/edit flow required for the MVP; `status =
"cancelled"` exists in the model so a future or stretch implementation can support it
without a schema change, but is not exercised by any required flow.

**Invariants**
- `start_ts`/`end_ts` follow the same half-open-interval convention as `events` (see Time,
  Date, and Status Semantics).
- No two `room_bookings` with `status = "confirmed"` for the same `room_id` may have
  overlapping time windows (see Business Rules — this is the core conflict rule).
- Creating a confirmed booking for an event must update that event's `room_id` to match
  (see Write Contracts).

**Example Record**
```json
{
  "booking_id": "bk_0001",
  "room_id": "room_005",
  "event_id": "evt_001",
  "start_ts": "2026-09-05T15:00:00",
  "end_ts": "2026-09-05T17:00:00",
  "status": "confirmed",
  "created_at": "2026-09-01T09:05:00"
}
```

---

### `teacher_timetable`

**Purpose**
The authoritative record of when a named teacher is occupied (teaching, in a meeting,
etc.), used to answer "is Prof. X free at time T" questions. There is no separate
`teachers` entity — a teacher is identified solely by a canonical name string within this
table, since teachers are not application users and have no other attributes the product
needs.

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `entry_id` | string | Yes | Canonical identifier for the timetable entry | `tt_` + 4-digit zero-padded number | `tt_0001` |
| `teacher_name` | string | Yes | Canonical name of the teacher this entry occupies | Free text, but must be spelled identically across all entries for the same teacher (see Genie-Relevant Data Semantics) | `Prof. Rao` |
| `start_ts` | timestamp | Yes | Start of the occupied period | ISO 8601, campus local time | `2026-09-05T14:00:00` |
| `end_ts` | timestamp | Yes | End of the occupied period | ISO 8601; strictly after `start_ts` | `2026-09-05T15:00:00` |
| `activity` | string | No | What the teacher is doing during this period | Free text, e.g. `Teaching CS301`, `Faculty Meeting`, `Office Hours` | `Teaching CS301` |

**Identity**
`entry_id` is the sole identifier for the row. The teacher themselves is identified only
by the exact string value of `teacher_name` — there is no numeric teacher ID.

**Relationships**
Many `teacher_timetable` entries belong to one teacher (identified by name); this is a
semantic relationship only, not an enforced foreign key, since there is no `teachers`
table.

**Lifecycle**
Created only by Data Platform seed data. No create/edit flow exists for the timetable in
this hackathon (teacher timetables are read-only source data per
`project-overview.md`'s Features Out of Scope).

**Invariants**
- `end_ts` is always strictly after `start_ts`.
- A given `teacher_name` should not have two entries with overlapping time windows (a
  teacher cannot be recorded as occupied by two things at once) — Data Platform seed data
  must not violate this.
- `teacher_name` values must be reused verbatim (identical string) across all entries for
  the same person; near-duplicate spellings (e.g. `"Prof. Rao"` vs `"Professor Rao"`) must
  not both exist, as this would fragment a single teacher's schedule across two identities.

**Example Record**
```json
{ "entry_id": "tt_0001", "teacher_name": "Prof. Rao", "start_ts": "2026-09-05T14:00:00", "end_ts": "2026-09-05T15:00:00", "activity": "Teaching CS301" }
```

---

### `event_attendance`

**Purpose**
Records a single registration/attendance instance for an event. This is the entity the
live demo loop writes to, and the sole basis for any attendance-count question.

**Fields**

| Field | Type | Required | Description | Allowed / Expected Values | Example |
|---|---|---|---|---|---|
| `attendance_id` | string | Yes | Canonical identifier | `att_` + 4-digit zero-padded number | `att_0001` |
| `event_id` | string | Yes | Event being attended | Must reference an existing `events.event_id` | `evt_001` |
| `student_id` | string | No | Resolved student, if the registrant's email matched an existing `students.email` | Must reference an existing `students.student_id`, or `null` for an unmatched/guest registrant | `stu_0001` |
| `registrant_name` | string | Yes | Name as submitted on the registration form | Free text, synthetic | `Aditi Sharma` |
| `registrant_email` | string | Yes | Email as submitted on the registration form | Free text (synthetic), used to attempt `student_id` resolution | `aditi.sharma@campus.edu` |
| `registered_at` | timestamp | Yes | When the registration was recorded | ISO 8601, campus local time | `2026-09-05T14:58:00` |
| `source` | string | Yes | How the record was created | `google_form` (only value produced by the live ingestion path in this hackathon) or `seed` (Data Platform-generated) | `google_form` |

**Identity**
`attendance_id` is the sole identifier for the row.

**Relationships**
- Many `event_attendance` records belong to one `event` (N:1, required).
- Many `event_attendance` records may optionally resolve to one `student` (N:0..1).

**Lifecycle**
Created exclusively by (a) the attendance ingestion webhook when a Google Form is
submitted, or (b) Data Platform seed data (`source = "seed"`). There is no edit or delete
flow — attendance records are append-only for the duration of the hackathon.

**Invariants**
- `event_id` must reference an existing event; the ingestion write is rejected otherwise
  (see Write Contracts / Validation Rules).
- The same `registrant_email` registering for the same `event_id` more than once produces
  a duplicate attendance record by default (see Business Rules for the explicit decision
  on this) — the product intentionally does not attempt duplicate suppression in this
  hackathon, since a real registrant re-submitting is a valid, low-risk scenario and
  de-duplication logic is not required by any success criterion.
- `attendance_count` for an event (see Derived Fields and Metrics) is always computed as a
  live count of these rows — never stored redundantly elsewhere.

**Example Record**
```json
{
  "attendance_id": "att_0007",
  "event_id": "evt_001",
  "student_id": "stu_0001",
  "registrant_name": "Aditi Sharma",
  "registrant_email": "aditi.sharma@campus.edu",
  "registered_at": "2026-09-05T14:58:00",
  "source": "google_form"
}
```

---

## Relationships and Referential Integrity

| Relationship | Cardinality | Required? | Orphan Rule | Deletion/Deactivation Behavior |
|---|---|---|---|---|
| `clubs` → `events` | 1:N | Required (`events.club_id` cannot be null) | An `event` referencing a non-existent `club_id` is invalid data and must not be written | Clubs are never deleted; deactivate via `active = false`. Existing events of a deactivated club remain valid historical records. |
| `events` → `room_bookings` | 1:0..1 (confirmed) | Optional | A `room_booking` referencing a non-existent `event_id` is invalid data and must not be written | No delete flow; a booking is superseded only by a new confirmed booking for the same event (see Business Rules) |
| `rooms` → `room_bookings` | 1:N | Required (`room_bookings.room_id` cannot be null) | A `room_booking` referencing a non-existent `room_id` is invalid data and must not be written | Rooms are never deleted in this hackathon |
| `events` → `event_attendance` | 1:N | Required (`event_attendance.event_id` cannot be null) | An `event_attendance` row referencing a non-existent `event_id` must be rejected at write time (ingestion returns `unknown_event`, per `architecture.md`) | Attendance rows are append-only; never deleted |
| `students` → `event_attendance` | 1:0..N | Optional | `student_id` is nullable; unmatched registrants are valid, first-class records, not errors | No cascading behavior — students are never deleted |

**Non-foreign-key but semantically important relationships:**
- `events.room_id` mirrors `room_bookings` for the event's current confirmed booking. This
  is a **derived, denormalized relationship**, not an independent fact — it must never be
  set to a value that disagrees with the confirmed booking. If no confirmed booking exists
  for an event, `events.room_id` must be `null`.
- `teacher_timetable.teacher_name` relates entries to "the same teacher" purely by exact
  string equality — there is no enforced uniqueness or foreign key backing this, so
  consistent spelling is a data-quality invariant, not a database constraint.

---

## Business Rules

**Attendance / event registration**
- Any registration submitted through the Google Form for a known `event_id` is accepted
  and recorded, regardless of whether the event has already started, ended, or is at
  capacity — this hackathon's model has no capacity limits and no registration cutoff.
- A registration for an unknown `event_id` is rejected outright (not recorded with a null
  event reference).
- Repeated registrations by the same email for the same event are each recorded as
  separate rows (see `event_attendance` invariants) — the attendance count reflects raw
  registration volume, not unique-attendee count, unless a question specifically asks for
  distinct attendees (see Derived Fields and Metrics).

**Room booking / room availability**
- A room is considered **available** at a given instant `T` if and only if no
  `room_bookings` row with `status = "confirmed"` for that room has `start_ts <= T <
  end_ts` (see Time, Date, and Status Semantics for the half-open interval convention).
- A new booking request that overlaps an existing `confirmed` booking for the same room is
  a conflict and must be rejected — it is never allowed to create two overlapping
  confirmed bookings for the same room.
- Booking a room for an event that already has a confirmed booking replaces that event's
  current booking: the prior booking's `status` is set to `cancelled` and the new booking
  becomes the sole `confirmed` booking for that event, and `events.room_id` is updated to
  match. (No UI is required to trigger a re-booking in this hackathon's MUST HAVE scope,
  but the rule is defined so it behaves correctly if exercised.)
- A `cancelled` event's confirmed booking (if any) no longer counts toward room occupancy —
  cancelling an event effectively frees its room, even though no explicit "free the room"
  action is taken; availability logic must check `events.status != "cancelled"` for any
  booking it considers, via the booking's associated event.

**Teacher availability**
- A teacher is considered **available** at a given instant `T` if and only if no
  `teacher_timetable` row for that `teacher_name` has `start_ts <= T < end_ts`.
- Teacher availability is entirely independent of `events`/`room_bookings` — a teacher's
  schedule is not affected by campus events unless a timetable entry explicitly represents
  their involvement.

**Club / event ownership**
- Every event has exactly one owning club; there is no multi-club co-hosted event concept
  in this model.
- Only an authorised (`council`) session may create an event or booking; ownership by a
  specific club does not itself grant write permission — permission is role-based, not
  club-membership-based (there is no concept of "this council member belongs to this club"
  in this hackathon's scope).

**Student identity**
- `students` records are never created or modified by any runtime write path; the roster is
  static seed data for the duration of the hackathon.
- Matching a registration to a student is done by exact, case-insensitive `email` match at
  ingestion time; no fuzzy matching is performed.

**Duplicate prevention**
- Explicitly **not** enforced for `event_attendance` (see above).
- **Is** enforced for `room_bookings` (overlap conflict, above) and implicitly for
  `clubs.name` / `rooms.name` / `students.email` uniqueness (data-quality invariants on
  seed data, since there is no runtime create flow for these entities).

**Timestamps**
- Every entity that represents "when something happens" uses the shared timestamp
  convention defined in Time, Date, and Status Semantics; there is no entity-specific
  timezone or format variation.

**Status transitions**
- `events.status`: `scheduled → cancelled` is the only transition; `cancelled` is terminal.
- `room_bookings.status`: `confirmed → cancelled` is the only transition, occurring either
  through an explicit cancellation (not implemented as a flow in this hackathon) or
  implicitly when superseded by a re-booking for the same event (see above).

---

## Derived Fields and Metrics

### `attendance_count` (per event)
- **Meaning:** Total number of registration records for an event, including any
  duplicates.
- **Calculation:** `COUNT(*)` over `event_attendance` where `event_attendance.event_id =
  <event_id>`.
- **Source fields:** `event_attendance.event_id`.
- **Null/edge-case behavior:** An event with zero attendance rows has `attendance_count =
  0`, not `null`.
- **Stored or dynamic:** Always calculated dynamically at query time — never stored on
  `events` or anywhere else. This is the field that must visibly change the moment a new
  `event_attendance` row is inserted (the core live-demo guarantee).

### `distinct_attendee_count` (per event)
- **Meaning:** Number of unique registrants for an event, counting repeat registrations by
  the same email once.
- **Calculation:** `COUNT(DISTINCT LOWER(registrant_email))` over `event_attendance` where
  `event_id = <event_id>`.
- **Source fields:** `event_attendance.event_id`, `event_attendance.registrant_email`.
- **Null/edge-case behavior:** Zero if no attendance rows exist.
- **Stored or dynamic:** Calculated dynamically. Only used when a question specifically
  asks for unique/distinct attendees; the default "how many people are attending" question
  is answered with `attendance_count`, not this metric (see Genie-Relevant Data Semantics).

### `free_rooms_at(T, type?)`
- **Meaning:** The set of rooms (optionally filtered by `type`) with no overlapping
  confirmed, non-cancelled-event booking at instant `T`.
- **Calculation:** All `rooms` minus any room with a `room_bookings` row where `status =
  "confirmed"`, the associated `events.status != "cancelled"`, and `start_ts <= T <
  end_ts`.
- **Source fields:** `rooms.room_id`, `rooms.type`, `room_bookings.room_id`,
  `room_bookings.start_ts`, `room_bookings.end_ts`, `room_bookings.status`,
  `events.status`.
- **Null/edge-case behavior:** An empty result set is a valid answer ("no rooms free"), not
  an error.
- **Stored or dynamic:** Always calculated dynamically; never cached.

### `teacher_is_free(teacher_name, T)`
- **Meaning:** Boolean — whether the named teacher has no occupying timetable entry at `T`.
- **Calculation:** `NOT EXISTS` a `teacher_timetable` row for `teacher_name` with `start_ts
  <= T < end_ts`.
- **Source fields:** `teacher_timetable.teacher_name`, `teacher_timetable.start_ts`,
  `teacher_timetable.end_ts`.
- **Null/edge-case behavior:** An unrecognised `teacher_name` (no timetable rows at all,
  ever) should be treated as "no data for this teacher," not as "available" — the read
  contract must distinguish "free" from "unknown" (see Read Contracts).
- **Stored or dynamic:** Calculated dynamically.

All four derived values above must be computed identically regardless of whether the
consumer is Genie (via NL query, guided by the trusted `room_is_free`-style SQL function
referenced in `architecture.md`) or the backend's direct-read endpoints. Two different
components computing "is this room free" with different overlap logic is treated as a
contract violation (see Data Integrity Invariants).

---

## Time, Date, and Status Semantics

- **Format:** All timestamps are ISO 8601, `YYYY-MM-DDTHH:MM:SS` (no fractional seconds).
- **Timezone:** The product serves a single campus. All timestamps are stored and
  interpreted as **campus local time** (no timezone offset is stored, and none should be
  assumed or converted). No component may apply a UTC conversion.
- **Interval convention (critical, and shared by every "occupied window" concept —
  `events`, `room_bookings`, `teacher_timetable`):** every start/end pair defines a
  **half-open interval `[start_ts, end_ts)`** — the start instant is included, the end
  instant is excluded. This means:
  - A booking from `15:00` to `17:00` occupies the room for any query time `T` where `15:00
    <= T < 17:00`.
  - A query for exactly `17:00` is **not** considered occupied by that booking — a new
    booking may legitimately start at `17:00` immediately after one that ends at `17:00`.
    Back-to-back bookings/timetable entries that share a boundary instant do **not**
    overlap.
  - Two intervals `[a_start, a_end)` and `[b_start, b_end)` overlap if and only if
    `a_start < b_end AND b_start < a_end`. This is the single formula every conflict check
    (bookings) and every availability check (rooms, teachers) must use.
- **Event vs. booking duration default:** if an event is created without an explicit
  `end_ts`, the system defaults it to `start_ts + 1 hour`. This default is applied once at
  creation time and stored — it is never recomputed later.
- **"Now" / "today" / "this week" in questions:** any relative time reference (used by
  Genie or by the Newsletter Home's "upcoming" filter) is resolved against the current
  campus local time at the moment the question/request is made. "This week" means the
  current calendar week (Monday–Sunday) in campus local time.
- **Status values are closed enums:** `events.status` ∈ `{scheduled, cancelled}`;
  `room_bookings.status` ∈ `{confirmed, cancelled}`. No other values may ever be written.
  There is no "in progress" or "completed" status — whether an event is upcoming, ongoing,
  or past is always derived by comparing `start_ts`/`end_ts` to the current time, never
  stored as a separate status.

---

## Read Contracts

- **Room availability:** A room is "available" at time `T` strictly per the
  `free_rooms_at(T, type?)` definition above. A room with no bookings at all is always
  available. A room whose only overlapping booking belongs to a `cancelled` event is
  available. Consumers must never infer availability from `events` alone — the
  `room_bookings` table (joined to `events.status`) is the only correct source.
- **Teacher availability:** "Available" strictly means `teacher_is_free(name, T)` as
  defined above. A teacher name with zero timetable rows anywhere is a **data-not-found**
  case, and must be surfaced as such (e.g. Genie's `no_answer` shape, or the direct-read
  endpoint's `404 teacher_not_found`), never silently treated as "free all day."
- **Registered attendee:** Any row in `event_attendance` for the event in question counts
  as a registered attendee for the purpose of `attendance_count`, regardless of
  `student_id` being null (unmatched/guest registrants still count).
- **Current attendance:** "How many people are attending/registered for event X" always
  resolves to `attendance_count` (raw row count), not `distinct_attendee_count`, unless the
  question explicitly asks about unique/distinct people.
- **Active vs. inactive records:** `clubs.active = false` and `events.status = "cancelled"`
  records are excluded from any "current/upcoming" listing (Newsletter Home, default Genie
  framing) but remain fully queryable for historical questions ("how many events did the
  now-inactive Robotics Club run last semester") — inactivity/cancellation hides a record
  from default views, it does not delete or hide it from explicit historical queries.

---

## Write Contracts

### Create event
- **Required inputs:** `name`, `club_id`, `start_ts`.
- **Optional inputs:** `topic`, `description`, `end_ts` (defaults per Time semantics),
  `room_id`.
- **Validation:** `club_id` must reference an existing, `active = true` club. If `room_id`
  is supplied directly (without going through the booking flow), it is treated as a
  request to also create a matching confirmed `room_booking` for that room/time — an event
  is never left with a `room_id` that has no corresponding confirmed booking.
- **Affected entities:** `events` (insert); optionally `room_bookings` (insert), if a room
  was supplied.
- **Invariants preserved:** `end_ts > start_ts`; `events.room_id` always matches its
  confirmed booking, if any.
- **Duplicate handling:** No uniqueness constraint on event name; two events may share a
  name (e.g. a recurring workshop series) — they are distinguished by `event_id`.
- **Conflict handling:** If a `room_id` was supplied and the requested time conflicts with
  an existing confirmed booking for that room, the entire create-event request is rejected
  (the event is not created in a room-less state as a fallback) — the caller must resolve
  the conflict and resubmit, optionally without a room.
- **Resulting state:** A new `scheduled` event, with a new confirmed booking if a room was
  requested and available.

### Book a room
- **Required inputs:** `room_id`, `event_id`, `start_ts`, `end_ts`.
- **Validation:** `room_id` and `event_id` must reference existing records; `end_ts >
  start_ts`.
- **Affected entities:** `room_bookings` (insert, and cancellation of any prior confirmed
  booking for the same event, per Business Rules); `events.room_id` (update to match).
- **Invariants preserved:** No two confirmed bookings for the same room may overlap.
- **Duplicate handling:** Booking the same room/time twice for the same event is a no-op
  from the user's perspective but still creates one new confirmed booking record and
  cancels the previous one (simplest correct behavior; not specially detected as "identical
  re-booking").
- **Conflict handling:** Any overlap with another event's confirmed booking for the same
  room is rejected with the conflicting booking's details returned to the caller (see
  `architecture.md`'s `409 conflict` contract).
- **Resulting state:** Exactly one confirmed booking per event per room at a time;
  `events.room_id` synchronized.

### Record attendance (ingestion)
- **Required inputs:** `event_id`, `registrant_name`, `registrant_email`, `submitted_at`
  (mapped to `registered_at`).
- **Validation:** `event_id` must reference an existing event (regardless of that event's
  `status` — even a cancelled event's registrations, if any arrive, are recorded as-is;
  the ingestion path does not attempt to reject based on event status, since a form that
  was already public should not silently drop responses).
- **Affected entities:** `event_attendance` (insert only). Resolution of `student_id` is
  attempted via exact case-insensitive email match against `students.email`; if none
  matches, `student_id` is `null` and the row is still recorded in full.
- **Invariants preserved:** Append-only; no update or delete of existing attendance rows.
- **Duplicate handling:** Explicitly permitted — see Business Rules. No de-duplication is
  performed.
- **Conflict handling:** Not applicable (no exclusivity constraint on attendance).
- **Resulting state:** One new `event_attendance` row with `source = "google_form"`;
  `attendance_count` for that event increases by exactly one on the next read.

---

## Validation Rules

**Required-field validation**
- Every field marked `Required` in an entity's field table must be present and non-null on
  write; a write missing a required field is rejected before any database operation.

**Type validation**
- Timestamps must parse as valid ISO 8601 `YYYY-MM-DDTHH:MM:SS` values.
- IDs referenced in a write (`club_id`, `room_id`, `event_id`, `student_id`) must be
  strings matching the issuing entity's identifier format.

**Domain validation**
- Enum fields (`clubs.category`, `rooms.type`, `events.status`, `room_bookings.status`,
  `event_attendance.source`) must be one of their documented allowed values; any other
  value is invalid and must be rejected, not silently coerced.

**Relationship validation**
- Every foreign key (`events.club_id`, `events.room_id`, `room_bookings.room_id`,
  `room_bookings.event_id`, `event_attendance.event_id`, `event_attendance.student_id`)
  must reference an existing row of the correct entity at write time, except where
  explicitly nullable (`events.room_id`, `event_attendance.student_id`).

**Temporal validation**
- `end_ts` must be strictly after `start_ts` for every entity that has both fields
  (`events`, `room_bookings`, `teacher_timetable`).
- No other temporal ordering constraints apply (e.g. events may be created with a
  `start_ts` in the past for seed/demo purposes — see Synthetic Data Requirements — this is
  intentional, not a validation error).

**Uniqueness/conflict validation**
- `clubs.name`, `rooms.name`, `students.email` must be unique (case-insensitive);
  enforced at Data Platform seed-generation time since there is no runtime create path for
  these entities.
- `room_bookings` must not contain two `confirmed` rows for the same `room_id` with
  overlapping `[start_ts, end_ts)` windows — enforced at write time by the booking write
  path (see Write Contracts).

**Authorization-sensitive validation**
- `Create event` and `Book a room` writes require a `council`-role session, verified
  server-side per `architecture.md`; this is an authorization check, not a data validation
  check, but it gates the same write paths and must be evaluated before any of the
  validations above are applied (reject unauthorized requests before doing any DB work).
- The `Record attendance` write requires a valid shared ingestion token (per
  `architecture.md`) rather than a role — it is not tied to any user role at all.

---

## Synthetic Data Requirements

All data in this project, in every environment, is synthetic. No real names, emails, IDs,
faculty information, or institutional records may be used at any point.

**Entities requiring synthetic records:** all seven — `clubs`, `students`, `rooms`,
`events`, `room_bookings`, `teacher_timetable`, `event_attendance`.

**Minimum useful record counts**

| Entity | Minimum count | Rationale |
|---|---|---|
| `clubs` | 5 | Enough variety for "which clubs" questions without bloating seed effort |
| `students` | 20 | Enough for realistic attendance patterns and repeat-attendee scenarios |
| `rooms` | 8 (mix of types) | Enough to have both free and occupied rooms simultaneously, across all 4 `type` values |
| `events` | 10 | Mix of past, ongoing-at-demo-time, and upcoming; multiple per club |
| `room_bookings` | ≥ 1 per booked event (roughly 7–8) | Enough overlap and non-overlap scenarios to exercise conflict logic |
| `teacher_timetable` | 15–20 entries across 5–6 named teachers | Enough for both free and fully-booked teachers at plausible query times |
| `event_attendance` | 30–50 | Enough for meaningfully different attendance counts across events, plus at least one repeat-registrant case |

**Required relationships between synthetic records**
- Every seeded `event` must reference an existing `club_id`.
- At least 6–7 seeded events must have a corresponding confirmed `room_booking`; at least
  2–3 should intentionally have none (to demonstrate an "unbooked" event and to leave rooms
  free for the live booking demo).
- At least one room must have **two or more non-overlapping** confirmed bookings on the
  same day, and at least one pair of bookings across different rooms must occupy the exact
  same time window (to prove the conflict logic is per-room, not global).
- At least one room must be deliberately left with **no bookings at all**, so it is
  trivially free for any query time — useful for a reliable demo answer.
- At least 2 events must have **zero** `event_attendance` rows (to prove `attendance_count
  = 0` renders correctly, not as an error).
- At least 1 event must have a **high** attendance count (15+) and at least 1 a **low**
  count (1–2), to make comparative Genie questions meaningful.
- At least 2 students must appear in `event_attendance` for **more than one** event, to
  support "students attending multiple events" scenarios.
- At least 1 club must have **multiple** events (at least 3), to support "how many events
  has this club run" questions.
- At least 1 teacher must have **back-to-back** timetable entries sharing a boundary
  instant (e.g. one ending at `15:00`, another starting at `15:00`), to exercise the
  half-open-interval boundary rule deliberately.
- At least 1 teacher must have a **fully free afternoon** (no entries in a multi-hour
  window), and at least 1 must be **fully booked** for a representative day, to give Genie
  both a clear "yes" and a clear "no" to demonstrate.
- At least 1 event must be seeded with `status = "cancelled"`, with a formerly-confirmed
  booking now `status = "cancelled"` on that booking too, to demonstrate that a cancelled
  event's room is correctly treated as free.
- At least 1 `event_attendance` row must have `student_id = null` (an unmatched/guest
  registrant), to demonstrate that unmatched registrants are still counted correctly.
- At least one seeded `event_attendance` row should intentionally duplicate an
  earlier row's `registrant_email` + `event_id` pair, to demonstrate that duplicates are
  counted, not suppressed.

**Records specifically useful for demonstrating Genie queries**
- At least one event whose `name` and `topic` clearly support "what AI events are
  happening this week" (an `AI`-topic event with `start_ts` inside the current week at demo
  time).
- At least one clearly-named teacher (e.g. `"Prof. Rao"`) with both a busy period and a
  free period on the demo day, to reliably answer "is Prof. Rao free at 3pm" both ways
  depending on the time asked.
- At least one `lab`-type room kept intentionally unbooked, so "which labs are free right
  now" always has a non-empty, demonstrable answer.

**Records required for the live demo loop**
- The event used in the live registration demo (Google Form → ingestion) must be seeded
  with a **non-zero but easily-recountable** starting `attendance_count` (e.g. exactly 5),
  so the "+1 on submit" effect is obviously visible when demonstrated.

**Temporal coverage**
- Seed data must span: events/bookings in the past (completed), at least one active around
  the actual demo time window, and several in the near future (later the same week), so
  "this week," "today," and "right now" all resolve to non-trivial answers regardless of
  exactly when the demo is run.

**Deterministic identifiers / naming conventions**
- All IDs follow the prefix + zero-padded-number convention defined in each entity's
  Identity section (`club_001`, `stu_0001`, `room_00N`, `evt_00N`, `bk_000N`, `tt_000N`,
  `att_000N`), assigned sequentially in seed-script insertion order. This allows any
  developer to reference a specific seed record by a predictable ID without querying first.

**Referential consistency**
- The seed script(s) owned by the Data Platform workstream must insert entities in
  dependency order (`clubs`, `students`, `rooms` → `events` → `room_bookings`,
  `teacher_timetable` → `event_attendance`) so that every foreign key reference in later
  inserts points to an already-inserted row. No seed script may reference an ID it has not
  yet created.

**Reset/regeneration**
- The full seed dataset must be re-runnable idempotently: re-running the seed script(s)
  should either (a) fully truncate and reload all seven tables, or (b) be safely skippable
  if data already exists. Partial/duplicate reseeding that leaves two conflicting copies of
  the same logical record is not acceptable, since it would silently violate the
  uniqueness invariants above.

---

## Data Integrity Invariants

- A `room_booking` with `status = "confirmed"` can never overlap another `confirmed`
  booking for the same `room_id`, using the half-open `[start_ts, end_ts)` interval rule.
- An `event_attendance` record's `event_id` must always reference an existing event; there
  are no orphaned attendance records.
- `events.room_id` must always equal the `room_id` of that event's current `confirmed`
  booking, or be `null` if none exists — the two must never disagree.
- `attendance_count` for any event is always the live `COUNT(*)` of its
  `event_attendance` rows — it is never stored, cached, or allowed to drift from that
  count.
- A cancelled event's room is treated as free by every availability check, without
  requiring its booking to be separately, manually cancelled by a human — the two
  cancellations happen together as part of the same rule (see Business Rules).
- `teacher_timetable` entries for the same teacher must never overlap each other.
- No entity in this model stores a duplicate, cached, or independently-maintained copy of
  a value that is authoritatively derived elsewhere (e.g. no stored `attendance_count`
  column, no stored `is_available` flag on rooms).
- Every timestamp in the system uses the same format and the same (campus-local, no
  timezone conversion) interpretation — a timestamp is never written or read with an
  implicit UTC assumption.

---

## Genie-Relevant Data Semantics

- **"Free" / "available" is always the half-open interval definition** in this document,
  not an intuitive "not currently booked at all today" reading. Genie's instructions
  (`genie.md`) must encode the exact overlap formula, not a looser paraphrase, or its
  answers will disagree with the backend's direct-read endpoints at boundary times.
- **"Attending" / "registered" defaults to raw `attendance_count`**, not
  `distinct_attendee_count`. If a question explicitly says "unique," "distinct," or "how
  many different people," Genie should use `distinct_attendee_count` instead — this
  distinction must be explicit in Genie's instructions, since the two numbers can differ
  when duplicate registrations exist (seeded intentionally, per Synthetic Data
  Requirements).
- **"Lab," "classroom," "study room," "auditorium"** map exactly to the four closed
  `rooms.type` values — Genie must not infer a fifth type or treat these as free text.
- **Teacher identity is name-string-only.** Genie must match `teacher_timetable.teacher_name`
  as the sole identifier for "is Prof. X free" questions; there is no separate teacher ID
  to disambiguate near-duplicate spellings, so Genie's synonym configuration is the only
  safeguard against a name-matching miss (documented further in `genie.md`).
- **"Upcoming" / "current" events implicitly exclude `status = "cancelled"`**, and by
  extension the newsletter-style default framing of "what's happening" should too — but an
  explicit historical question ("did the Robotics Club run an event last month") should not
  be filtered by status unless the question itself implies "currently scheduled."
  Genie's instructions must distinguish these two framings.
- **A missing/unknown entity (e.g. an unrecognised teacher name) is a "no data" answer,
  never a "yes, available" answer.** This is the single most important failure mode to
  encode correctly in Genie's instructions, since the two produce opposite-sounding but
  very different-meaning responses.
- **`students.major` and `students.year` exist only to support aggregate, non-personalized
  questions** (e.g. "how many Computer Science majors attended X"). They must not be
  interpreted by Genie as identifying or personalizing a response for the person asking the
  question — the product has no concept of "the current user's major."

---

## Data Contract Change Rules

- This document is the single canonical definition of every entity, field, relationship,
  and business rule. Any implementation detail elsewhere (backend code, Genie
  configuration, seed scripts, frontend types) must conform to it, not the reverse.
- **Adding a field** is a non-breaking change if it is optional and does not alter the
  meaning of any existing field; it must still be published here (this file updated)
  before other workstreams may rely on it.
- **Renaming a field or entity** is always a breaking change. It must not be done silently;
  it requires updating this file and explicitly notifying (via this file's change) every
  workstream whose contract in `architecture.md` references the old name.
- **Removing a field or entity** is always a breaking change and requires the same process
  as renaming.
- **Changing semantics** (e.g. redefining "available," changing the interval convention
  from half-open to closed, changing what `attendance_count` counts) is always a breaking
  change, regardless of whether any field name changed, because Genie's configuration, the
  backend's SQL, and the frontend's assumptions all depend on the documented meaning, not
  just the field name.
- **Changing allowed enum values** (adding a new `rooms.type`, a new `status` value, etc.)
  is a breaking change for any consumer that assumes the enum is closed (in particular
  Genie's synonym mapping and any UI that renders a fixed set of filters) and must be
  published here first.
- **Modifying a relationship** (e.g. making `room_id` required on `events`, or allowing an
  event to have multiple simultaneous confirmed bookings) is always a breaking change.
- **Process for any breaking change:** update this file first, with the change clearly
  described; only after that update should the producing workstream (typically Data
  Platform or Backend) implement it. Other workstreams should treat an unannounced schema
  change discovered only in running code as a defect to be reported, not silently adapted
  to.

---

## Data Contract Checklist

- [x] Every core entity (`clubs`, `students`, `rooms`, `events`, `room_bookings`,
      `teacher_timetable`, `event_attendance`) has a complete contract: purpose, fields,
      identity, relationships, lifecycle, invariants, example record.
- [x] Every field has one precise, unambiguous meaning and documented allowed values.
- [x] All relationships, cardinalities, and referential-integrity rules are explicit,
      including the non-FK `events.room_id` denormalization and the name-only teacher
      relationship.
- [x] Business rules are stated for attendance, registration, booking, availability,
      ownership, identity, duplicate handling, and status transitions.
- [x] Time/date/status semantics are fully defined, including the exact half-open interval
      overlap rule that resolves boundary-time ambiguity.
- [x] Every derived metric (`attendance_count`, `distinct_attendee_count`,
      `free_rooms_at`, `teacher_is_free`) has one canonical calculation that all consumers
      must share.
- [x] Read contracts define exactly what "available," "registered," and "active" mean.
- [x] Write contracts define required inputs, validation, conflict handling, and resulting
      state for every mutation (create event, book room, record attendance).
- [x] Validation rules are separated by category (required-field, type, domain,
      relationship, temporal, uniqueness, authorization-sensitive).
- [x] Every MUST HAVE and SHOULD HAVE flow from `project-overview.md` can be demonstrated
      using synthetic data alone, with specific required scenarios enumerated.
- [x] Synthetic data requirements guarantee referential consistency and idempotent
      reset/regeneration.
- [x] Genie-relevant semantics are documented (without duplicating Genie configuration,
      which belongs in `genie.md`).
- [x] Four independent agents can implement against this document without needing to ask
      what any entity or field means.
- [x] The model is small enough — seven entities, no transformation layer, no audit
      infrastructure — to realistically build within the 12-hour hackathon constraint.
