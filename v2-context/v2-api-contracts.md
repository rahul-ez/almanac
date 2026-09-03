# V2 API Contracts

## 0. Purpose and Status

This document is the shared API contract for Campus Companion **V2**, primarily between
the Backend and Frontend implementation agents. It extends the existing FastAPI backend
defined in `architecture.md`'s Integration Contracts section — it does not replace or
redesign it.

**Architectural rules this document does not renegotiate** (all inherited from
`architecture.md` and restated in `v2-product-plan.md` Section 4):

- `Frontend → FastAPI Backend → Databricks / Genie` is the only data path. The frontend
  never calls Databricks or Genie directly.
- Genie is read-only. It never executes INSERT/UPDATE/DELETE, in V1 or V2.
- All writes go through backend-owned, parameterized SQL in `backend/app/db.py`.
- Authorization (`student` vs. `council`) is enforced server-side only, on every
  protected write, regardless of how the request was reached.
- Databricks (Unity Catalog, one schema, one warehouse) remains the single source of
  truth. No cache, no secondary store.
- No new frameworks, state-management libraries, or architectural abstractions are
  introduced. New endpoints follow `code-standards.md`'s existing router/`db.py`/
  `genie_client.py` separation exactly.

**A correction to the existing context set, made explicit here so it isn't silently
carried forward:** `data-contracts.md` defines an eighth entity, `internships`, which
according to the product owner **is already implemented in the MVP**, not merely
proposed. `genie.md`'s "exactly the seven tables" language, `architecture.md`'s repeated
"seven tables"/"7 tables" phrasing, and `v2-product-plan.md`'s Section 17 claim that "there
is no `internships` entity ... anywhere" are all now stale on this one point. This
document treats `internships` as real, existing, governed data. It does **not** invent new
V2 product surfaces for internships beyond what's noted in Section 16 (Data Dependencies),
since `v2-product-plan.md` does not scope any internships-facing UI — that gap is flagged,
not filled in, here.

**Format.** Every endpoint uses:

```
### METHOD /path

Purpose:
Authorization:
Query Parameters / Request Body:
Response:
Errors:
Data Source:
Notes:
```

All JSON is illustrative example data, clearly labeled `Example:`, built from the ID
formats and field names in `data-contracts.md` (`evt_001`, `room_005`, `club_001`,
`bk_0001`, `att_0007`, `int_001`, etc.). No implementation code is included.

---

## 1. Existing API Baseline (V1 — Unchanged Unless Noted)

This is exactly what `architecture.md`'s Integration Contracts section already defines.
Nothing here is invented; where V2 modifies one of these, it is called out explicitly in
the relevant section below and again in Section 15.

| Endpoint | Purpose | Auth |
|---|---|---|
| `POST /api/session` | Issue a signed role cookie (`student` default, `council` if access code matches) | None (this endpoint never errors) |
| `POST /api/genie/ask` | Submit a natural-language question, get a grounded answer + SQL/rows | Any session |
| `GET /api/events` | List events (optional `upcoming=true`, default true) | Any session |
| `GET /api/rooms/availability` | Room availability at a time, optionally filtered by type | Any session |
| `GET /api/teachers/availability` | Direct (non-Genie) teacher availability lookup | Any session |
| `POST /api/bookings` | Create a room booking | `council` only |
| `POST /api/events` | Create an event | `council` only |
| `POST /api/ingest/attendance` | Record an attendance/registration row (Google Form webhook) | `INGEST_TOKEN`, not role-based |

Full request/response shapes for these are authoritative in `architecture.md` and are not
re-quoted verbatim here except where V2 modifies them.

---

## 2. Session / Role-Aware Entry

### 2.1 `POST /api/session` — **MODIFIED (additive, backward-compatible)**

**Purpose:** Establish role for the session, and — new in V2 — optionally capture a
UX-convenience display name/email for a `student` session so surfaces like event
registration can pre-fill without asking twice per session.

**Authorization:** None (public; this endpoint never errors).

**Request Body:**
```json
{
  "access_code": "optional-club-code",
  "display_name": "optional, student sessions only",
  "display_email": "optional, student sessions only"
}
```

**Response:** HTTP 200, sets the same signed HTTP-only cookie as V1, body:
```json
{ "role": "council" }
```
or
```json
{ "role": "student", "display_name": "Aditi Sharma", "display_email": "aditi.sharma@campus.edu" }
```
`display_name`/`display_email` are echoed back only if supplied; omitted otherwise.

**Errors:** None — matches V1 behavior exactly; an invalid/missing `access_code` still
silently resolves to `role: "student"`.

**Data Source:** None. `display_name`/`display_email` are stored **only inside the signed
cookie's claims**, never written to `students` or any table. They are not validated
against `students.email` and never resolve or create a `students` row — this is
explicitly a UX convenience, not identity, per `v2-product-plan.md` Section 6.1.

**Notes:**
- This is additive: existing callers sending only `access_code` see no behavior change.
- `display_name`/`display_email` must never be used anywhere as an authorization signal —
  only `role` is.
- Frontend must not persist these fields itself (`localStorage`/`sessionStorage`); they
  live for the cookie's lifetime only, consistent with the "session-only, not
  cross-reload" rule in `code-standards.md`'s State Management table.

### 2.2 `GET /api/session` — **NEW**

**Purpose:** Let the frontend retrieve the current session's role (and optional display
fields) without re-submitting `POST /api/session` — needed so a returning-within-session
user (e.g. navigating back to Home) doesn't need to re-run the entry screen, and so
`RoleGate`/`TopBar` can render correctly on load.

**Authorization:** None required to call it; it reflects whatever cookie is present.

**Request:** No body, no query params. Reads the existing signed cookie.

**Response:** HTTP 200.
```json
{ "role": "student", "display_name": "Aditi Sharma", "display_email": "aditi.sharma@campus.edu" }
```
If no cookie is present or it fails verification:
```json
{ "role": "student" }
```
(never `council` — matches the existing "missing/tampered cookie is treated as student"
rule in `architecture.md`'s Authentication and Authorization section).

**Errors:** None — always 200, mirroring `POST /api/session`'s "never errors" contract.

**Data Source:** The signed cookie only; no SQL executed.

**Notes:** This is a read of existing session state, not a new authorization mechanism.

### 2.3 `POST /api/session/end` — **NEW**

**Purpose:** Let a user explicitly end their session (e.g. a "not you?" / "start over"
control on the role-aware entry screen, or a council user stepping back down to student
without closing the tab).

**Authorization:** None required.

**Request:** No body.

**Response:** HTTP 200, clears the session cookie.
```json
{ "role": "student" }
```

**Errors:** None.

**Data Source:** None.

**Notes:**
- This does not "log out" in any account sense — there are no accounts. It simply clears
  the signed cookie so the next `GET /api/session` reports `student` with no display
  fields, and a subsequent `POST /api/session` is required to regain `council`.
- Optional for V2; only needed if the role-aware entry screen's UX design calls for an
  explicit reset control. If not, this endpoint can be deferred — flagged as **optional,
  not required for Must Ship**.

### 2.4 Future direction (not implemented here)

Campus SSO / institutional identity (SAML/OAuth) is explicitly **future production
direction only**, per `v2-product-plan.md` Section 14. No SSO API is defined in this
document, and the session mechanism above must not be read as a stepping stone that
requires a particular SSO shape later — it is a self-contained, disposable mechanism per
`architecture.md`'s existing constraints.

---

## 3. Event Discovery

### 3.1 `GET /api/events` — **MODIFIED (additive query params + additive response fields)**

**Purpose:** List events for Grid, Calendar, and Campus Pulse consumption. V2 adds
filtering and a few response fields the V1 shape didn't need but V2's surfaces do.

**Authorization:** Any session.

**Query Parameters (all optional):**

| Param | Type | Meaning | Notes |
|---|---|---|---|
| `upcoming` | boolean | V1, unchanged. Defaults `true`. | When `true`, excludes `status = "cancelled"` and (per existing semantics) frames "current/upcoming" per `data-contracts.md`'s Read Contracts. |
| `from` | ISO date or datetime | Start of a date range (inclusive) | Campus-local, no timezone conversion, per `data-contracts.md` |
| `to` | ISO date or datetime | End of a date range (exclusive), per the project's existing half-open convention | Used by Calendar; see 3.1 Notes |
| `club_id` | string | Filter to one club | Must match an existing `clubs.club_id`; unknown ID returns an empty `events` array, not an error |
| `status` | `scheduled` \| `cancelled` | Filter by status | When supplied, overrides the `upcoming` default-exclusion behavior for that explicit status — matches `data-contracts.md`'s Read Contracts distinction between default framing and explicit historical queries |
| `q` | string | Free-text search | Matches against `events.name`/`events.description` (simple substring/ILIKE match — no full-text search engine is introduced) |

**Response (fields in bold are new in V2, additive):**
```json
{
  "events": [
    {
      "event_id": "evt_001",
      "name": "AI Workshop",
      "club": "AI Club",
      "topic": "AI",
      "start_ts": "2026-09-05T15:00:00",
      "end_ts": "2026-09-05T17:00:00",
      "room": "Auditorium",
      "status": "scheduled",
      "attendance_count": 42
    }
  ]
}
```
- `topic`, `end_ts`, `status` are new fields, added because Calendar (needs `end_ts` to
  size a block), the Grid/Calendar toggle and Campus Pulse (need `status` to distinguish
  `ongoing`/`upcoming`/`cancelled` client-side per the existing `StatusIndicator` state
  vocabulary in `ui-tokens.md`), and topical filtering all require them. This is a
  backward-compatible additive change — no existing field is renamed or removed.

**Errors:** Same as V1: query failure → HTTP 502, `{ "events": [], "error": "..." }`.
Unrecognized `status` value → HTTP 422 (Pydantic validation, per `code-standards.md`'s
enum validation rule — `events.status` is a closed `{scheduled, cancelled}` set).

**Data Source:** Existing `events`, `clubs`, `room_bookings`, `event_attendance` tables —
no new table. Filtering logic is additional `WHERE` clauses in the existing
`db.py` query function, per `code-standards.md`'s "one function per read operation" rule.

**Notes:**
- `from`/`to` follow the existing half-open interval convention from
  `data-contracts.md`: an event is included if `from <= start_ts < to` when both are
  supplied. A `from` with no `to` means "on or after"; a `to` with no `from` means
  "before."
- `q` is intentionally simple (substring match) — this is not a search-engine feature; if
  it proves inadequate, that's a future decision, not one this document resolves.
- No filter exists for a field `data-contracts.md` doesn't define (e.g. no capacity
  filter, no "featured" flag) — consistent with "do not add filters the data model can't
  support."

### 3.2 `GET /api/events/{event_id}` — **NEW**

**Purpose:** Power the Event Detail surface (`v2-product-plan.md` Section 6.3).

**Authorization:** Any session (read-only; the surface's council-specific management
actions reuse the existing write endpoints, not this one — see Section 9).

**Path Parameter:** `event_id` (string, e.g. `evt_001`).

**Response:**
```json
{
  "event_id": "evt_001",
  "name": "AI Workshop",
  "club": "AI Club",
  "club_id": "club_001",
  "topic": "AI",
  "description": "Hands-on intro to large language models",
  "room": "Auditorium",
  "room_id": "room_005",
  "start_ts": "2026-09-05T15:00:00",
  "end_ts": "2026-09-05T17:00:00",
  "status": "scheduled",
  "attendance_count": 42,
  "created_at": "2026-09-01T09:00:00"
}
```
- `room`/`room_id` are `null` if the event has no confirmed booking, matching
  `data-contracts.md`'s `events.room_id` nullability.
- `description` is `null`/omitted if not set — it's an optional field on `events`.

**Errors:**
- Unknown `event_id` → HTTP 404, `{ "error": "event_not_found" }`.
- Query failure → HTTP 502, `{ "error": "..." }`.

**Data Source:** `events` (joined to `clubs` for the club name, `room_bookings`/`rooms`
for the current confirmed booking) and `event_attendance` for `attendance_count` — all
existing tables, existing derived-field semantics (`attendance_count` per
`data-contracts.md`'s Derived Fields and Metrics; never `distinct_attendee_count` unless a
future surface explicitly labels itself "unique").

**Notes on registration:**
- There is **no** `registration_url` field returned by this endpoint. Per
  `project-overview.md`, event registration is a single, shared Google Form (not one form
  per event); the existing convention is that the frontend links out to that form,
  parameterized with the event's identity, per `ingestion/form-config-notes.md`'s existing
  field mapping. This document does not invent a per-event URL field the data model
  doesn't have. **This is marked TBD** if the team wants a per-event deep link instead of
  a single shared form with a query parameter — that would be a `data-contracts.md` /
  ingestion workstream decision, not an API-layer one.
- No event-editing fields are exposed here beyond what's read-only; see Section 9.1 for
  the edit/cancel write path.

### 3.3 Calendar — reuses 3.1, no new endpoint

Per `v2-product-plan.md` Section 6.4 ("not a separate data surface"), Calendar is powered
entirely by `GET /api/events` with `from`/`to` set to the visible date range (a week or a
day, depending on the calendar's current view). No `GET /api/calendar` endpoint is
created.

**Documented specifically for Calendar's consumption:**
- **Date-range parameters:** `from`/`to`, as defined in 3.1.
- **Timezone assumption:** Campus-local, no conversion, exactly as every other timestamp
  in the system — the calendar view must not apply a browser-local timezone shift.
- **Event status behavior:** By default (no explicit `status` param), cancelled events are
  excluded, matching Grid's default. If the calendar UI wants to visually show cancelled
  events (e.g. struck through) rather than hide them, it must explicitly pass
  `status=cancelled` as a second request and merge client-side, or omit `upcoming`
  filtering — this document does not silently change the default-exclusion rule from
  `data-contracts.md`.
- **Response shape:** Identical to 3.1's `events` array — no calendar-specific
  transformation happens server-side (e.g. no server-side "week bucket" grouping); that is
  a frontend rendering concern.
- **Ordering:** Ascending by `start_ts`. This is a new, explicit guarantee (V1's contract
  didn't specify ordering); it is safe to add since it doesn't change field shape.

---

## 4. Campus Pulse

### 4.1 `GET /api/campus/pulse` — **NEW**

**Purpose:** Power the "what's true on campus right now" summary
(`v2-product-plan.md` Section 6.5) in one call, avoiding the frontend having to compose
several requests and reconcile "now" across them.

**Authorization:** Any session.

**Query Parameters:** None. Always evaluated against the current campus-local time at
request time, per `data-contracts.md`'s "now" resolution rule.

**Response:**
```json
{
  "at": "2026-09-05T15:00:00",
  "events_now": [
    { "event_id": "evt_001", "name": "AI Workshop", "club": "AI Club", "room": "Auditorium", "end_ts": "2026-09-05T17:00:00" }
  ],
  "events_upcoming": [
    { "event_id": "evt_004", "name": "Robotics Meetup", "club": "Robotics Club", "start_ts": "2026-09-05T18:00:00" }
  ],
  "rooms_available_count": 5,
  "rooms_total_count": 9,
  "registrations_today": 12,
  "next_major_event": { "event_id": "evt_004", "name": "Robotics Meetup", "start_ts": "2026-09-05T18:00:00" }
}
```

**Field definitions and source:**

| Field | Meaning | Source | Derivation |
|---|---|---|---|
| `events_now` | `status = "scheduled"` events where `start_ts <= at < end_ts` | `events` | Half-open interval, identical rule to room/teacher availability |
| `events_upcoming` | Next 3–5 `status = "scheduled"` events with `start_ts > at`, ascending | `events` | Simple ordered slice; count is a fixed, documented constant (proposed: 5) — **TBD: exact count is a UI decision**, this contract treats it as a fixed backend default rather than a query param, to keep the payload predictable |
| `rooms_available_count` / `rooms_total_count` | Count of rooms with no overlapping confirmed, non-cancelled-event booking at `at`, over total rooms | `rooms`, `room_bookings`, `events.status` | Identical logic to `free_rooms_at(T)` in `data-contracts.md`, just returned as a count instead of a list |
| `registrations_today` | Count of `event_attendance` rows with `registered_at` on the current campus-local calendar date | `event_attendance` | Raw `COUNT(*)`, duplicates included, consistent with `attendance_count`'s existing semantics — **not** a distinct-registrant count |
| `next_major_event` | The single soonest `status = "scheduled"` event with `start_ts > at` | `events` | First element of `events_upcoming`, included as a convenience field so the frontend doesn't have to index into the array |

**Errors:** Query failure → HTTP 502, `{ "error": "..." }`. This endpoint composes several
reads; if any underlying query fails, the whole response fails (502) rather than
returning a partially-populated payload — consistent with `code-standards.md`'s rule that
an unavailable data source must never be silently presented as an empty/valid result.

**Data Source:** `events`, `rooms`, `room_bookings`, `event_attendance` — all existing.
**No new table, no new SQL function beyond what `free_rooms_at`/`room_is_free` already
express**, though the backend's direct-SQL implementation (not Genie) computes the count
form of this itself in `db.py`, reusing the same centralized overlap formula per
`code-standards.md`'s Data Access Standards (never re-derived a second time).

**Notes:**
- This can alternatively be implemented as the frontend composing `GET /api/events` +
  `GET /api/rooms/availability` client-side instead of one composite endpoint — that was
  flagged as an open implementation choice in `v2-product-plan.md` Section 6.5. This
  document recommends the single composite endpoint (fewer round trips, one consistent
  "now" instant across all fields) but either is compatible with the underlying data
  model; if the composed-client-side approach is chosen instead, this section's response
  shape becomes non-authoritative and `GET /api/campus/pulse` is not built.
- Every field here is a direct aggregate over existing governed fields. No predictive or
  trend metric appears in Campus Pulse — those belong to Analytics (Section 5) if at all,
  per the product plan's own boundary between the two.

---

## 5. Analytics (Council Control Center)

All Analytics endpoints are **council-only**. A `student` session calling any of these
receives `403 { "error": "forbidden" }` without any query being constructed, per the
existing role-check-before-query pattern in `code-standards.md`.

**Shared query parameters across all Analytics endpoints:**

| Param | Type | Meaning | Default |
|---|---|---|---|
| `from` | ISO date | Start of the analysis window (inclusive) | Omitted = all-time |
| `to` | ISO date | End of the analysis window (exclusive) | Omitted = all-time |

**TBD / requires implementation decision:** whether a rolling preset (`range=week` /
`range=month`) is offered instead of, or in addition to, raw `from`/`to`. This document
standardizes on `from`/`to` for consistency with Section 3's event filters and defers the
preset-shortcut question to `v2-ui-spec.md`, since it's a presentation convenience the
frontend could compute into `from`/`to` itself without a new backend parameter.

### 5.1 `GET /api/analytics/overview` — **NEW**

**Purpose:** Council Control Center landing metrics.

**Authorization:** `council` only.

**Response:**
```json
{
  "range": { "from": null, "to": null },
  "total_events": 12,
  "upcoming_events": 4,
  "total_registrations": 47,
  "average_attendance_per_event": 3.9,
  "active_clubs": 5,
  "rooms_booked_now": 4,
  "rooms_total": 9
}
```

| Field | Aggregation | Source |
|---|---|---|
| `total_events` | `COUNT(events)` in range, excluding `cancelled` unless the range is explicitly historical | `events` |
| `upcoming_events` | `COUNT(events)` where `status = "scheduled"` and `start_ts > now` | `events` |
| `total_registrations` | `COUNT(event_attendance)` in range | `event_attendance` — raw count, duplicates included, matching `attendance_count`'s existing semantics |
| `average_attendance_per_event` | `total_registrations / total_events` (0 if `total_events = 0`) | Derived from the two above |
| `active_clubs` | `COUNT(clubs)` where `active = true` | `clubs` |
| `rooms_booked_now` / `rooms_total` | Same computation as Campus Pulse's room counts | `rooms`, `room_bookings`, `events.status` |

**Errors:** 403 (role), 502 (query failure).

**Data Source:** `events`, `event_attendance`, `clubs`, `rooms`, `room_bookings` —
existing tables only.

### 5.2 `GET /api/analytics/events` — **NEW**

**Purpose:** Event-level analytics — popular events, attendance distribution.

**Authorization:** `council` only.

**Query Parameters:** `from`, `to` (shared, above); `limit` (integer, default 10, caps
the `popular_events` list).

**Response:**
```json
{
  "range": { "from": null, "to": null },
  "popular_events": [
    { "event_id": "evt_001", "name": "AI Workshop", "attendance_count": 42 }
  ],
  "low_attendance_events": [
    { "event_id": "evt_009", "name": "Civil Eng. Info Session", "attendance_count": 1 }
  ],
  "zero_attendance_events": [
    { "event_id": "evt_011", "name": "Photography Walk", "attendance_count": 0 }
  ]
}
```

| Field | Aggregation | Source | Notes |
|---|---|---|---|
| `popular_events` | `events` ranked by `attendance_count` descending, capped at `limit` | `events`, `event_attendance` | `attendance_count` is the existing derived metric, computed identically to every other consumer of it |
| `low_attendance_events` | Bottom events by `attendance_count`, `attendance_count > 0` | Same | Threshold ("low") is presentation, not a stored value |
| `zero_attendance_events` | Events with `attendance_count = 0` | Same | Directly demonstrates the seed requirement that at least 2 events have zero attendance rows, per `data-contracts.md` |

**Errors:** 403, 502.

**Data Source:** `events`, `event_attendance`. No `distinct_attendee_count` is used
anywhere in this endpoint unless explicitly requested with a future `?metric=distinct`
param — **not defined in V2**, flagged only so a future agent doesn't silently swap the
semantics.

### 5.3 `GET /api/analytics/rooms` — **NEW**

**Purpose:** Room utilization and booking pattern analytics.

**Authorization:** `council` only.

**Query Parameters:** `from`, `to` (shared, above).

**Response:**
```json
{
  "range": { "from": null, "to": null },
  "room_utilization": [
    { "room_id": "room_005", "name": "Lab 204", "type": "lab", "confirmed_bookings": 6, "total_booked_hours": 12.0 }
  ],
  "peak_booking_periods": [
    { "hour_of_day": 15, "booking_count": 8 }
  ]
}
```

| Field | Aggregation | Source | Notes |
|---|---|---|---|
| `room_utilization` | Per room: `COUNT(room_bookings)` where `status = "confirmed"`, and sum of `(end_ts - start_ts)` in hours | `rooms`, `room_bookings` | Cancelled bookings excluded — matches the existing rule that only `confirmed` bookings count toward occupancy |
| `peak_booking_periods` | `room_bookings.start_ts` bucketed by hour-of-day, `COUNT(*)` per bucket, in range | `room_bookings` | A simple time-bucketed aggregate, not a forecast — no predictive modeling |

**Errors:** 403, 502.

**Data Source:** `rooms`, `room_bookings`. Same half-open-interval convention as every
other room-time computation; the overlap formula itself is not needed here (this is
summation, not conflict-checking), but the `confirmed`-only filter is preserved exactly.

### 5.4 `GET /api/analytics/clubs` — **NEW**

**Purpose:** Club activity analytics.

**Authorization:** `council` only.

**Query Parameters:** `from`, `to` (shared, above).

**Response:**
```json
{
  "range": { "from": null, "to": null },
  "club_activity": [
    { "club_id": "club_001", "name": "AI Club", "active": true, "event_count": 3, "total_registrations": 58 }
  ]
}
```

| Field | Aggregation | Source |
|---|---|---|
| `event_count` | `COUNT(events)` per `club_id`, in range | `events` — this is exactly the existing "how many events has this club run" Genie benchmark, expressed as a direct-read endpoint instead of an NL query |
| `total_registrations` | Sum of `attendance_count` across that club's events, in range | `events`, `event_attendance` |

**Errors:** 403, 502.

**Data Source:** `clubs`, `events`, `event_attendance`.

**Notes for all of Section 5:** Every metric above is a direct aggregate over existing
fields with no new table, no new derived semantic, and no change to what "attendance,"
"registration," or "active" mean per `data-contracts.md`. None of these introduce
predictive/forecast values, consistent with `v2-product-plan.md` Section 6.8's explicit
"not predictive analytics" boundary. Whether these are additionally exposed as
Genie-askable questions (so council could ask Genie the same thing) is a Data
Platform/Genie Space configuration decision, not an API contract — this document defines
the direct-read path only.

---

## 6. Activity / Audit

### 6.1 `GET /api/activity` — **NEW, derived from existing data (no new table)**

**Purpose:** A lightweight feed of recent governed writes, per `v2-product-plan.md`
Section 6.9's explicit preference to derive this from existing fields rather than
introduce a new table.

**Authorization:** `council` only.

**Query Parameters:** `limit` (integer, default 20, max 50).

**Response:**
```json
{
  "activity": [
    { "type": "event_created", "at": "2026-09-01T09:00:00", "event_id": "evt_002", "name": "AI Workshop" },
    { "type": "room_booked", "at": "2026-09-01T09:05:00", "booking_id": "bk_0001", "room": "Auditorium", "event_id": "evt_001", "event_name": "AI Workshop" }
  ]
}
```

**Errors:** 403, 502.

**Data Source:** `events.created_at` and `room_bookings.created_at`, merged and sorted
descending, capped at `limit`. **No new table.**

**Explicitly out of scope for this endpoint, and marked `NEW DATA DEPENDENCY` if wanted:**

- **Cancellation events** (e.g. "event X was cancelled at time Y") cannot be included
  reliably. `data-contracts.md`'s `events`/`room_bookings` entities record `status` but no
  `status_changed_at`/`cancelled_at` timestamp — so a cancellation has no reliable time to
  place it in a chronological feed. Adding this requires a new field on `events` and
  `room_bookings` (e.g. `status_changed_at`), which is a breaking-change-style schema
  addition per `data-contracts.md`'s own Data Contract Change Rules, and is explicitly
  **not** made here. **Flagged as `NEW DATA DEPENDENCY`**: conceptually, one nullable
  timestamp field per status-bearing entity.
- **Per-user/per-session attribution** ("booked by X") cannot be included. There is no
  per-user identity in the current session model (Section 2's `display_name` is an
  unverified UX convenience, never written to any table, and is not captured on the write
  endpoints at all). Activity items can say a write happened, and by construction (role
  enforcement) that it was done by a `council` session — nothing more specific.
- If a fuller audit trail (field-level diffs, user attribution, cancellation history) is
  wanted later, that requires a genuinely new `activity_log`-shaped entity. **This document
  does not define that schema** — per the task's instruction, a new table is flagged, not
  invented. That decision belongs in a `data-contracts.md` amendment.

---

## 7. Genie Integration

### 7.1 `POST /api/genie/ask` — **Unchanged**

The existing contract from `architecture.md` is authoritative and untouched:

```
User → Frontend → POST /api/genie/ask → Backend → Genie Conversation API → Backend → Frontend
```

Request/response shape, the `ok`/`no_answer`/`error` status taxonomy, and the rule that
"the backend never rewrites, augments, or 'fixes' the question text or Genie's answer
text" (`code-standards.md`, Genie Integration Standards) all remain exactly as documented.
**No new field is added to this response envelope by V2.**

### 7.2 Genie → Action: how the frontend renders actions from an existing response

This is a **frontend-only mechanism** layered on top of the unchanged contract above — it
does not require, and must not introduce, a new backend/Genie contract field. This mirrors
`v2-product-plan.md` Section 6.6's own framing: action-mapping is "a frontend pattern-
matching concern against the existing `rows` contract."

```
Genie answer (unchanged: status, answer, sql, rows)
        ↓
Frontend inspects `rows`' column names against known shape patterns
        ↓
Recognized shape → render an action control (View Event / Register / Book Room)
        ↓
Action executes via an EXISTING endpoint — never a new Genie-triggered write
```

**Recognized shapes (frontend heuristic, not a backend guarantee):**

| Row shape signal | Inferred meaning | Action rendered | Who sees it |
|---|---|---|---|
| Row contains an `event_id`-like column plus `name`/`start_ts`-like columns | Event rows | **View Event** → navigates to `GET /api/events/{event_id}` detail page (3.2) | Everyone |
| Row contains a `room_id`-like column plus `name`/`type`-like columns, in the context of an availability question | Free-room rows | **Book Room** → opens the existing Admin Panel booking form, **pre-filled** with `room_id` and the queried time window, per `v2-product-plan.md`'s description ("pre-filled with the room/time from the Genie answer") | `council` only |

**Explicit safety boundary — this is a pre-fill/navigation, not a blind write:**

- **Book Room never fires `POST /api/bookings` directly from the Genie panel.** Booking
  requires `event_id` (per `data-contracts.md`'s Book a Room write contract), which a
  "which rooms are free" answer does not contain. The action opens the existing booking
  form with `room_id`/`start_ts`/`end_ts` pre-filled; the council user still selects the
  event and explicitly submits, going through the existing `POST /api/bookings` contract,
  existing conflict check, and existing server-side role re-verification, unchanged.
- **Register** links to the existing external Google Form (per 3.2's Notes on
  registration) with the event identity appended, exactly as the Newsletter Home's
  existing registration link already works — not a new write path.
- Genie itself never gains a write capability under any framing. This restates
  `v2-product-plan.md` Section 6.6 and `architecture.md` Invariant 2 because this is the
  single feature most likely to be misread as loosening that boundary. It does not.

**Known limitation, stated plainly rather than hidden:** because Genie generates its own
SQL and column aliases per question, the heuristic column-name matching above is
best-effort and may fail to recognize an actionable shape (e.g. if Genie aliases a column
unexpectedly). When no shape is recognized, the answer renders exactly as it does today —
text + evidence disclosure, no action controls. This is a safe failure mode: absence of an
action is never treated as an error.

**Recommended reliability improvement (Data Platform's responsibility, not this
document's):** Data Platform can increase match reliability by ensuring the benchmark
question set's underlying SQL (via Genie Space instructions/trusted functions, per
`genie.md`) consistently selects and aliases `event_id`/`room_id` columns for the
event- and room-availability question families. This is a Genie Space configuration
change, not an API contract change — it does not alter `POST /api/genie/ask`'s response
envelope.

**Non-goal:** This document does not define an LLM agent-orchestration layer, a
tool-calling framework, or any mechanism by which Genie "decides" to trigger an action.
The decision to render an action lives entirely in the frontend, over data Genie already
returns today.

---

## 8. Write Operations

### 8.1 `POST /api/events` — Unchanged

Existing contract, unchanged. `council` only; role re-verified server-side; documented in
full in `architecture.md`.

### 8.2 `PATCH /api/events/{event_id}` — **NEW, narrow scope, Should Ship / contingent**

**Purpose:** Support the one event "edit" operation `data-contracts.md` already defines
semantics for — the `scheduled → cancelled` status transition — which currently has no
API trigger. `data-contracts.md` states this transition is valid but "no UI to perform
this transition is required for the MVP." V2's Control Center wants to expose it.

**Authorization:** `council` only.

**Path Parameter:** `event_id`.

**Request Body:**
```json
{ "status": "cancelled" }
```

**Response:** HTTP 200.
```json
{ "event_id": "evt_001", "status": "cancelled" }
```

**Validation:** Only `scheduled → cancelled` is accepted (matches the sole valid
transition in `data-contracts.md`'s Business Rules — Status transitions). Any other
requested status, or a request against an already-`cancelled` event, is rejected.

**Errors:**
- No/invalid role → 403 `{ "error": "forbidden" }`.
- Unknown `event_id` → 404 `{ "error": "event_not_found" }`.
- Invalid transition (e.g. `cancelled → scheduled`, or any status not in the closed enum)
  → 422 `{ "error": "invalid_status_transition" }`.
- Query failure → 502.

**Data Mutation:** Sets `events.status = "cancelled"`. Per `data-contracts.md`'s Business
Rules, this must also cascade: the event's confirmed `room_booking` (if any) is set to
`status = "cancelled"` in the same operation, since "a cancelled event's room is treated
as free by every availability check ... the two cancellations happen together." This
endpoint is responsible for performing both updates atomically, not just the `events` row.

**Data Source:** `events`, `room_bookings` — existing tables, existing status enum,
**no schema change**.

**Notes — what this endpoint deliberately does NOT do:** It does not support editing
`name`, `start_ts`, `end_ts`, `room_id`, `topic`, or `description`. Broader field-level
event editing is **not defined here** and is marked:

> **NEW DATA DEPENDENCY / requires `data-contracts.md` amendment:** full event editing
> (renaming, rescheduling, reassigning a room after creation) has no defined write
> contract in `data-contracts.md` today — only "create" is defined for `events`. Adding it
> would need new validation rules (e.g. what happens to an existing confirmed booking if
> `start_ts` changes) that `data-contracts.md`'s Write Contracts section does not currently
> answer. This is exactly the ambiguity `v2-product-plan.md` Section 6.3 flags as
> "contingent on a follow-up decision" — this document does not resolve it, per the
> instruction not to guess where the existing context is insufficient.

If full editing is not ready in time, `v2-product-plan.md`'s own Cut First list already
accounts for this: "fall back to create-only, exactly as the MVP already works."

### 8.3 `POST /api/bookings` — Unchanged

Existing contract, unchanged. `council` only; existing conflict check (409); existing
role re-verification. Documented in full in `architecture.md`.

### 8.4 `GET /api/rooms/availability` — Unchanged, reused as pre-check

Existing contract, unchanged. Used by both the standalone booking form and the Genie →
Book Room pre-fill flow (Section 7.2) as the same "informing but not gating" pre-check
`ui-registry.md`'s Room Availability Snapshot composite pattern already documents. The
server remains the sole source of truth for conflicts at submit time.

### 8.5 Write operation authorization summary

Every write endpoint in this section (`POST /api/events`, `PATCH /api/events/{event_id}`,
`POST /api/bookings`) independently re-verifies the signed session cookie's `role` claim
server-side, before any query is constructed, exactly per the existing pattern in
`architecture.md`'s Authentication and Authorization section and `code-standards.md`'s
Authentication and Authorization section. No exception is introduced for any V2 endpoint.

---

## 9. Error Handling

**Standard error envelope**, consistent across every V2 endpoint (V1 endpoints keep their
already-documented per-endpoint shapes, e.g. `{ "status": "error", "message": "..." }` for
Genie — this is not retroactively changed):

```json
{ "error": "<short_machine_code>", "message": "<optional human-readable detail>" }
```

| HTTP Status | Meaning | Used by |
|---|---|---|
| 401 | Missing/incorrect `INGEST_TOKEN` | Ingestion webhook only (unchanged from V1) |
| 403 | Valid session, but role forbids this operation | Every `council`-only endpoint (Analytics, Activity, `POST /api/events`, `PATCH /api/events/{id}`, `POST /api/bookings`) |
| 404 | Referenced entity does not exist | `GET /api/events/{event_id}`, `PATCH /api/events/{event_id}`, `GET /api/teachers/availability` (unchanged) |
| 409 | Write would violate a documented invariant | `POST /api/bookings` (unchanged conflict contract) |
| 422 | Request body/query fails validation (bad enum value, bad invalid status transition, malformed timestamp) | Any endpoint with Pydantic-validated input; FastAPI's default shape is used, per `code-standards.md`'s existing "malformed request never reaches `db.py`" rule |
| 502 | Databricks/SQL warehouse or Genie upstream failure | Any read/write endpoint whose query fails |
| 5xx (unhandled) | Unexpected server error | Caught by `main.py`'s top-level exception handler; never a raw traceback |

**Never included in any error response:** Databricks credentials, raw SQL, stack traces,
internal exception text, or endpoint paths — restating `code-standards.md`'s Error
Handling table, which V2 does not relax anywhere.

---

## 10. Loading / Empty / Failure Expectations by API Family

| API family | Data exists | Data is empty | Request fails | Unauthorized |
|---|---|---|---|---|
| Events / Calendar (§3) | `events: [...]` | `events: []` — valid, e.g. "no events this week" | 502, `events: []` + `error` | N/A (no auth required) |
| Event Detail (§3.2) | Full object | N/A (404 instead — a specific ID either exists or doesn't) | 502 | N/A |
| Campus Pulse (§4) | Full object, arrays may be empty (e.g. `events_now: []` is valid — "nothing happening right now") | Same as above | 502, no partial payload | N/A |
| Analytics (§5) | Full object, aggregates may be `0` | `0`/empty arrays are valid answers, not errors | 502 | 403 before any query runs |
| Activity (§6) | `activity: [...]` | `activity: []` — valid, "no recent activity" | 502 | 403 before any query runs |
| Genie (§7) | `status: "ok"` | N/A — Genie either answers or returns `no_answer` | `status: "error"` / 502 | N/A (read-only, any session) |
| Writes (§8) | 201 + created record | N/A | 502 | 403 before any query runs |

**Standing rule, unchanged from V1:** an empty result from a successful query is never
rendered or returned as an error, and a failed request is never returned as an empty
success — this is the same `empty` vs. `error` vs. `no_answer` distinction
`ui-tokens.md`/`ui-rules.md` already enforce on the frontend, and it is preserved at the
API layer for every new endpoint in this document.

---

## 11. API Ownership

| API area | Backend owner | Data source | Student | Council |
|---|---|---|---|---|
| Session (§2) | FastAPI, `auth.py` | Signed cookie only | Yes (read/establish) | Yes (read/establish) |
| Events / Calendar (§3) | FastAPI, `db.py` | `events`, `clubs`, `room_bookings`, `event_attendance` | Read | Read |
| Event Detail (§3.2) | FastAPI, `db.py` | `events`, `clubs`, `rooms`, `room_bookings`, `event_attendance` | Read | Read |
| Campus Pulse (§4) | FastAPI, `db.py` | `events`, `rooms`, `room_bookings`, `event_attendance` | Read | Read |
| Genie (§7) | FastAPI → `genie_client.py` → Genie | Genie Space (7 tables* + `internships`, see §16) | Read | Read |
| Genie → Action (§7.2) | Frontend logic + existing write endpoints | N/A (no new backend surface) | View/Register only | View/Register/Book |
| Bookings (§8.3–8.4) | FastAPI, `db.py` | `room_bookings`, `rooms` | Read (`GET` availability) | Read + Write |
| Events write (§8.1–8.2) | FastAPI, `db.py` | `events`, `room_bookings` | No | Write |
| Analytics (§5) | FastAPI, `db.py` | `events`, `event_attendance`, `clubs`, `rooms`, `room_bookings` | No | Read |
| Activity (§6) | FastAPI, `db.py` | `events.created_at`, `room_bookings.created_at` | No | Read |

\* See Section 16 for the internships/Genie scope correction.

---

## 12. Frontend / Backend Dependency Map

```
Role-Aware Entry
 └── Session API (§2: GET/POST /api/session, POST /api/session/end)

Student Home (Campus Pulse + Grid/Calendar toggle)
 ├── Campus Pulse API (§4)
 ├── Events API (§3.1)
 └── Room Availability API (existing, §1)

Events Grid
 └── Events API (§3.1)

Calendar
 └── Events API (§3.1, with from/to)

Event Detail
 └── Event Detail API (§3.2)

Ask Genie
 └── Genie API (§7.1, unchanged)

Genie → Action
 ├── Genie API (§7.1)
 ├── Event Detail API (§3.2)                — for "View Event"
 ├── existing Booking form + POST /api/bookings (§8.3) — for "Book Room" (pre-fill only)
 └── existing external Google Form link      — for "Register"

Council Control Center — Overview
 ├── Analytics Overview API (§5.1)
 ├── Events API (§3.1)
 └── Room Availability API (existing, §1)

Council Control Center — Events
 ├── Events API (§3.1)
 ├── Event Detail API (§3.2)
 ├── POST /api/events (existing, §8.1)
 └── PATCH /api/events/{id} (§8.2, cancel only)

Council Control Center — Rooms
 ├── Room Availability API (existing, §1)
 └── POST /api/bookings (existing, §8.3)

Council Control Center — Analytics
 ├── Analytics Overview API (§5.1)
 ├── Analytics Events API (§5.2)
 ├── Analytics Rooms API (§5.3)
 └── Analytics Clubs API (§5.4)

Council Control Center — Activity
 └── Activity API (§6.1)
```

---

## 13. Compatibility With Existing Architecture

### Existing APIs that remain unchanged
- `POST /api/genie/ask`
- `GET /api/teachers/availability`
- `GET /api/rooms/availability`
- `POST /api/bookings`
- `POST /api/events` (create)
- `POST /api/ingest/attendance`

### Existing APIs that need modification (additive only — no breaking change)
- `POST /api/session` — adds optional `display_name`/`display_email` in, echoed out.
  Existing callers unaffected.
- `GET /api/events` — adds optional query params (`from`, `to`, `club_id`, `status`, `q`)
  and additive response fields (`topic`, `end_ts`, `status`). Existing callers requesting
  only `upcoming` and reading only the original fields see no change.

### New APIs
- `GET /api/session`
- `POST /api/session/end` (optional)
- `GET /api/events/{event_id}`
- `GET /api/campus/pulse`
- `GET /api/analytics/overview`
- `GET /api/analytics/events`
- `GET /api/analytics/rooms`
- `GET /api/analytics/clubs`
- `GET /api/activity`
- `PATCH /api/events/{event_id}` (cancel-only scope)

### APIs that should NOT be created
- **`GET /api/calendar`** — would duplicate `GET /api/events`; Calendar reuses it with
  `from`/`to`, per Section 3.3.
- **A direct "Genie action" execution endpoint** (e.g. `POST /api/genie/action`) — would
  give Genie's output a privileged write path outside the existing, reviewed write
  endpoints. Actions always resolve to the existing `POST /api/bookings`, the existing
  external registration link, or a navigation to `GET /api/events/{event_id}` — never a
  new write surface.
- **A username/password or SSO endpoint** — explicitly out of scope per
  `v2-product-plan.md` Section 6.1 and Section 14; the existing access-code/cookie
  mechanism is extended, not replaced.
- **A new audit/activity write endpoint** — Section 6 derives Activity from existing
  `created_at` fields; no `POST /api/activity` is created, since nothing should write to
  an audit table that doesn't exist.
- **A dedicated `internships` REST endpoint** — not scoped by `v2-product-plan.md`; see
  Section 16. Not created here without a product decision to do so.

---

## 14. Security

- **Role checks occur server-side, on every protected route, before any query is
  constructed** — restated from `architecture.md`/`code-standards.md`, and holds for every
  new V2 endpoint (`PATCH /api/events/{id}`, all of Analytics, Activity) exactly as it
  already holds for `POST /api/bookings`/`POST /api/events`.
- **Council-only operations cannot be invoked by students**, regardless of entry point —
  including via the Genie → Action UI, which only ever calls the same
  server-role-verified write endpoints a direct Admin Panel submission would.
- **Request validation happens server-side** via Pydantic models for every new endpoint's
  body/query params, per `code-standards.md`'s existing Validation table — client-side
  checks (if any exist in the UI) remain a UX convenience only.
- **No client-supplied field can bypass authorization.** `display_name`/`display_email`
  (Section 2.1) are explicitly documented as non-authoritative and must never be read by
  any write handler as a permission signal — only the signed cookie's `role` claim is
  trusted, unchanged from V1.
- **Session handling is unchanged**: HTTP-only, signed cookie; a missing, expired, or
  tampered cookie is treated as `student`, never as an error to retry and never defaulted
  to `council`. `GET /api/session` and `POST /api/session/end` (Section 2) only read/clear
  this same cookie — they introduce no second session mechanism.
- **Frontend visibility is not authorization.** Hiding the Book Room action from a
  `student` session in the Genie → Action UI (Section 7.2) is a UX convenience; the
  underlying `POST /api/bookings` call it would trigger is independently role-checked
  server-side regardless.
- **Sensitive backend credentials remain server-side.** No new environment variable is
  introduced by this document; every endpoint above uses the existing
  `SQL_WAREHOUSE_ID`/`GENIE_SPACE_ID`/`UNITY_CATALOG_SCHEMA`/`SESSION_SIGNING_SECRET`
  configuration already defined in `architecture.md`'s Environment Configuration table.

---

## 15. Data Dependencies

| API | Existing table/entity | Existing SQL function | Existing Genie capability | Existing ingestion pipeline | New dependency |
|---|---|---|---|---|---|
| Session (§2) | None (cookie only) | — | — | — | None |
| Events / Calendar (§3.1, 3.3) | `events`, `clubs`, `room_bookings`, `event_attendance` | — | — | — | None |
| Event Detail (§3.2) | `events`, `clubs`, `rooms`, `room_bookings`, `event_attendance` | — | — | — | None (registration URL convention flagged TBD, not a data dependency) |
| Campus Pulse (§4) | `events`, `rooms`, `room_bookings`, `event_attendance` | Reuses `free_rooms_at`-equivalent overlap logic | — | — | None |
| Analytics (§5) | `events`, `event_attendance`, `clubs`, `rooms`, `room_bookings` | Reuses existing overlap logic (rooms) | Optionally exposable as Genie questions (Data Platform decision, out of this document's scope) | — | None |
| Activity (§6) | `events.created_at`, `room_bookings.created_at` | — | — | — | **Flagged**: cancellation timestamps and per-user attribution require new fields/table, not built here |
| Genie (§7) | 7 original tables **plus `internships`** (see below) | `room_is_free` | Existing Conversation API | — | None for the contract itself; `genie.md`'s stated table count needs correction, see below |
| Writes (§8) | `events`, `room_bookings` | Existing overlap/conflict check | — | — | None for booking/create; event-editing beyond cancel is flagged `NEW DATA DEPENDENCY` in §9.2 |

### Internships — data model correction, not a new V2 feature

`data-contracts.md` already defines `internships` as a full entity (fields, identity,
example record) and, per the product owner, it is **already implemented in the MVP**. This
means:

- `genie.md`'s Data Surface table ("exactly the seven tables") and `architecture.md`'s
  repeated "seven tables"/"7 tables" language currently **understate the live schema by
  one table**. This document does not silently perpetuate that count — Section 11's
  ownership table marks it explicitly.
- `v2-product-plan.md` Section 17's claim that no `internships` entity/endpoint exists
  anywhere is **incorrect** as a description of current reality, per the product owner's
  clarification, and should be corrected at the source (`v2-product-plan.md` itself) in a
  future edit — not silently overridden here.
- **This document does not define new REST endpoints for internships** (e.g. no
  `GET /api/internships`), because `v2-product-plan.md` does not scope any internships-
  facing UI surface in V2 — there is nothing for such an endpoint to serve yet. Genie can
  already answer internship questions today, since the data is governed and seeded,
  independent of whether any REST endpoint or frontend surface exists for it.
- **Marked for follow-up, not resolved here:** whether V2 (or a later plan) adds a direct
  internships browse/detail surface, and correspondingly a `GET /api/internships` /
  `GET /api/internships/{id}` pair analogous to Section 3, is a product-scope decision for
  `v2-product-plan.md`, not something this API-contracts document invents on its own
  initiative.

---

## 16. Non-Goals

This document does **not** define:

- Frontend component design, layout, or visual styling — see `ui-tokens.md`,
  `ui-registry.md`, `ui-rules.md`, and the still-outstanding `v2-ui-spec.md`.
- Database schema redesign — every V2 endpoint above maps to `data-contracts.md`'s
  existing entities; anything requiring a schema change is explicitly flagged as `NEW DATA
  DEPENDENCY` (Sections 6, 8.2, 15) and deferred to a `data-contracts.md` amendment, per
  that file's own Data Contract Change Rules.
- Genie internals — Genie Space instructions, synonyms, and trusted functions remain
  entirely owned by `genie.md` and the Data Platform workstream; this document only
  documents the unchanged `POST /api/genie/ask` envelope and how the frontend consumes it.
- Full authentication/SSO implementation — Section 2 extends the existing access-code/
  cookie mechanism; Campus SSO is future direction only, per `v2-product-plan.md`
  Section 14.
- Multi-campus architecture — out of scope, per `v2-product-plan.md` Sections 6.10 and 14.
- Mobile-specific APIs — no mobile app exists or is planned; the existing REST contract is
  consumed by the same responsive web frontend at every breakpoint.
- Notification infrastructure — explicitly excluded per `project-overview.md`'s Features
  Out of Scope and not reopened by `v2-product-plan.md`.

These belong in other context documents (`v2-ui-spec.md`, a future `data-contracts.md`
amendment, or later product planning) — not in this file.
