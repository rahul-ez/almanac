-- Campus Companion — Data Platform
-- 03_trusted_functions.sql
--
-- The one trusted SQL function Genie is configured to use for room-availability
-- questions, per context/genie.md's Trusted Assets / Tuning: "room_is_free is the
-- only trusted function needed — teacher availability and attendance counts are
-- simple enough for Genie to derive correctly once the semantic rules are in the
-- instructions."
--
-- This function is the single, canonical implementation of the half-open-interval
-- overlap check for room occupancy (context/data-contracts.md's free_rooms_at
-- formula, specialized to one room_id and one instant). The backend's own
-- direct-read implementation of the same check in db.py MUST use the identical
-- formula so Genie and the backend can never disagree on "is this room free" —
-- see data-contracts.md's Genie-Relevant Data Semantics.
--
-- Run after 01_create_schema.sql (and ideally after 02_seed_data.sql, so it can
-- be smoke-tested immediately against real rows).
--
-- After creating this function, register it in the Genie Space as a trusted
-- function (Genie Space settings -> SQL functions) so Genie calls it directly
-- rather than re-deriving the overlap logic itself.

USE CATALOG campus_companion;
USE SCHEMA campus;

CREATE OR REPLACE FUNCTION campus_companion.campus.room_is_free(
  p_room_id STRING COMMENT 'rooms.room_id to check.',
  p_ts      TIMESTAMP_NTZ COMMENT 'The instant to check availability at, campus-local, no timezone conversion.'
)
RETURNS BOOLEAN
COMMENT 'True if room p_room_id has no CONFIRMED booking (whose event is not cancelled) occupying the half-open interval [start_ts, end_ts) at p_ts. The end instant of a booking is never itself occupied — a booking ending at p_ts does not make the room unavailable at p_ts. See data-contracts.md#room_bookings and #Business-Rules (Room booking / room availability) and #Time-Date-and-Status-Semantics.'
RETURN NOT EXISTS (
  SELECT 1
  FROM campus_companion.campus.room_bookings b
  INNER JOIN campus_companion.campus.events e
    ON e.event_id = b.event_id
  WHERE b.room_id = p_room_id
    AND b.status = 'confirmed'
    AND e.status != 'cancelled'
    AND b.start_ts <= p_ts
    AND p_ts < b.end_ts
);

-- =============================================================================
-- Smoke tests — run manually after 02_seed_data.sql, against the seed data in
-- data-platform/notebooks/02_seed_data.sql.
-- =============================================================================
-- 1. Lab 204 (room_005) during its AI Workshop booking -> expect false.
-- SELECT campus_companion.campus.room_is_free('room_005', TIMESTAMP_NTZ '2026-09-05 16:00:00');

-- 2. Lab 204 (room_005) exactly at the booking's end instant -> expect true
--    (half-open interval: the end instant is not occupied). This is
--    benchmark #9 in benchmarks/question_sql_pairs.md.
-- SELECT campus_companion.campus.room_is_free('room_005', TIMESTAMP_NTZ '2026-09-05 17:00:00');

-- 3. Lab 204 (room_005) exactly at the booking's start instant -> expect false
--    (half-open interval: the start instant IS occupied).
-- SELECT campus_companion.campus.room_is_free('room_005', TIMESTAMP_NTZ '2026-09-05 15:00:00');

-- 4. Lab 305 (room_009) at any time -> expect true always (never booked).
-- SELECT campus_companion.campus.room_is_free('room_009', TIMESTAMP_NTZ '2026-09-05 15:00:00');

-- 5. Seminar Room C (room_003) during the cancelled event's original window ->
--    expect true (a cancelled event's booking does not occupy the room, even
--    though the booking row itself still exists with status = 'cancelled').
-- SELECT campus_companion.campus.room_is_free('room_003', TIMESTAMP_NTZ '2026-09-04 15:00:00');
