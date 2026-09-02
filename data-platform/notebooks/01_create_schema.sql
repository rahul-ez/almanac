-- Campus Companion — Data Platform
-- 01_create_schema.sql
--
-- Creates the single Unity Catalog catalog/schema and all 7 governed Delta tables
-- defined in context/data-contracts.md. Table/column names, types, and semantics
-- below are transcribed exactly from that file — it is the authoritative source;
-- if this file and data-contracts.md ever disagree, data-contracts.md wins and this
-- file must be corrected to match it, per that file's Data Contract Change Rules.
--
-- CATALOG / SCHEMA
-- Fully qualified schema used throughout this project: campus_companion.campus
-- This must match the `UNITY_CATALOG_SCHEMA` environment variable the Backend
-- workstream configures (see context/architecture.md's Environment Configuration
-- table). If your workspace requires a different catalog name, change the two
-- identifiers below and re-run — do not rename individual table references
-- piecemeal, and republish the final name in context/data-contracts.md per its own
-- change-control rules if it differs from what's written there.
--
-- TIMESTAMPS
-- All timestamp columns use TIMESTAMP_NTZ (no attached timezone), matching
-- data-contracts.md's Time, Date, and Status Semantics: "all timestamps are stored
-- and interpreted as campus local time ... no component may apply a UTC
-- conversion." Using TIMESTAMP (which carries an implicit session-timezone
-- conversion in Databricks) would silently violate that invariant.
--
-- Run this notebook/script once, top to bottom, before 02_seed_data.sql.

CREATE CATALOG IF NOT EXISTS campus_companion;

CREATE SCHEMA IF NOT EXISTS campus_companion.campus
  COMMENT 'Campus Companion governed schema — the single source of truth for both Genie and the application backend. Exactly 7 tables: clubs, students, rooms, events, room_bookings, teacher_timetable, event_attendance. See context/data-contracts.md.';

USE CATALOG campus_companion;
USE SCHEMA campus;

-- =============================================================================
-- clubs
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.clubs (
  club_id   STRING  NOT NULL COMMENT 'Canonical identifier, format club_NNN (3-digit zero-padded). Immutable once created.',
  name      STRING  NOT NULL COMMENT 'Display name of the club. Unique, case-insensitive, across all clubs. Not the identifier.',
  category  STRING           COMMENT 'Broad classification for grouping/filtering. Closed set: Technical, Cultural, Sports, Academic, Social. Optional.',
  active    BOOLEAN NOT NULL COMMENT 'Whether the club currently runs events. Default true. false marks a club inactive without deleting it or its historical events; inactive clubs are excluded from the "create a new event" club picker but remain fully queryable for historical questions.'
)
USING DELTA
COMMENT 'Student organisations that own and run events. Reference/ownership entity — relatively static, seeded once. See context/data-contracts.md#clubs.';

ALTER TABLE campus_companion.campus.clubs ADD CONSTRAINT pk_clubs PRIMARY KEY (club_id);
ALTER TABLE campus_companion.campus.clubs ADD CONSTRAINT chk_clubs_category
  CHECK (category IS NULL OR category IN ('Technical', 'Cultural', 'Sports', 'Academic', 'Social'));

-- =============================================================================
-- students
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.students (
  student_id STRING  NOT NULL COMMENT 'Canonical identifier, format stu_NNNN (4-digit zero-padded). Immutable.',
  name       STRING  NOT NULL COMMENT 'Synthetic display name.',
  email      STRING  NOT NULL COMMENT 'Synthetic campus email, unique (case-insensitive). Used to resolve an event_attendance registration to a student record by exact case-insensitive match — no fuzzy matching.',
  year       INT              COMMENT 'Year of study, 1-4. Optional.',
  major      STRING           COMMENT 'Field of study. Used ONLY for aggregate questions (e.g. "how many Computer Science majors attended X") — never to identify or personalize a response for the person asking a question; the product has no concept of "the current user".'
)
USING DELTA
COMMENT 'Minimal synthetic student roster. Supports attendance resolution and aggregate Genie questions only — backs no login, account, or personalization feature. Never created/modified by any runtime write path; static seed data for the hackathon. See context/data-contracts.md#students.';

ALTER TABLE campus_companion.campus.students ADD CONSTRAINT pk_students PRIMARY KEY (student_id);

-- =============================================================================
-- rooms
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.rooms (
  room_id  STRING  NOT NULL COMMENT 'Canonical identifier, format room_NNN (3-digit zero-padded). Immutable.',
  name     STRING  NOT NULL COMMENT 'Display name, unique (case-insensitive). Not the identifier.',
  type     STRING  NOT NULL COMMENT 'Category of space, used for filtering ("free labs" questions). Closed set: classroom, lab, auditorium, study_room. Never a 5th value.',
  capacity INT              COMMENT 'Maximum occupancy. Optional.'
)
USING DELTA
COMMENT 'Bookable physical spaces. Reference/ownership entity, target of room_bookings. See context/data-contracts.md#rooms.';

ALTER TABLE campus_companion.campus.rooms ADD CONSTRAINT pk_rooms PRIMARY KEY (room_id);
ALTER TABLE campus_companion.campus.rooms ADD CONSTRAINT chk_rooms_type
  CHECK (type IN ('classroom', 'lab', 'auditorium', 'study_room'));

-- =============================================================================
-- events
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.events (
  event_id    STRING       NOT NULL COMMENT 'Canonical identifier, format evt_NNN (3-digit zero-padded). Immutable.',
  name        STRING       NOT NULL COMMENT 'Display name of the event.',
  club_id     STRING       NOT NULL COMMENT 'Owning club. Must reference an existing, active clubs.club_id at creation time. Every event has exactly one owning club — no co-hosted events.',
  topic       STRING                COMMENT 'Subject tag for topical questions ("AI events this week"). Free text from a small synthetic set, e.g. AI, Robotics, Career, Cultural, Sports, Workshop. Optional.',
  description STRING                COMMENT 'Short free-text description. Optional.',
  room_id     STRING                COMMENT 'DENORMALIZED convenience mirror of this event''s current CONFIRMED room_booking, or NULL if none exists. This must never disagree with room_bookings — the application (never Genie) keeps it in sync at write time. NEVER treat this as the source of truth for availability; room_bookings (joined to events.status) is authoritative.',
  start_ts    TIMESTAMP_NTZ NOT NULL COMMENT 'When the event begins. Campus-local, no timezone offset stored or assumed.',
  end_ts      TIMESTAMP_NTZ NOT NULL COMMENT 'When the event ends. Always strictly after start_ts. If not supplied at creation, defaults to start_ts + 1 hour (applied once, never recomputed).',
  status      STRING       NOT NULL COMMENT 'Lifecycle state. Closed set: scheduled, cancelled. Default scheduled. scheduled -> cancelled is the only transition and is terminal. Cancelled events are excluded from "upcoming/current" default views but remain queryable historically, and their room is treated as free by every availability check.',
  created_at  TIMESTAMP_NTZ NOT NULL COMMENT 'When the event record was created.'
)
USING DELTA
COMMENT 'Scheduled campus events. Central entity of the Newsletter Home view and the target of event_attendance/room_bookings. See context/data-contracts.md#events.';

ALTER TABLE campus_companion.campus.events ADD CONSTRAINT pk_events PRIMARY KEY (event_id);
ALTER TABLE campus_companion.campus.events ADD CONSTRAINT fk_events_club
  FOREIGN KEY (club_id) REFERENCES campus_companion.campus.clubs (club_id);
ALTER TABLE campus_companion.campus.events ADD CONSTRAINT fk_events_room
  FOREIGN KEY (room_id) REFERENCES campus_companion.campus.rooms (room_id);
ALTER TABLE campus_companion.campus.events ADD CONSTRAINT chk_events_status
  CHECK (status IN ('scheduled', 'cancelled'));
ALTER TABLE campus_companion.campus.events ADD CONSTRAINT chk_events_time_order
  CHECK (end_ts > start_ts);

-- =============================================================================
-- room_bookings
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.room_bookings (
  booking_id STRING       NOT NULL COMMENT 'Canonical identifier, format bk_NNNN (4-digit zero-padded). Immutable.',
  room_id    STRING       NOT NULL COMMENT 'Room being booked. Must reference an existing rooms.room_id.',
  event_id   STRING       NOT NULL COMMENT 'Event this booking is for. Must reference an existing events.event_id. Every booking belongs to exactly one event — no standalone/general-purpose bookings.',
  start_ts   TIMESTAMP_NTZ NOT NULL COMMENT 'Booking window start. Half-open interval with end_ts: [start_ts, end_ts).',
  end_ts     TIMESTAMP_NTZ NOT NULL COMMENT 'Booking window end. Strictly after start_ts. The end instant itself is NOT occupied (half-open interval) — a new booking may legitimately start at exactly this instant.',
  status     STRING       NOT NULL COMMENT 'Closed set: confirmed, cancelled. Default confirmed. Only confirmed bookings occupy a room. No two confirmed bookings for the same room_id may have overlapping [start_ts, end_ts) windows — this is the core conflict rule, enforced by the booking write path, not by this table alone.',
  created_at TIMESTAMP_NTZ NOT NULL COMMENT 'When the booking was made.'
)
USING DELTA
COMMENT 'Authoritative record of which room is reserved, for which event, during which window. THIS table (joined to events.status), not events.room_id, is the source of truth for room availability. See context/data-contracts.md#room_bookings.';

ALTER TABLE campus_companion.campus.room_bookings ADD CONSTRAINT pk_room_bookings PRIMARY KEY (booking_id);
ALTER TABLE campus_companion.campus.room_bookings ADD CONSTRAINT fk_room_bookings_room
  FOREIGN KEY (room_id) REFERENCES campus_companion.campus.rooms (room_id);
ALTER TABLE campus_companion.campus.room_bookings ADD CONSTRAINT fk_room_bookings_event
  FOREIGN KEY (event_id) REFERENCES campus_companion.campus.events (event_id);
ALTER TABLE campus_companion.campus.room_bookings ADD CONSTRAINT chk_room_bookings_status
  CHECK (status IN ('confirmed', 'cancelled'));
ALTER TABLE campus_companion.campus.room_bookings ADD CONSTRAINT chk_room_bookings_time_order
  CHECK (end_ts > start_ts);

-- =============================================================================
-- teacher_timetable
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.teacher_timetable (
  entry_id     STRING       NOT NULL COMMENT 'Canonical identifier for the timetable row, format tt_NNNN (4-digit zero-padded). Immutable.',
  teacher_name STRING       NOT NULL COMMENT 'Canonical name of the occupied teacher. There is NO separate teacher table/ID — a teacher is identified solely by exact string equality of this column across rows. Spelling must be reused verbatim for the same person (no "Prof. Rao" vs "Professor Rao" split identity).',
  start_ts     TIMESTAMP_NTZ NOT NULL COMMENT 'Start of the occupied period.',
  end_ts       TIMESTAMP_NTZ NOT NULL COMMENT 'End of the occupied period. Strictly after start_ts. Half-open interval: this instant itself is not occupied.',
  activity     STRING                COMMENT 'What the teacher is doing, e.g. "Teaching CS301", "Faculty Meeting", "Office Hours". Optional.'
)
USING DELTA
COMMENT 'Authoritative source for teacher occupancy/availability. Read-only source data for this product — no create/edit flow exists or is planned. See context/data-contracts.md#teacher_timetable.';

ALTER TABLE campus_companion.campus.teacher_timetable ADD CONSTRAINT pk_teacher_timetable PRIMARY KEY (entry_id);
ALTER TABLE campus_companion.campus.teacher_timetable ADD CONSTRAINT chk_teacher_timetable_time_order
  CHECK (end_ts > start_ts);

-- =============================================================================
-- event_attendance
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.event_attendance (
  attendance_id     STRING       NOT NULL COMMENT 'Canonical identifier, format att_NNNN (4-digit zero-padded). Immutable.',
  event_id          STRING       NOT NULL COMMENT 'Event being attended. Must reference an existing events.event_id — the ingestion write is rejected otherwise, regardless of that event''s status.',
  student_id        STRING                COMMENT 'Resolved student if registrant_email matched an existing students.email (case-insensitive, exact match only), else NULL for an unmatched/guest registrant. NULL is a valid, first-class value, not an error — unmatched registrants still count toward attendance_count.',
  registrant_name   STRING       NOT NULL COMMENT 'Name as submitted on the registration form.',
  registrant_email  STRING       NOT NULL COMMENT 'Email as submitted on the registration form. Used only to attempt student_id resolution.',
  registered_at     TIMESTAMP_NTZ NOT NULL COMMENT 'When the registration was recorded.',
  source            STRING       NOT NULL COMMENT 'How the record was created. Closed set: google_form (the live ingestion path), seed (Data Platform-generated).'
)
USING DELTA
COMMENT 'Individual registration/attendance records. Sole basis of attendance_count (always a live COUNT(*), never stored). Append-only — no update/delete flow. Duplicate registrations (same registrant_email + event_id) are intentionally permitted, not suppressed. See context/data-contracts.md#event_attendance.';

ALTER TABLE campus_companion.campus.event_attendance ADD CONSTRAINT pk_event_attendance PRIMARY KEY (attendance_id);
ALTER TABLE campus_companion.campus.event_attendance ADD CONSTRAINT fk_event_attendance_event
  FOREIGN KEY (event_id) REFERENCES campus_companion.campus.events (event_id);
ALTER TABLE campus_companion.campus.event_attendance ADD CONSTRAINT fk_event_attendance_student
  FOREIGN KEY (student_id) REFERENCES campus_companion.campus.students (student_id);
ALTER TABLE campus_companion.campus.event_attendance ADD CONSTRAINT chk_event_attendance_source
  CHECK (source IN ('google_form', 'seed'));

-- =============================================================================
-- internships
-- =============================================================================
CREATE TABLE IF NOT EXISTS campus_companion.campus.internships (
  internship_id STRING       NOT NULL COMMENT 'Canonical identifier, format int_NNN (3-digit zero-padded). Immutable.',
  company_name  STRING       NOT NULL COMMENT 'Company / Organization offering the internship.',
  role_title    STRING       NOT NULL COMMENT 'Role / Position title, e.g. "Data Science Intern".',
  location      STRING       NOT NULL COMMENT 'Location, e.g. "Remote", "Bangalore", "Hybrid", "Campus".',
  stipend       STRING                COMMENT 'Stipend details, e.g. "Rs 75,000/month", "Unpaid".',
  eligibility   STRING                COMMENT 'Eligible batches/majors.',
  deadline_ts   TIMESTAMP_NTZ NOT NULL COMMENT 'Application deadline timestamp.',
  apply_url     STRING                COMMENT 'Application link or portal URL.',
  status        STRING       NOT NULL COMMENT 'Closed set: open, closed. Default open.'
)
USING DELTA
COMMENT 'Campus and off-campus internship opportunities for students. See context/data-contracts.md#internships.';

ALTER TABLE campus_companion.campus.internships ADD CONSTRAINT pk_internships PRIMARY KEY (internship_id);
ALTER TABLE campus_companion.campus.internships ADD CONSTRAINT chk_internships_status
  CHECK (status IN ('open', 'closed'));

-- =============================================================================
-- Sanity check — run after this script to confirm all tables registered.
-- =============================================================================
-- SHOW TABLES IN campus_companion.campus;
