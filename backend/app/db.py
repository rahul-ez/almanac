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
from datetime import datetime
from typing import Any, Iterator

from databricks import sql as dbsql

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


# =============================================================================
# Connection handling
# =============================================================================
@contextmanager
def _connection() -> Iterator[Any]:
    try:
        hostname = (settings.databricks_host or "").replace("https://", "").replace("http://", "").split("/")[0]
        conn = dbsql.connect(
            server_hostname=hostname,
            http_path=f"/sql/1.0/warehouses/{settings.sql_warehouse_id}",
            access_token=settings.databricks_token,
        )
    except Exception as exc:  # connection setup failure
        logger.error("Failed to open SQL warehouse connection: %s", exc)
        raise WarehouseError(str(exc)) from exc
    try:
        yield conn
    finally:
        conn.close()


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
    return _query(sql, {"room_type": room_type, "at": at})


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
def get_events(upcoming: bool = True) -> list[dict[str, Any]]:
    """List events with a live attendance_count, per the `GET /api/events`
    contract shape (event_id, name, club, start_ts, room, attendance_count).

    "upcoming=true" (the default) includes events that are scheduled and not
    yet finished (end_ts in the future) — this deliberately includes events
    currently in progress ("ongoing"/"live" per ui-tokens.md's semantic
    states), not just strictly-future ones, since the Newsletter Home is
    documented to render an in-progress event with its live pairing rather
    than hide it. "upcoming=false" returns every event regardless of status
    or time, for historical questions.
    """
    where = "WHERE e.status = 'scheduled' AND e.end_ts > current_timestamp()" if upcoming else ""
    sql = f"""
        SELECT
            e.event_id,
            e.name,
            c.name AS club,
            e.start_ts,
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
    return _query(sql)


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
            "end_ts": resolved_end_ts,
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
                "end_ts": resolved_end_ts,
            },
        )

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
    return attendance_id
