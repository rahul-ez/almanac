"""All SQL execution for Campus Companion lives here — no other backend module
may import `databricks.sql` or build a SQL string. See
context/architecture.md's Client/Server Patterns and context/code-standards.md's
Data Access Standards.

Every query against `rooms`/`room_bookings`/`teacher_timetable` uses the exact
half-open-interval formula centralized in `_instant_occupied()` /
`_ranges_overlap()` below, matching context/data-contracts.md's Time, Date, and
Status Semantics and mirroring the `room_is_free` trusted SQL function Data
Platform registered with Genie (context/data-platform/notebooks/
03_trusted_functions.sql) — so Genie and this backend can never disagree about
"is this room free."
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Iterator

from databricks import sql as dbsql

from app.cache import cache
from app.config import settings

logger = logging.getLogger("campus_companion.db")

SCHEMA = settings.unity_catalog_schema  # e.g. "campus_companion.campus"


# =============================================================================
# Typed errors — routers catch these and map them to the documented HTTP shapes
# (see context/code-standards.md's Error Handling table).
# =============================================================================
class NotFoundError(Exception):
    """A referenced entity (room/event/club/teacher) does not exist."""

    def __init__(self, kind: str):
        self.kind = kind  # e.g. "room_not_found", "event_not_found"
        super().__init__(kind)


class InvalidStatusTransitionError(Exception):
    """A requested status change is not one of data-contracts.md's allowed
    transitions (only `scheduled → cancelled` for events)."""


class BookingConflictError(Exception):
    """A new/updated booking would overlap an existing confirmed booking."""

    def __init__(self, conflicting_booking: dict[str, Any]):
        self.conflicting_booking = conflicting_booking
        super().__init__("booking_conflict")


class WarehouseError(Exception):
    """The SQL warehouse call itself failed (connection, timeout, bad SQL)."""


# =============================================================================
# Centralized half-open-interval formula — the single source of truth.
# Kept as plain, dependency-free Python so it is directly unit-testable
# (see backend/tests/test_overlap_logic.py) without a live warehouse. The SQL
# WHERE clauses in this file must stay logically identical to these two
# predicates; do not re-derive the overlap logic anywhere else.
# =============================================================================
def _instant_occupied(start_ts: datetime, end_ts: datetime, at: datetime) -> bool:
    """True if the half-open interval [start_ts, end_ts) contains `at`.
    The end instant itself is never occupied — see data-contracts.md's Time,
    Date, and Status Semantics."""
    return start_ts <= at < end_ts


def _ranges_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    """True if [a_start, a_end) and [b_start, b_end) overlap:
    a_start < b_end AND b_start < a_end. Touching intervals (one ends exactly
    where the other starts) do NOT overlap."""
    return a_start < b_end and b_start < a_end


# SQL mirrors of the two predicates above, used inside WHERE clauses. Callers
# must bind params named exactly `at` (instant check) or `start_ts`/`end_ts`
# (the candidate range, for the overlap check) to match these fragments.
_SQL_INSTANT_OCCUPIED = "b.start_ts <= :at AND :at < b.end_ts"
_SQL_RANGES_OVERLAP = "b.start_ts < :end_ts AND :start_ts < b.end_ts"
_ONE_HOUR = timedelta(hours=1)


# =============================================================================
# Connection pooling
# =============================================================================
import queue
import threading

_POOL_MAX_SIZE = 5
_conn_pool: queue.Queue[Any] = queue.Queue(maxsize=_POOL_MAX_SIZE)
_pool_lock = threading.Lock()


def _create_raw_connection() -> Any:
    hostname = (settings.databricks_host or "").replace("https://", "").replace("http://", "").split("/")[0]
    return dbsql.connect(
        server_hostname=hostname,
        http_path=f"/sql/1.0/warehouses/{settings.sql_warehouse_id}",
        access_token=settings.databricks_token,
    )


@contextmanager
def _connection() -> Iterator[Any]:
    conn = None
    try:
        conn = _conn_pool.get_nowait()
    except queue.Empty:
        pass

    if conn is None:
        try:
            conn = _create_raw_connection()
        except Exception as exc:
            logger.error("Failed to open SQL warehouse connection: %s", exc)
            raise WarehouseError(str(exc)) from exc

    is_broken = False
    try:
        yield conn
    except (WarehouseError, Exception) as exc:
        # Check if error is a connection failure vs query error
        is_broken = isinstance(exc, (dbsql.Error, WarehouseError))
        if is_broken:
            try:
                conn.close()
            except Exception:
                pass
        raise
    finally:
        if not is_broken and conn is not None:
            try:
                _conn_pool.put_nowait(conn)
            except queue.Full:
                try:
                    conn.close()
                except Exception:
                    pass


def _query(sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Run a SELECT and return rows as a list of dicts."""
    try:
        with _connection() as conn, conn.cursor() as cursor:
            cursor.execute(sql, params or {})
            columns = [c[0] for c in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    except WarehouseError:
        raise
    except Exception as exc:
        logger.error("Query failed: %s | sql=%s | params=%s", exc, sql, params)
        raise WarehouseError(str(exc)) from exc


def _execute(sql: str, params: dict[str, Any] | None = None) -> None:
    """Run an INSERT/UPDATE with no result rows expected."""
    try:
        with _connection() as conn, conn.cursor() as cursor:
            cursor.execute(sql, params or {})
    except WarehouseError:
        raise
    except Exception as exc:
        logger.error("Statement failed: %s | sql=%s | params=%s", exc, sql, params)
        raise WarehouseError(str(exc)) from exc


def _next_id(table: str, id_column: str, prefix: str, width: int) -> str:
    """Generate the next sequential ID (e.g. evt_004) by taking the current max
    numeric suffix + 1. Simplification appropriate for a single-writer hackathon
    demo (Delta/Unity Catalog has no native auto-increment) — see
    context/code-standards.md's Simplicity principle. Not safe under concurrent
    writers, which this product does not need to support."""
    rows = _query(
        f"SELECT MAX(CAST(SUBSTRING({id_column}, {len(prefix) + 1}) AS INT)) AS max_n "
        f"FROM {SCHEMA}.{table}"
    )
    current_max = rows[0]["max_n"] if rows and rows[0]["max_n"] is not None else 0
    return f"{prefix}{str(current_max + 1).zfill(width)}"


# =============================================================================
# Reads: rooms / availability
# =============================================================================
def get_free_rooms(room_type: str | None, at: datetime) -> list[dict[str, Any]]:
    """Rooms with no CONFIRMED booking (belonging to a non-cancelled event)
    occupying `at`. Mirrors room_is_free() exactly — see module docstring."""
    cache_key = f"free_rooms:{room_type}:{at.strftime('%Y%m%d%H%M') if at else 'now'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    sql = f"""
        SELECT r.room_id, r.name, r.type
        FROM {SCHEMA}.rooms r
        WHERE (:room_type IS NULL OR r.type = :room_type)
          AND NOT EXISTS (
            SELECT 1
            FROM {SCHEMA}.room_bookings b
            JOIN {SCHEMA}.events e ON e.event_id = b.event_id
            WHERE b.room_id = r.room_id
              AND b.status = 'confirmed'
              AND e.status != 'cancelled'
              AND {_SQL_INSTANT_OCCUPIED}
          )
        ORDER BY r.name
    """
    res = _query(sql, {"room_type": room_type, "at": at})
    cache.set(cache_key, res, ttl_seconds=15.0)
    return res


def room_exists(room_id: str) -> bool:
    rows = _query(f"SELECT 1 FROM {SCHEMA}.rooms WHERE room_id = :room_id", {"room_id": room_id})
    return len(rows) > 0


def resolve_room_id(identifier: str) -> str | None:
    """Resolves a room by room_id or case-insensitive name (e.g. 'room_005' or 'Lab 204')."""
    if not identifier:
        return None
    rows = _query(
        f"SELECT room_id FROM {SCHEMA}.rooms WHERE room_id = :id OR LOWER(name) = LOWER(:id)",
        {"id": identifier.strip()},
    )
    return rows[0]["room_id"] if rows else None


# =============================================================================
# Reads: teacher availability
# =============================================================================
def is_teacher_free(teacher_name: str, at: datetime) -> bool | None:
    """True/False, or None if the teacher has zero timetable rows at all
    (data-not-found — see data-contracts.md's Read Contracts: an unknown
    teacher must never be reported as "available")."""
    existence = _query(
        f"SELECT 1 FROM {SCHEMA}.teacher_timetable WHERE teacher_name = :name LIMIT 1",
        {"name": teacher_name},
    )
    if not existence:
        return None
    occupied = _query(
        f"""
        SELECT 1 FROM {SCHEMA}.teacher_timetable
        WHERE teacher_name = :name AND start_ts <= :at AND :at < end_ts
        LIMIT 1
        """,
        {"name": teacher_name, "at": at},
    )
    return len(occupied) == 0


# =============================================================================
# Reads: events
# =============================================================================
def get_events(
    upcoming: bool = True,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    club_id: str | None = None,
    status: str | None = None,
    q: str | None = None,
) -> list[dict[str, Any]]:
    """List events with a live attendance_count, per the `GET /api/events`
    contract shape (v2-api-contracts.md §3.1 — event_id, name, club, topic,
    start_ts, end_ts, room, status, attendance_count).

    Framing rules:
    - An explicit `status` filter always wins — it returns exactly that status,
      overriding the default cancelled-exclusion (matches data-contracts.md's
      "explicit historical query" vs. "default framing" distinction).
    - Otherwise `upcoming=true` (the default) restricts to `scheduled` events;
      and, only when no `from`/`to` range is given, to those not yet finished
      (`end_ts > now`) — so the Newsletter Home still shows in-progress events,
      while Calendar (which always passes `from`/`to`) gets the whole window.
    - `upcoming=false` with no `status` returns every event, for historical
      questions.

    `from`/`to` use the project's half-open convention: `from <= start_ts < to`.
    `q` is a simple case-insensitive substring match over name/description.
    An unknown `club_id` simply yields an empty list, never an error.
    """
    cache_key = f"events:{upcoming}:{date_from}:{date_to}:{club_id}:{status}:{q}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    clauses: list[str] = []
    params: dict[str, Any] = {}

    if status is not None:
        clauses.append("e.status = :status")
        params["status"] = status
    elif upcoming:
        clauses.append("e.status = 'scheduled'")
        if date_from is None and date_to is None:
            clauses.append("e.end_ts > current_timestamp()")

    if date_from is not None:
        clauses.append("e.start_ts >= :date_from")
        params["date_from"] = date_from
    if date_to is not None:
        clauses.append("e.start_ts < :date_to")
        params["date_to"] = date_to
    if club_id is not None:
        clauses.append("e.club_id = :club_id")
        params["club_id"] = club_id
    if q:
        clauses.append("(lower(e.name) LIKE :q OR lower(coalesce(e.description, '')) LIKE :q)")
        params["q"] = f"%{q.lower()}%"

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    sql = f"""
        SELECT
            e.event_id,
            e.name,
            c.name AS club,
            e.topic,
            e.start_ts,
            e.end_ts,
            r.name AS room,
            e.status,
            (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a
             WHERE a.event_id = e.event_id) AS attendance_count
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        {where}
        ORDER BY e.start_ts
    """
    res = _query(sql, params)
    cache.set(cache_key, res, ttl_seconds=20.0)
    return res


def get_event_detail(event_id: str) -> dict[str, Any] | None:
    """Full single-event record for `GET /api/events/{event_id}`
    (v2-api-contracts.md §3.2). Returns None if the event does not exist.
    `room`/`room_id` are null when the event has no confirmed booking, since
    `events.room_id` is kept in sync with the confirmed booking (or nulled)."""
    cache_key = f"event_detail:{event_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    rows = _query(
        f"""
        SELECT
            e.event_id,
            e.name,
            c.name AS club,
            e.club_id,
            e.topic,
            e.description,
            r.name AS room,
            e.room_id,
            e.start_ts,
            e.end_ts,
            e.status,
            (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a
             WHERE a.event_id = e.event_id) AS attendance_count,
            e.created_at
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        WHERE e.event_id = :event_id
        """,
        {"event_id": event_id},
    )
    res = rows[0] if rows else None
    if res is not None:
        cache.set(cache_key, res, ttl_seconds=20.0)
    return res


def cancel_event(event_id: str) -> dict[str, Any]:
    """Perform the `scheduled → cancelled` transition for `PATCH
    /api/events/{event_id}` (v2-api-contracts.md §8.2). Per data-contracts.md's
    Business Rules this cascades: the event's confirmed `room_booking` (if any)
    is cancelled in the same operation and `events.room_id` is nulled, so every
    availability check immediately treats the room as free.

    Raises NotFoundError if the event does not exist, or
    InvalidStatusTransitionError if it is not currently `scheduled`
    (`cancelled` is terminal). Databricks/Delta has no multi-statement
    transaction; the two updates commit independently, an accepted
    simplification for the single-demo-writer model (same as create_booking)."""
    rows = _query(
        f"SELECT status FROM {SCHEMA}.events WHERE event_id = :event_id",
        {"event_id": event_id},
    )
    if not rows:
        raise NotFoundError("event_not_found")
    if rows[0]["status"] != "scheduled":
        raise InvalidStatusTransitionError()

    _execute(
        f"UPDATE {SCHEMA}.events SET status = 'cancelled', room_id = NULL WHERE event_id = :event_id",
        {"event_id": event_id},
    )
    _execute(
        f"""UPDATE {SCHEMA}.room_bookings SET status = 'cancelled'
            WHERE event_id = :event_id AND status = 'confirmed'""",
        {"event_id": event_id},
    )
    cache.invalidate_all()
    return {"event_id": event_id, "status": "cancelled"}


def event_exists(event_id: str) -> bool:
    rows = _query(
        f"SELECT 1 FROM {SCHEMA}.events WHERE event_id = :event_id", {"event_id": event_id}
    )
    return len(rows) > 0


def resolve_event_id(identifier: str) -> str | None:
    """Resolves an event by event_id or case-insensitive name (e.g. 'evt_001' or 'AI Workshop')."""
    if not identifier:
        return None
    rows = _query(
        f"SELECT event_id FROM {SCHEMA}.events WHERE event_id = :id OR LOWER(name) = LOWER(:id)",
        {"id": identifier.strip()},
    )
    return rows[0]["event_id"] if rows else None


def get_club_by_name(name: str) -> dict[str, Any] | None:
    """Case-insensitive exact match, per data-contracts.md's clubs.name
    uniqueness invariant."""
    rows = _query(
        f"SELECT club_id, name, active FROM {SCHEMA}.clubs WHERE LOWER(name) = LOWER(:name)",
        {"name": name},
    )
    return rows[0] if rows else None


# =============================================================================
# Writes: booking a room
# =============================================================================
def _confirmed_conflict(
    room_id: str, start_ts: datetime, end_ts: datetime, exclude_event_id: str | None = None
) -> dict[str, Any] | None:
    """The first confirmed, non-cancelled-event booking that overlaps the
    given room/window, or None. A booking belonging to `exclude_event_id` is
    ignored (used when re-booking the same event, which supersedes its own
    prior booking rather than conflicting with itself)."""
    sql = f"""
        SELECT b.booking_id, b.room_id, b.event_id, b.start_ts, b.end_ts
        FROM {SCHEMA}.room_bookings b
        JOIN {SCHEMA}.events e ON e.event_id = b.event_id
        WHERE b.room_id = :room_id
          AND b.status = 'confirmed'
          AND e.status != 'cancelled'
          AND (:exclude_event_id IS NULL OR b.event_id != :exclude_event_id)
          AND {_SQL_RANGES_OVERLAP}
        LIMIT 1
    """
    rows = _query(
        sql,
        {
            "room_id": room_id,
            "start_ts": start_ts,
            "end_ts": end_ts,
            "exclude_event_id": exclude_event_id,
        },
    )
    return rows[0] if rows else None


def create_booking(
    room_id: str, event_id: str, start_ts: datetime, end_ts: datetime
) -> dict[str, Any]:
    """Per data-contracts.md's Write Contracts (Book a room): validates the
    room/event exist, rejects an overlapping confirmed booking with the
    conflicting booking's details, otherwise cancels the event's prior
    confirmed booking (if any) and inserts the new one, keeping
    events.room_id in sync.

    Databricks/Delta has no cross-statement transaction to wrap this in — each
    statement commits independently. This mirrors how the write is specified
    (supersede-then-insert) and is an accepted simplification for a
    single-demo-writer hackathon build, not a production concurrency
    guarantee."""
    resolved_room = resolve_room_id(room_id)
    if not resolved_room:
        raise NotFoundError("room_not_found")
    resolved_event = resolve_event_id(event_id)
    if not resolved_event:
        raise NotFoundError("event_not_found")

    room_id = resolved_room
    event_id = resolved_event

    conflict = _confirmed_conflict(room_id, start_ts, end_ts, exclude_event_id=event_id)
    if conflict is not None:
        raise BookingConflictError(conflict)

    _execute(
        f"""UPDATE {SCHEMA}.room_bookings SET status = 'cancelled'
            WHERE event_id = :event_id AND status = 'confirmed'""",
        {"event_id": event_id},
    )

    booking_id = _next_id("room_bookings", "booking_id", "bk_", 4)
    _execute(
        f"""INSERT INTO {SCHEMA}.room_bookings
            (booking_id, room_id, event_id, start_ts, end_ts, status, created_at)
            VALUES (:booking_id, :room_id, :event_id, :start_ts, :end_ts, 'confirmed', current_timestamp())""",
        {
            "booking_id": booking_id,
            "room_id": room_id,
            "event_id": event_id,
            "start_ts": start_ts,
            "end_ts": end_ts,
        },
    )
    _execute(
        f"UPDATE {SCHEMA}.events SET room_id = :room_id WHERE event_id = :event_id",
        {"room_id": room_id, "event_id": event_id},
    )
    cache.invalidate_all()
    return {
        "booking_id": booking_id,
        "room_id": room_id,
        "event_id": event_id,
        "start_ts": start_ts,
        "end_ts": end_ts,
    }


# =============================================================================
# Writes: creating an event
# =============================================================================
def create_event(
    name: str,
    club_name: str,
    start_ts: datetime,
    end_ts: datetime | None = None,
    topic: str | None = None,
    description: str | None = None,
    room_id: str | None = None,
) -> dict[str, Any]:
    """Per data-contracts.md's Write Contracts (Create event). `club_name` is
    resolved case-insensitively against clubs.name; `room_id` (if supplied) is
    validated and immediately booked via the same supersede-then-insert path,
    rejecting before inserting the event if a conflict exists. If `end_ts` is
    omitted, defaults to `start_ts + 1 hour`."""
    club = get_club_by_name(club_name)
    if not club:
        raise NotFoundError("club_not_found")
    if not club["active"]:
        raise NotFoundError("club_inactive")

    computed_end_ts = end_ts or (start_ts + _ONE_HOUR)

    if room_id:
        resolved_room = resolve_room_id(room_id)
        if not resolved_room:
            raise NotFoundError("room_not_found")
        room_id = resolved_room
        conflict = _confirmed_conflict(room_id, start_ts, computed_end_ts)
        if conflict is not None:
            raise BookingConflictError(conflict)

    event_id = _next_id("events", "event_id", "evt_", 3)
    _execute(
        f"""INSERT INTO {SCHEMA}.events
            (event_id, name, club_id, topic, description, room_id, start_ts, end_ts, status, created_at)
            VALUES (:event_id, :name, :club_id, :topic, :description, :room_id, :start_ts, :end_ts, 'scheduled', current_timestamp())""",
        {
            "event_id": event_id,
            "name": name,
            "club_id": club["club_id"],
            "topic": topic,
            "description": description,
            "room_id": room_id,
            "start_ts": start_ts,
            "end_ts": computed_end_ts,
        },
    )

    if room_id is not None:
        booking_id = _next_id("room_bookings", "booking_id", "bk_", 4)
        _execute(
            f"""INSERT INTO {SCHEMA}.room_bookings
                (booking_id, room_id, event_id, start_ts, end_ts, status, created_at)
                VALUES (:booking_id, :room_id, :event_id, :start_ts, :end_ts, 'confirmed', current_timestamp())""",
            {
                "booking_id": booking_id,
                "room_id": room_id,
                "event_id": event_id,
                "start_ts": start_ts,
                "end_ts": computed_end_ts,
            },
        )

    cache.invalidate_all()
    return {
        "event_id": event_id,
        "name": name,
        "club": club["name"],
        "start_ts": start_ts,
        "room_id": room_id,
        "topic": topic,
    }


def _default_duration():
    from datetime import timedelta

    return timedelta(hours=1)


# =============================================================================
# Writes: attendance ingestion
# =============================================================================
def insert_attendance(
    event_id: str,
    registrant_name: str,
    registrant_email: str,
    registered_at: datetime,
) -> str:
    """Per data-contracts.md's Write Contracts (Record attendance). Rejects an
    unknown event_id regardless of that event's status. Resolves student_id by
    exact case-insensitive email match; leaves it NULL for an unmatched
    registrant (a valid, first-class outcome, not an error). Append-only, no
    de-duplication — repeat registrations are recorded as separate rows by
    design."""
    if not event_exists(event_id):
        raise NotFoundError("unknown_event")

    student_rows = _query(
        f"SELECT student_id FROM {SCHEMA}.students WHERE LOWER(email) = LOWER(:email)",
        {"email": registrant_email},
    )
    student_id = student_rows[0]["student_id"] if student_rows else None

    attendance_id = _next_id("event_attendance", "attendance_id", "att_", 4)
    _execute(
        f"""INSERT INTO {SCHEMA}.event_attendance
            (attendance_id, event_id, student_id, registrant_name, registrant_email, registered_at, source)
            VALUES (:attendance_id, :event_id, :student_id, :registrant_name, :registrant_email, :registered_at, 'google_form')""",
        {
            "attendance_id": attendance_id,
            "event_id": event_id,
            "student_id": student_id,
            "registrant_name": registrant_name,
            "registrant_email": registrant_email,
            "registered_at": registered_at,
        },
    )
    cache.invalidate_all()
    return attendance_id


def get_event_attendees(event_id: str) -> dict[str, Any]:
    """Retrieve full attendee details (name, email, registration time, student info) for an event."""
    cache_key = f"attendees:{event_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    resolved = resolve_event_id(event_id)
    if not resolved:
        raise NotFoundError("event_not_found")
    event_id = resolved

    event_rows = _query(f"SELECT name FROM {SCHEMA}.events WHERE event_id = :event_id", {"event_id": event_id})
    event_name = event_rows[0]["name"] if event_rows else event_id

    sql = f"""
        SELECT
            a.attendance_id,
            a.event_id,
            a.registrant_name,
            a.registrant_email,
            a.registered_at,
            a.student_id,
            s.major,
            s.year
        FROM {SCHEMA}.event_attendance a
        LEFT JOIN {SCHEMA}.students s ON s.student_id = a.student_id
        WHERE a.event_id = :event_id
        ORDER BY a.registered_at DESC
    """
    rows = _query(sql, {"event_id": event_id})
    res = {
        "event_id": event_id,
        "event_name": event_name,
        "total_count": len(rows),
        "attendees": rows,
    }
    cache.set(cache_key, res, ttl_seconds=20.0)
    return res


# =============================================================================
# Reads: internships
# =============================================================================
def get_internships(open_only: bool = True) -> list[dict[str, Any]]:
    """Returns internship opportunities from Delta Lake."""
    cache_key = f"internships:{open_only}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    where = "WHERE status = 'open'" if open_only else ""
    sql = f"""
        SELECT
            internship_id,
            company_name,
            role_title,
            location,
            stipend,
            eligibility,
            deadline_ts,
            apply_url,
            status
        FROM {SCHEMA}.internships
        {where}
        ORDER BY deadline_ts ASC
    """
    res = _query(sql)
    cache.set(cache_key, res, ttl_seconds=60.0)
    return res


# =============================================================================
# Reads: Campus Pulse (v2-api-contracts.md §4.1)
# =============================================================================
# SQL mirror of _instant_occupied for a room subquery aliased `b` (see the
# module-level _SQL_INSTANT_OCCUPIED — same predicate, kept local so the
# NOT EXISTS / EXISTS forms below read clearly).
_ROOM_OCCUPIED_AT = (
    "EXISTS (SELECT 1 FROM {schema}.room_bookings b "
    "JOIN {schema}.events e2 ON e2.event_id = b.event_id "
    "WHERE b.room_id = r.room_id AND b.status = 'confirmed' "
    "AND e2.status != 'cancelled' AND b.start_ts <= :at AND :at < b.end_ts)"
)


def get_campus_pulse(at: datetime) -> dict[str, Any]:
    """Compose the "what's true on campus right now" snapshot in one consistent
    `at` instant. Every field is a direct aggregate over existing governed data
    using the same half-open-interval rule as room availability — no new metric
    is introduced (v2-api-contracts.md §4.1). If any underlying query fails the
    whole call raises WarehouseError; the router returns 502 with no partial
    payload."""
    cache_key = f"pulse:{at.strftime('%Y%m%d%H%M') if at else 'now'}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    occupied = _ROOM_OCCUPIED_AT.format(schema=SCHEMA)

    events_now = _query(
        f"""
        SELECT e.event_id, e.name, c.name AS club, r.name AS room, e.end_ts
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        WHERE e.status = 'scheduled' AND e.start_ts <= :at AND :at < e.end_ts
        ORDER BY e.end_ts
        """,
        {"at": at},
    )
    events_upcoming = _query(
        f"""
        SELECT e.event_id, e.name, c.name AS club, e.start_ts
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        WHERE e.status = 'scheduled' AND e.start_ts > :at
        ORDER BY e.start_ts
        LIMIT 5
        """,
        {"at": at},
    )
    room_counts = _query(
        f"""
        SELECT
          (SELECT COUNT(*) FROM {SCHEMA}.rooms) AS total,
          (SELECT COUNT(*) FROM {SCHEMA}.rooms r WHERE NOT {occupied}) AS available
        """,
        {"at": at},
    )
    registrations = _query(
        f"""
        SELECT COUNT(*) AS n FROM {SCHEMA}.event_attendance
        WHERE CAST(registered_at AS DATE) = CAST(:at AS DATE)
        """,
        {"at": at},
    )

    total = room_counts[0]["total"] if room_counts else 0
    available = room_counts[0]["available"] if room_counts else 0
    next_major = None
    if events_upcoming:
        first = events_upcoming[0]
        next_major = {
            "event_id": first["event_id"],
            "name": first["name"],
            "start_ts": first["start_ts"],
        }
    res = {
        "at": at,
        "events_now": events_now,
        "events_upcoming": events_upcoming,
        "rooms_available_count": available,
        "rooms_total_count": total,
        "registrations_today": registrations[0]["n"] if registrations else 0,
        "next_major_event": next_major,
    }
    cache.set(cache_key, res, ttl_seconds=15.0)
    return res


# =============================================================================
# Reads: Analytics (v2-api-contracts.md §5) — council-only, direct aggregates
# =============================================================================
def _range_clauses(column: str, date_from: datetime | None, date_to: datetime | None,
                   params: dict[str, Any]) -> list[str]:
    """Half-open [from, to) window clauses for `column`, binding into `params`."""
    clauses: list[str] = []
    if date_from is not None:
        clauses.append(f"{column} >= :date_from")
        params["date_from"] = date_from
    if date_to is not None:
        clauses.append(f"{column} < :date_to")
        params["date_to"] = date_to
    return clauses


def get_analytics_overview(
    date_from: datetime | None, date_to: datetime | None
) -> dict[str, Any]:
    cache_key = f"analytics_overview:{date_from}:{date_to}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    explicit_range = date_from is not None or date_to is not None

    ev_params: dict[str, Any] = {}
    ev_clauses = _range_clauses("e.start_ts", date_from, date_to, ev_params)
    # Default framing excludes cancelled; an explicit date range is treated as a
    # historical query and counts every status (data-contracts.md Read Contracts).
    if not explicit_range:
        ev_clauses.insert(0, "e.status != 'cancelled'")
    ev_where = " AND ".join(ev_clauses) if ev_clauses else "TRUE"
    total_events = _query(
        f"SELECT COUNT(*) AS n FROM {SCHEMA}.events e WHERE {ev_where}", ev_params
    )[0]["n"]

    upcoming_events = _query(
        f"""SELECT COUNT(*) AS n FROM {SCHEMA}.events
            WHERE status = 'scheduled' AND start_ts > current_timestamp()"""
    )[0]["n"]

    att_params: dict[str, Any] = {}
    att_clauses = _range_clauses("registered_at", date_from, date_to, att_params)
    att_where = " AND ".join(att_clauses) if att_clauses else "TRUE"
    total_registrations = _query(
        f"SELECT COUNT(*) AS n FROM {SCHEMA}.event_attendance WHERE {att_where}", att_params
    )[0]["n"]

    active_clubs = _query(
        f"SELECT COUNT(*) AS n FROM {SCHEMA}.clubs WHERE active = true"
    )[0]["n"]

    rooms = _query(
        f"""
        SELECT
          (SELECT COUNT(*) FROM {SCHEMA}.rooms) AS total,
          (SELECT COUNT(*) FROM {SCHEMA}.rooms r WHERE EXISTS (
             SELECT 1 FROM {SCHEMA}.room_bookings b
             JOIN {SCHEMA}.events e ON e.event_id = b.event_id
             WHERE b.room_id = r.room_id AND b.status = 'confirmed'
               AND e.status != 'cancelled'
               AND b.start_ts <= current_timestamp() AND current_timestamp() < b.end_ts
          )) AS booked
        """
    )[0]

    average = round(total_registrations / total_events, 1) if total_events else 0.0
    res = {
        "range": {"from": date_from, "to": date_to},
        "total_events": total_events,
        "upcoming_events": upcoming_events,
        "total_registrations": total_registrations,
        "average_attendance_per_event": average,
        "active_clubs": active_clubs,
        "rooms_booked_now": rooms["booked"],
        "rooms_total": rooms["total"],
    }
    cache.set(cache_key, res, ttl_seconds=30.0)
    return res


def get_analytics_events(
    date_from: datetime | None, date_to: datetime | None, limit: int
) -> dict[str, Any]:
    limit = max(1, min(int(limit), 100))  # bounded int, safe to inline
    cache_key = f"analytics_events:{date_from}:{date_to}:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params: dict[str, Any] = {}
    clauses = _range_clauses("e.start_ts", date_from, date_to, params)
    where = " AND ".join(clauses) if clauses else "TRUE"
    base = f"""
        SELECT e.event_id, e.name,
          (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a WHERE a.event_id = e.event_id)
            AS attendance_count
        FROM {SCHEMA}.events e
        WHERE {where}
    """
    popular = _query(
        f"SELECT t.event_id, t.name, t.attendance_count FROM ({base}) t "
        f"WHERE t.attendance_count > 0 ORDER BY t.attendance_count DESC, t.event_id LIMIT {limit}",
        params,
    )
    low = _query(
        f"SELECT t.event_id, t.name, t.attendance_count FROM ({base}) t "
        f"WHERE t.attendance_count > 0 ORDER BY t.attendance_count ASC, t.event_id LIMIT {limit}",
        params,
    )
    zero = _query(
        f"SELECT t.event_id, t.name, t.attendance_count FROM ({base}) t "
        f"WHERE t.attendance_count = 0 ORDER BY t.event_id",
        params,
    )
    res = {
        "range": {"from": date_from, "to": date_to},
        "popular_events": popular,
        "low_attendance_events": low,
        "zero_attendance_events": zero,
    }
    cache.set(cache_key, res, ttl_seconds=30.0)
    return res


def get_analytics_rooms(
    date_from: datetime | None, date_to: datetime | None
) -> dict[str, Any]:
    cache_key = f"analytics_rooms:{date_from}:{date_to}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params: dict[str, Any] = {}
    booking_filter = " AND ".join(
        ["b.status = 'confirmed'"] + _range_clauses("b.start_ts", date_from, date_to, params)
    )
    utilization = _query(
        f"""
        SELECT r.room_id, r.name, r.type,
          COUNT(b.booking_id) AS confirmed_bookings,
          COALESCE(
            SUM((unix_timestamp(b.end_ts) - unix_timestamp(b.start_ts)) / 3600.0), 0
          ) AS total_booked_hours
        FROM {SCHEMA}.rooms r
        LEFT JOIN {SCHEMA}.room_bookings b ON b.room_id = r.room_id AND {booking_filter}
        GROUP BY r.room_id, r.name, r.type
        ORDER BY confirmed_bookings DESC, r.room_id
        """,
        params,
    )
    peak = _query(
        f"""
        SELECT hour(b.start_ts) AS hour_of_day, COUNT(*) AS booking_count
        FROM {SCHEMA}.room_bookings b
        WHERE {booking_filter}
        GROUP BY hour(b.start_ts)
        ORDER BY hour_of_day
        """,
        params,
    )
    for row in utilization:
        row["total_booked_hours"] = float(row["total_booked_hours"] or 0)
    res = {
        "range": {"from": date_from, "to": date_to},
        "room_utilization": utilization,
        "peak_booking_periods": peak,
    }
    cache.set(cache_key, res, ttl_seconds=30.0)
    return res


def get_analytics_clubs(
    date_from: datetime | None, date_to: datetime | None
) -> dict[str, Any]:
    cache_key = f"analytics_clubs:{date_from}:{date_to}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    params: dict[str, Any] = {}
    ev_clauses = _range_clauses("e.start_ts", date_from, date_to, params)
    ev_filter = " AND ".join(ev_clauses) if ev_clauses else "TRUE"
    rows = _query(
        f"""
        SELECT c.club_id, c.name, c.active,
          COUNT(DISTINCT e.event_id) AS event_count,
          COUNT(a.attendance_id) AS total_registrations
        FROM {SCHEMA}.clubs c
        LEFT JOIN {SCHEMA}.events e ON e.club_id = c.club_id AND {ev_filter}
        LEFT JOIN {SCHEMA}.event_attendance a ON a.event_id = e.event_id
        GROUP BY c.club_id, c.name, c.active
        ORDER BY event_count DESC, c.club_id
        """,
        params,
    )
    res = {"range": {"from": date_from, "to": date_to}, "club_activity": rows}
    cache.set(cache_key, res, ttl_seconds=30.0)
    return res


# =============================================================================
# Reads: Activity feed (v2-api-contracts.md §6.1) — derived, no new table
# =============================================================================
def get_activity(limit: int = 20) -> list[dict[str, Any]]:
    """Merge recent `events.created_at` and `room_bookings.created_at` into one
    reverse-chronological feed. No cancellation events / user attribution —
    those need schema additions flagged as NEW DATA DEPENDENCY in §6.1."""
    limit = max(1, min(int(limit), 50))  # bounded int, safe to inline
    cache_key = f"activity:{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    events = _query(
        f"""
        SELECT e.event_id, e.name, e.created_at
        FROM {SCHEMA}.events e
        WHERE e.created_at IS NOT NULL
        ORDER BY e.created_at DESC
        LIMIT {limit}
        """
    )
    bookings = _query(
        f"""
        SELECT b.booking_id, b.event_id, b.created_at, r.name AS room, e.name AS event_name
        FROM {SCHEMA}.room_bookings b
        JOIN {SCHEMA}.rooms r ON r.room_id = b.room_id
        JOIN {SCHEMA}.events e ON e.event_id = b.event_id
        WHERE b.created_at IS NOT NULL
        ORDER BY b.created_at DESC
        LIMIT {limit}
        """
    )

    items: list[dict[str, Any]] = [
        {
            "type": "event_created",
            "at": row["created_at"],
            "event_id": row["event_id"],
            "name": row["name"],
        }
        for row in events
    ]
    items += [
        {
            "type": "room_booked",
            "at": row["created_at"],
            "booking_id": row["booking_id"],
            "room": row["room"],
            "event_id": row["event_id"],
            "event_name": row["event_name"],
        }
        for row in bookings
    ]
    items.sort(key=lambda it: it["at"], reverse=True)
    res = items[:limit]
    cache.set(cache_key, res, ttl_seconds=15.0)
    return res

