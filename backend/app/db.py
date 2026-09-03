"""All SQL execution for Campus Companion lives here.

Every query against `rooms`/`room_bookings`/`teacher_timetable` uses the exact
half-open-interval formula centralized in `_instant_occupied()` /
`_ranges_overlap()` below, matching context/data-contracts.md's Time, Date, and
Status Semantics.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Iterator

from databricks import sql as dbsql

from app.config import settings

logger = logging.getLogger("campus_companion.db")

SCHEMA = settings.unity_catalog_schema  # e.g. "campus_companion.campus"


# =============================================================================
# Typed errors
# =============================================================================
class NotFoundError(Exception):
    """A referenced entity does not exist."""

    def __init__(self, kind: str):
        self.kind = kind
        super().__init__(kind)


class BookingConflictError(Exception):
    """A new/updated booking would overlap an existing confirmed booking."""

    def __init__(self, conflicting_booking: dict[str, Any]):
        self.conflicting_booking = conflicting_booking
        super().__init__("booking_conflict")


class InvalidStatusTransitionError(Exception):
    """Event status transition is not permitted (e.g. non-scheduled -> cancelled)."""

    def __init__(self, message: str = "invalid_status_transition"):
        super().__init__(message)


class WarehouseError(Exception):
    """The SQL warehouse call itself failed."""


# =============================================================================
# Centralized half-open-interval formula
# =============================================================================
def _instant_occupied(start_ts: datetime, end_ts: datetime, at: datetime) -> bool:
    """True if [start_ts, end_ts) contains `at`."""
    return start_ts <= at < end_ts


def _ranges_overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    """True if [a_start, a_end) and [b_start, b_end) overlap."""
    return a_start < b_end and b_start < a_end


_SQL_INSTANT_OCCUPIED = "b.start_ts <= :at AND :at < b.end_ts"
_SQL_RANGES_OVERLAP = "b.start_ts < :end_ts AND :start_ts < b.end_ts"
_ONE_HOUR = timedelta(hours=1)


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
    except Exception as exc:
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
    """Run an INSERT/UPDATE statement."""
    try:
        with _connection() as conn, conn.cursor() as cursor:
            cursor.execute(sql, params or {})
    except WarehouseError:
        raise
    except Exception as exc:
        logger.error("Statement failed: %s | sql=%s | params=%s", exc, sql, params)
        raise WarehouseError(str(exc)) from exc


def _next_id(table: str, id_column: str, prefix: str, width: int) -> str:
    """Generate the next sequential ID."""
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
    """Rooms with no CONFIRMED booking occupying `at`."""
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
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    club_id: str | None = None,
    status: str | None = None,
    q: str | None = None,
    upcoming: bool = True,
) -> list[dict[str, Any]]:
    """List events with attendance count and flexible V2 filters."""
    clauses: list[str] = []
    params: dict[str, Any] = {}

    if from_ts is not None:
        clauses.append("e.start_ts >= :from_ts")
        params["from_ts"] = from_ts
    if to_ts is not None:
        clauses.append("e.start_ts < :to_ts")
        params["to_ts"] = to_ts

    if from_ts is None and to_ts is None and upcoming:
        clauses.append("e.status = 'scheduled' AND e.end_ts > current_timestamp()")

    if club_id:
        clauses.append("(e.club_id = :club_id OR LOWER(c.name) = LOWER(:club_id))")
        params["club_id"] = club_id

    if status:
        clauses.append("e.status = :status")
        params["status"] = status

    if q:
        clauses.append("(LOWER(e.name) LIKE :q OR LOWER(e.topic) LIKE :q OR LOWER(e.description) LIKE :q)")
        params["q"] = f"%{q.strip().lower()}%"

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    sql = f"""
        SELECT
            e.event_id,
            e.name,
            c.name AS club,
            e.start_ts,
            e.end_ts,
            r.name AS room,
            e.topic,
            e.status,
            (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a
             WHERE a.event_id = e.event_id) AS attendance_count
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        {where_sql}
        ORDER BY e.start_ts ASC
    """
    return _query(sql, params)


def get_event_detail(event_id: str) -> dict[str, Any]:
    """Get single event detail including description and attendance."""
    sql = f"""
        SELECT
            e.event_id,
            e.name,
            c.name AS club,
            e.start_ts,
            e.end_ts,
            e.room_id,
            r.name AS room,
            e.topic,
            e.description,
            e.status,
            (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a
             WHERE a.event_id = e.event_id) AS attendance_count
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        WHERE e.event_id = :event_id
    """
    rows = _query(sql, {"event_id": event_id})
    if not rows:
        raise NotFoundError("event_not_found")
    return rows[0]


def event_exists(event_id: str) -> bool:
    rows = _query(f"SELECT 1 FROM {SCHEMA}.events WHERE event_id = :event_id", {"event_id": event_id})
    return len(rows) > 0


def resolve_event_id(identifier: str) -> str | None:
    if not identifier:
        return None
    rows = _query(
        f"SELECT event_id FROM {SCHEMA}.events WHERE event_id = :id OR LOWER(name) = LOWER(:id)",
        {"id": identifier.strip()},
    )
    return rows[0]["event_id"] if rows else None


def get_club_by_name(name: str) -> dict[str, Any] | None:
    rows = _query(
        f"SELECT club_id, name, active FROM {SCHEMA}.clubs WHERE LOWER(name) = LOWER(:name)",
        {"name": name},
    )
    return rows[0] if rows else None


# =============================================================================
# Writes: cancellation
# =============================================================================
def cancel_event(event_id: str) -> dict[str, Any]:
    """Cancel a scheduled event and release its confirmed room booking."""
    resolved = resolve_event_id(event_id)
    if not resolved:
        raise NotFoundError("event_not_found")
    event_id = resolved

    event = get_event_detail(event_id)
    if event["status"] != "scheduled":
        raise InvalidStatusTransitionError("invalid_status_transition")

    _execute(
        f"UPDATE {SCHEMA}.events SET status = 'cancelled', room_id = NULL WHERE event_id = :event_id",
        {"event_id": event_id},
    )
    _execute(
        f"UPDATE {SCHEMA}.room_bookings SET status = 'cancelled' WHERE event_id = :event_id AND status = 'confirmed'",
        {"event_id": event_id},
    )
    return {"event_id": event_id, "status": "cancelled"}


# =============================================================================
# Writes: booking a room
# =============================================================================
def _confirmed_conflict(
    room_id: str, start_ts: datetime, end_ts: datetime, exclude_event_id: str | None = None
) -> dict[str, Any] | None:
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

    return {
        "event_id": event_id,
        "name": name,
        "club": club["name"],
        "start_ts": start_ts,
        "room_id": room_id,
        "topic": topic,
    }


# =============================================================================
# Writes: attendance ingestion
# =============================================================================
def insert_attendance(
    event_id: str,
    registrant_name: str,
    registrant_email: str,
    registered_at: datetime,
) -> str:
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


# =============================================================================
# Reads: internships
# =============================================================================
def get_internships(open_only: bool = True) -> list[dict[str, Any]]:
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
    return _query(sql)


# =============================================================================
# Reads: Campus Pulse
# =============================================================================
def get_campus_pulse(at: datetime | None = None) -> dict[str, Any]:
    """Single composite read for live Campus Pulse."""
    now = at or datetime.now()

    # 1. Events happening now
    events_now = _query(
        f"""
        SELECT e.event_id, e.name, c.name AS club, r.name AS room, e.start_ts, e.end_ts
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        WHERE e.status != 'cancelled' AND e.start_ts <= :now AND :now < e.end_ts
        ORDER BY e.start_ts ASC
        """,
        {"now": now},
    )

    # 2. Upcoming events
    events_upcoming = _query(
        f"""
        SELECT e.event_id, e.name, c.name AS club, r.name AS room, e.start_ts, e.end_ts
        FROM {SCHEMA}.events e
        JOIN {SCHEMA}.clubs c ON c.club_id = e.club_id
        LEFT JOIN {SCHEMA}.rooms r ON r.room_id = e.room_id
        WHERE e.status = 'scheduled' AND e.start_ts >= :now
        ORDER BY e.start_ts ASC
        LIMIT 5
        """,
        {"now": now},
    )

    # 3. Room counts
    free_rooms = get_free_rooms(None, now)
    total_rooms_rows = _query(f"SELECT COUNT(*) AS total FROM {SCHEMA}.rooms")
    total_rooms = total_rooms_rows[0]["total"] if total_rooms_rows else 0

    # 4. Registrations today
    today_start = datetime(now.year, now.month, now.day)
    tomorrow_start = today_start + timedelta(days=1)
    reg_rows = _query(
        f"""
        SELECT COUNT(*) AS cnt FROM {SCHEMA}.event_attendance
        WHERE registered_at >= :t_start AND registered_at < :t_end
        """,
        {"t_start": today_start, "t_end": tomorrow_start},
    )
    registrations_today = reg_rows[0]["cnt"] if reg_rows else 0

    next_major = events_upcoming[0] if events_upcoming else None

    return {
        "events_now": events_now,
        "events_upcoming": events_upcoming,
        "rooms_available_count": len(free_rooms),
        "rooms_total_count": total_rooms,
        "registrations_today": registrations_today,
        "next_major_event": next_major,
        "timestamp": now,
    }


# =============================================================================
# Reads: Analytics
# =============================================================================
def _range_clauses(from_ts: datetime | None, to_ts: datetime | None, col: str = "start_ts") -> tuple[list[str], dict[str, Any]]:
    clauses: list[str] = []
    params: dict[str, Any] = {}
    if from_ts:
        clauses.append(f"{col} >= :from_ts")
        params["from_ts"] = from_ts
    if to_ts:
        clauses.append(f"{col} < :to_ts")
        params["to_ts"] = to_ts
    return clauses, params


def get_analytics_overview(from_ts: datetime | None = None, to_ts: datetime | None = None) -> dict[str, Any]:
    range_dict = {
        "from": from_ts.isoformat() if from_ts else None,
        "to": to_ts.isoformat() if to_ts else None,
    }
    clauses, params = _range_clauses(from_ts, to_ts, "e.start_ts")
    if not from_ts and not to_ts:
        clauses.append("e.status != 'cancelled'")
    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    ev_stats = _query(
        f"""
        SELECT
            COUNT(*) AS total_events,
            SUM(CASE WHEN e.status = 'scheduled' AND e.start_ts >= current_timestamp() THEN 1 ELSE 0 END) AS upcoming_events
        FROM {SCHEMA}.events e
        {where_sql}
        """,
        params,
    )

    reg_clauses, reg_params = _range_clauses(from_ts, to_ts, "a.registered_at")
    reg_where = ("WHERE " + " AND ".join(reg_clauses)) if reg_clauses else ""
    reg_stats = _query(
        f"SELECT COUNT(*) AS total_reg FROM {SCHEMA}.event_attendance a {reg_where}",
        reg_params,
    )

    active_clubs = _query(f"SELECT COUNT(*) AS active_cnt FROM {SCHEMA}.clubs WHERE active = true")
    total_rooms = _query(f"SELECT COUNT(*) AS total_cnt FROM {SCHEMA}.rooms")

    now = datetime.now()
    free_now = len(get_free_rooms(None, now))
    total_r = total_rooms[0]["total_cnt"] if total_rooms else 0
    booked_now = max(0, total_r - free_now)

    tot_ev = ev_stats[0]["total_events"] if ev_stats else 0
    tot_reg = reg_stats[0]["total_reg"] if reg_stats else 0
    avg_att = round(tot_reg / tot_ev, 1) if tot_ev > 0 else 0.0

    return {
        "range": range_dict,
        "total_events": tot_ev,
        "upcoming_events": ev_stats[0]["upcoming_events"] if ev_stats else 0,
        "total_registrations": tot_reg,
        "average_attendance_per_event": avg_att,
        "active_clubs": active_clubs[0]["active_cnt"] if active_clubs else 0,
        "rooms_booked_now": booked_now,
        "rooms_total": total_r,
    }


def get_analytics_events(
    from_ts: datetime | None = None, to_ts: datetime | None = None, limit: int = 10
) -> dict[str, Any]:
    range_dict = {
        "from": from_ts.isoformat() if from_ts else None,
        "to": to_ts.isoformat() if to_ts else None,
    }
    clauses, params = _range_clauses(from_ts, to_ts, "e.start_ts")
    clauses.append("e.status != 'cancelled'")
    where_sql = "WHERE " + " AND ".join(clauses)

    rows = _query(
        f"""
        SELECT
            e.event_id,
            e.name,
            (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a WHERE a.event_id = e.event_id) AS attendance_count
        FROM {SCHEMA}.events e
        {where_sql}
        ORDER BY attendance_count DESC, e.start_ts ASC
        """,
        params,
    )

    popular = rows[:limit]
    zero_att = [r for r in rows if r["attendance_count"] == 0]
    low_att = [r for r in rows if 0 < r["attendance_count"] <= 5]

    return {
        "range": range_dict,
        "popular_events": popular,
        "low_attendance_events": low_att,
        "zero_attendance_events": zero_att,
    }


def get_analytics_rooms(from_ts: datetime | None = None, to_ts: datetime | None = None) -> dict[str, Any]:
    range_dict = {
        "from": from_ts.isoformat() if from_ts else None,
        "to": to_ts.isoformat() if to_ts else None,
    }
    clauses, params = _range_clauses(from_ts, to_ts, "b.start_ts")
    clauses.append("b.status = 'confirmed'")
    where_sql = "WHERE " + " AND ".join(clauses)

    room_util = _query(
        f"""
        SELECT
            r.room_id,
            r.name,
            r.type,
            COUNT(b.booking_id) AS confirmed_bookings,
            COALESCE(SUM(CAST(unix_timestamp(b.end_ts) - unix_timestamp(b.start_ts) AS DOUBLE) / 3600.0), 0.0) AS total_booked_hours
        FROM {SCHEMA}.rooms r
        LEFT JOIN (
            SELECT b.booking_id, b.room_id, b.start_ts, b.end_ts
            FROM {SCHEMA}.room_bookings b
            JOIN {SCHEMA}.events e ON e.event_id = b.event_id
            {where_sql} AND e.status != 'cancelled'
        ) b ON b.room_id = r.room_id
        GROUP BY r.room_id, r.name, r.type
        ORDER BY total_booked_hours DESC
        """,
        params,
    )

    peak_periods = _query(
        f"""
        SELECT
            hour(b.start_ts) AS hour_of_day,
            COUNT(*) AS booking_count
        FROM {SCHEMA}.room_bookings b
        JOIN {SCHEMA}.events e ON e.event_id = b.event_id
        {where_sql} AND e.status != 'cancelled'
        GROUP BY hour(b.start_ts)
        ORDER BY booking_count DESC
        LIMIT 6
        """,
        params,
    )

    return {
        "range": range_dict,
        "room_utilization": room_util,
        "peak_booking_periods": peak_periods,
    }


def get_analytics_clubs(from_ts: datetime | None = None, to_ts: datetime | None = None) -> dict[str, Any]:
    range_dict = {
        "from": from_ts.isoformat() if from_ts else None,
        "to": to_ts.isoformat() if to_ts else None,
    }
    clauses, params = _range_clauses(from_ts, to_ts, "e.start_ts")
    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    club_stats = _query(
        f"""
        SELECT
            c.club_id,
            c.name,
            c.active,
            COUNT(e.event_id) AS event_count,
            COALESCE(SUM(ev_att.attendance_count), 0) AS total_registrations
        FROM {SCHEMA}.clubs c
        LEFT JOIN (
            SELECT
                e.event_id,
                e.club_id,
                (SELECT COUNT(*) FROM {SCHEMA}.event_attendance a WHERE a.event_id = e.event_id) AS attendance_count
            FROM {SCHEMA}.events e
            {where_sql}
        ) e ON e.club_id = c.club_id
        GROUP BY c.club_id, c.name, c.active
        ORDER BY total_registrations DESC, event_count DESC
        """,
        params,
    )

    return {
        "range": range_dict,
        "club_activity": club_stats,
    }


# =============================================================================
# Reads: Activity
# =============================================================================
def get_activity(limit: int = 20) -> list[dict[str, Any]]:
    """Chronological audit feed combining events and room bookings."""
    events_created = _query(
        f"""
        SELECT
            'event_created' AS type,
            e.created_at AS at,
            e.event_id,
            e.name,
            CAST(NULL AS STRING) AS booking_id,
            CAST(NULL AS STRING) AS room,
            CAST(NULL AS STRING) AS event_name
        FROM {SCHEMA}.events e
        ORDER BY e.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )

    bookings_created = _query(
        f"""
        SELECT
            'room_booked' AS type,
            b.created_at AS at,
            b.event_id,
            CAST(NULL AS STRING) AS name,
            b.booking_id,
            r.name AS room,
            e.name AS event_name
        FROM {SCHEMA}.room_bookings b
        JOIN {SCHEMA}.rooms r ON r.room_id = b.room_id
        JOIN {SCHEMA}.events e ON e.event_id = b.event_id
        ORDER BY b.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )

    combined = events_created + bookings_created
    combined.sort(key=lambda x: x["at"] or datetime.min, reverse=True)
    return combined[:limit]
