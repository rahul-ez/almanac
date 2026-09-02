-- Campus Companion — Data Platform
-- 02_seed_data.sql
--
-- Synthetic seed data for all 7 tables, satisfying every scenario required by
-- context/data-contracts.md's "Synthetic Data Requirements" section. Run once,
-- after 01_create_schema.sql, against an empty schema.
--
-- ALL DATA IS SYNTHETIC. No real names, emails, IDs, faculty information, or
-- institutional records are used anywhere in this file, per data-contracts.md's
-- Synthetic Data Requirements.
--
-- "Today" for this seed set is treated as 2026-09-02 (Wednesday); "this week" is
-- 2026-08-31 (Mon) to 2026-09-06 (Sun). Timestamps below are chosen so that
-- "today", "this week", and "right now" all resolve to non-trivial answers
-- regardless of exactly when the demo/benchmarks are run, per that file's
-- Temporal Coverage requirement.
--
-- IDs are assigned sequentially in insertion order per entity, matching the
-- prefix + zero-padded-number convention in data-contracts.md's Identity
-- sections (club_NNN, stu_NNNN, room_NNN, evt_NNN, bk_NNNN, tt_NNNN, att_NNNN).
--
-- RESET: this script is not idempotent by itself (plain INSERTs). To re-run
-- from a clean slate, TRUNCATE all 7 tables first, in reverse dependency order
-- (event_attendance, room_bookings, teacher_timetable, events, rooms, students,
-- clubs), then re-run this file — never re-run on top of existing rows, which
-- would violate the uniqueness invariants documented in data-contracts.md.

USE CATALOG campus_companion;
USE SCHEMA campus;

-- =============================================================================
-- clubs (6 rows)
-- =============================================================================
INSERT INTO campus_companion.campus.clubs (club_id, name, category, active) VALUES
  ('club_001', 'AI Club',            'Technical', true),
  ('club_002', 'Robotics Club',      'Technical', true),
  ('club_003', 'Photography Club',   'Cultural',  true),
  ('club_004', 'Debate Society',     'Academic',  true),
  ('club_005', 'Campus Sports Club', 'Sports',    true),
  ('club_006', 'Chess Club',         'Social',    false); -- inactive; still owns a past event (evt_009) to demonstrate historical records survive deactivation

-- =============================================================================
-- students (20 rows)
-- =============================================================================
INSERT INTO campus_companion.campus.students (student_id, name, email, year, major) VALUES
  ('stu_0001', 'Aditi Sharma',     'aditi.sharma@campus.edu',     1, 'Computer Science'),
  ('stu_0002', 'Rohan Verma',      'rohan.verma@campus.edu',      2, 'Computer Science'),
  ('stu_0003', 'Priya Nair',       'priya.nair@campus.edu',       3, 'Electronics'),
  ('stu_0004', 'Karan Mehta',      'karan.mehta@campus.edu',      1, 'Mechanical'),
  ('stu_0005', 'Sneha Iyer',       'sneha.iyer@campus.edu',       4, 'Civil'),
  ('stu_0006', 'Arjun Das',        'arjun.das@campus.edu',        2, 'Biotechnology'),
  ('stu_0007', 'Neha Kapoor',      'neha.kapoor@campus.edu',      1, 'Computer Science'),
  ('stu_0008', 'Vikram Rao',       'vikram.rao@campus.edu',       3, 'Electronics'),
  ('stu_0009', 'Ananya Menon',     'ananya.menon@campus.edu',     2, 'Computer Science'),
  ('stu_0010', 'Aditya Joshi',     'aditya.joshi@campus.edu',     4, 'Mechanical'),
  ('stu_0011', 'Divya Pillai',     'divya.pillai@campus.edu',     1, 'Civil'),
  ('stu_0012', 'Manish Gupta',     'manish.gupta@campus.edu',     3, 'Biotechnology'),
  ('stu_0013', 'Ritika Bose',      'ritika.bose@campus.edu',      2, 'Computer Science'),
  ('stu_0014', 'Siddharth Rao',    'siddharth.rao@campus.edu',    1, 'Electronics'),
  ('stu_0015', 'Kavya Reddy',      'kavya.reddy@campus.edu',      4, 'Mechanical'),
  ('stu_0016', 'Farhan Ali',       'farhan.ali@campus.edu',       2, 'Civil'),
  ('stu_0017', 'Meera Krishnan',   'meera.krishnan@campus.edu',   3, 'Computer Science'),
  ('stu_0018', 'Ishaan Kapoor',    'ishaan.kapoor@campus.edu',    1, 'Biotechnology'),
  ('stu_0019', 'Tanya Desai',      'tanya.desai@campus.edu',      2, 'Electronics'),
  ('stu_0020', 'Yash Malhotra',    'yash.malhotra@campus.edu',    4, 'Computer Science');

-- =============================================================================
-- rooms (9 rows — 3 classroom, 3 lab, 1 auditorium, 2 study_room)
-- room_009 (Lab 305) is deliberately never booked anywhere in this file — the
-- guaranteed-free lab required for a reliable "which labs are free" demo answer.
-- =============================================================================
INSERT INTO campus_companion.campus.rooms (room_id, name, type, capacity) VALUES
  ('room_001', 'Lecture Hall A',   'classroom',  60),
  ('room_002', 'Lecture Hall B',   'classroom',  45),
  ('room_003', 'Seminar Room C',   'classroom',  30),
  ('room_004', 'Robotics Lab',     'lab',        25),
  ('room_005', 'Lab 204',          'lab',        30),
  ('room_006', 'Main Auditorium',  'auditorium', 200),
  ('room_007', 'Study Room 1',     'study_room', 8),
  ('room_008', 'Study Room 2',     'study_room', 8),
  ('room_009', 'Lab 305',          'lab',        24); -- intentionally never booked

-- =============================================================================
-- events (12 rows)
-- Mix of past / this-week / future; evt_004, evt_005, evt_010 are unbooked
-- (room_id NULL); evt_009 belongs to the now-inactive club_006; evt_010 is
-- cancelled with a formerly-confirmed booking that is also cancelled (see
-- room_bookings below).
-- =============================================================================
INSERT INTO campus_companion.campus.events
  (event_id, name, club_id, topic, description, room_id, start_ts, end_ts, status, created_at) VALUES
  ('evt_001', 'AI Workshop',                   'club_001', 'AI',       'Hands-on intro to large language models',              'room_005', TIMESTAMP_NTZ '2026-09-05 15:00:00', TIMESTAMP_NTZ '2026-09-05 17:00:00', 'scheduled', TIMESTAMP_NTZ '2026-09-01 09:00:00'),
  ('evt_002', 'Robotics Bootcamp',             'club_002', 'Robotics', 'Build and program a line-following robot',             'room_004', TIMESTAMP_NTZ '2026-09-03 10:00:00', TIMESTAMP_NTZ '2026-09-03 13:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-25 10:00:00'),
  ('evt_003', 'Robotics Showcase',             'club_002', 'Robotics', 'Annual demo of student robotics projects',             'room_006', TIMESTAMP_NTZ '2026-08-20 14:00:00', TIMESTAMP_NTZ '2026-08-20 16:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-10 09:00:00'),
  ('evt_004', 'Robotics Intro Talk',           'club_002', 'Robotics', 'Info session for new members',                         NULL,       TIMESTAMP_NTZ '2026-09-10 11:00:00', TIMESTAMP_NTZ '2026-09-10 12:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-28 09:00:00'),
  ('evt_005', 'Photography Walk',              'club_003', 'Cultural', 'Sunrise photo walk around campus',                     NULL,       TIMESTAMP_NTZ '2026-09-04 07:00:00', TIMESTAMP_NTZ '2026-09-04 09:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-27 09:00:00'),
  ('evt_006', 'Career Fair Prep',              'club_004', 'Career',   'Resume and interview prep session',                    'room_002', TIMESTAMP_NTZ '2026-09-02 13:00:00', TIMESTAMP_NTZ '2026-09-02 15:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-20 09:00:00'),
  ('evt_007', 'Public Speaking Workshop',      'club_004', 'Workshop', 'Techniques for confident public speaking',             'room_001', TIMESTAMP_NTZ '2026-09-06 10:00:00', TIMESTAMP_NTZ '2026-09-06 12:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-22 09:00:00'),
  ('evt_008', 'Campus Sports Meet',            'club_005', 'Sports',   'Inter-department athletics meet',                      'room_006', TIMESTAMP_NTZ '2026-09-12 09:00:00', TIMESTAMP_NTZ '2026-09-12 17:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-15 09:00:00'),
  ('evt_009', 'Chess Club Legacy Tournament',  'club_006', 'Cultural', 'Final tournament before the club went inactive',       'room_003', TIMESTAMP_NTZ '2026-07-15 10:00:00', TIMESTAMP_NTZ '2026-07-15 13:00:00', 'scheduled', TIMESTAMP_NTZ '2026-07-01 09:00:00'),
  ('evt_010', 'Study Skills Workshop',         'club_001', 'Workshop', 'Cancelled due to a venue conflict',                    NULL,       TIMESTAMP_NTZ '2026-09-04 14:00:00', TIMESTAMP_NTZ '2026-09-04 16:00:00', 'cancelled', TIMESTAMP_NTZ '2026-08-29 09:00:00'),
  ('evt_011', 'Robotics Club Open Lab Hours',  'club_002', 'Robotics', 'Drop-in lab time for club members',                    'room_001', TIMESTAMP_NTZ '2026-09-06 14:00:00', TIMESTAMP_NTZ '2026-09-06 16:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-30 09:00:00'),
  ('evt_012', 'AI Club Peer Tutoring',         'club_001', 'Workshop', 'Peer-led tutoring session for intro ML coursework',    'room_007', TIMESTAMP_NTZ '2026-09-05 15:00:00', TIMESTAMP_NTZ '2026-09-05 17:00:00', 'scheduled', TIMESTAMP_NTZ '2026-08-31 09:00:00');

-- =============================================================================
-- room_bookings (10 rows)
-- bk_0008 is the cancelled booking for the cancelled evt_010 (room freed).
-- bk_0001 and bk_0009 demonstrate a room with two non-overlapping confirmed
-- bookings the same day is fine (room_001, 2026-09-06).
-- bk_0001 and bk_0010 demonstrate two different rooms confirmed-booked for the
-- exact same time window is fine (conflict logic is per-room, not global).
-- =============================================================================
INSERT INTO campus_companion.campus.room_bookings
  (booking_id, room_id, event_id, start_ts, end_ts, status, created_at) VALUES
  ('bk_0001', 'room_005', 'evt_001', TIMESTAMP_NTZ '2026-09-05 15:00:00', TIMESTAMP_NTZ '2026-09-05 17:00:00', 'confirmed', TIMESTAMP_NTZ '2026-09-01 09:05:00'),
  ('bk_0002', 'room_004', 'evt_002', TIMESTAMP_NTZ '2026-09-03 10:00:00', TIMESTAMP_NTZ '2026-09-03 13:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-25 10:05:00'),
  ('bk_0003', 'room_006', 'evt_003', TIMESTAMP_NTZ '2026-08-20 14:00:00', TIMESTAMP_NTZ '2026-08-20 16:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-10 09:05:00'),
  ('bk_0004', 'room_002', 'evt_006', TIMESTAMP_NTZ '2026-09-02 13:00:00', TIMESTAMP_NTZ '2026-09-02 15:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-20 09:05:00'),
  ('bk_0005', 'room_001', 'evt_007', TIMESTAMP_NTZ '2026-09-06 10:00:00', TIMESTAMP_NTZ '2026-09-06 12:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-22 09:05:00'),
  ('bk_0006', 'room_006', 'evt_008', TIMESTAMP_NTZ '2026-09-12 09:00:00', TIMESTAMP_NTZ '2026-09-12 17:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-15 09:05:00'),
  ('bk_0007', 'room_003', 'evt_009', TIMESTAMP_NTZ '2026-07-15 10:00:00', TIMESTAMP_NTZ '2026-07-15 13:00:00', 'confirmed', TIMESTAMP_NTZ '2026-07-01 09:05:00'),
  ('bk_0008', 'room_003', 'evt_010', TIMESTAMP_NTZ '2026-09-04 14:00:00', TIMESTAMP_NTZ '2026-09-04 16:00:00', 'cancelled', TIMESTAMP_NTZ '2026-08-29 09:05:00'),
  ('bk_0009', 'room_001', 'evt_011', TIMESTAMP_NTZ '2026-09-06 14:00:00', TIMESTAMP_NTZ '2026-09-06 16:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-30 09:05:00'),
  ('bk_0010', 'room_007', 'evt_012', TIMESTAMP_NTZ '2026-09-05 15:00:00', TIMESTAMP_NTZ '2026-09-05 17:00:00', 'confirmed', TIMESTAMP_NTZ '2026-08-31 09:05:00');

-- =============================================================================
-- teacher_timetable (19 rows across 6 teachers)
-- Prof. Rao (tt_0001/tt_0002): back-to-back boundary case on 2026-09-02 — one
--   entry ends at 15:00, the next starts at 15:00. Exercises the half-open
--   interval rule directly (see benchmarks/question_sql_pairs.md #9).
-- Prof. Iyer: fully free afternoon on 2026-09-02 (no entries after 12:00 that
--   day).
-- Dr. Sen: fully booked, back-to-back, 09:00-17:00 on 2026-09-02.
-- =============================================================================
INSERT INTO campus_companion.campus.teacher_timetable
  (entry_id, teacher_name, start_ts, end_ts, activity) VALUES
  ('tt_0001', 'Prof. Rao',       TIMESTAMP_NTZ '2026-09-02 13:00:00', TIMESTAMP_NTZ '2026-09-02 15:00:00', 'Teaching CS301'),
  ('tt_0002', 'Prof. Rao',       TIMESTAMP_NTZ '2026-09-02 15:00:00', TIMESTAMP_NTZ '2026-09-02 16:00:00', 'Faculty Meeting'),
  ('tt_0003', 'Prof. Rao',       TIMESTAMP_NTZ '2026-09-03 09:00:00', TIMESTAMP_NTZ '2026-09-03 10:00:00', 'Office Hours'),
  ('tt_0004', 'Prof. Rao',       TIMESTAMP_NTZ '2026-09-03 14:00:00', TIMESTAMP_NTZ '2026-09-03 15:00:00', 'Teaching CS302'),
  ('tt_0005', 'Prof. Iyer',      TIMESTAMP_NTZ '2026-09-02 09:00:00', TIMESTAMP_NTZ '2026-09-02 10:00:00', 'Teaching EE201'),
  ('tt_0006', 'Prof. Iyer',      TIMESTAMP_NTZ '2026-09-02 10:00:00', TIMESTAMP_NTZ '2026-09-02 12:00:00', 'Teaching EE202'),
  ('tt_0007', 'Prof. Iyer',      TIMESTAMP_NTZ '2026-09-04 09:00:00', TIMESTAMP_NTZ '2026-09-04 10:00:00', 'Faculty Meeting'),
  ('tt_0008', 'Prof. Nathan',    TIMESTAMP_NTZ '2026-09-02 11:00:00', TIMESTAMP_NTZ '2026-09-02 12:00:00', 'Teaching ME101'),
  ('tt_0009', 'Prof. Nathan',    TIMESTAMP_NTZ '2026-09-03 15:00:00', TIMESTAMP_NTZ '2026-09-03 16:00:00', 'Office Hours'),
  ('tt_0010', 'Prof. Nathan',    TIMESTAMP_NTZ '2026-09-05 10:00:00', TIMESTAMP_NTZ '2026-09-05 11:00:00', 'Teaching ME102'),
  ('tt_0011', 'Dr. Sen',         TIMESTAMP_NTZ '2026-09-02 09:00:00', TIMESTAMP_NTZ '2026-09-02 11:00:00', 'Teaching BT101'),
  ('tt_0012', 'Dr. Sen',         TIMESTAMP_NTZ '2026-09-02 11:00:00', TIMESTAMP_NTZ '2026-09-02 13:00:00', 'Teaching BT102'),
  ('tt_0013', 'Dr. Sen',         TIMESTAMP_NTZ '2026-09-02 13:00:00', TIMESTAMP_NTZ '2026-09-02 14:00:00', 'Faculty Meeting'),
  ('tt_0014', 'Dr. Sen',         TIMESTAMP_NTZ '2026-09-02 14:00:00', TIMESTAMP_NTZ '2026-09-02 16:00:00', 'Teaching BT103'),
  ('tt_0015', 'Dr. Sen',         TIMESTAMP_NTZ '2026-09-02 16:00:00', TIMESTAMP_NTZ '2026-09-02 17:00:00', 'Office Hours'),
  ('tt_0016', 'Prof. Kulkarni',  TIMESTAMP_NTZ '2026-09-03 10:00:00', TIMESTAMP_NTZ '2026-09-03 12:00:00', 'Teaching CE201'),
  ('tt_0017', 'Prof. Kulkarni',  TIMESTAMP_NTZ '2026-09-04 13:00:00', TIMESTAMP_NTZ '2026-09-04 14:00:00', 'Office Hours'),
  ('tt_0018', 'Dr. Fernandes',   TIMESTAMP_NTZ '2026-09-02 10:00:00', TIMESTAMP_NTZ '2026-09-02 11:00:00', 'Teaching CS201'),
  ('tt_0019', 'Dr. Fernandes',   TIMESTAMP_NTZ '2026-09-05 09:00:00', TIMESTAMP_NTZ '2026-09-05 10:00:00', 'Teaching CS202');

-- =============================================================================
-- event_attendance (47 rows)
-- evt_001 (AI Workshop) = exactly 5 rows -> the live-demo event, easily
--   recountable "+1 on submit" (includes 1 unmatched/guest registrant).
-- evt_002 includes a genuine duplicate: stu_0002 registers twice for the same
--   event (same registrant_email + event_id) — intentionally not suppressed.
-- evt_003 = 16 rows -> the "high attendance (15+)" event.
-- evt_005 = 2 rows -> the "low attendance (1-2)" event.
-- evt_004 and evt_010 = 0 rows -> the "zero attendance" events.
-- stu_0001, stu_0002, stu_0006, stu_0009, stu_0014, stu_0019 each attend 2+
--   distinct events -> "students attending multiple events".
-- =============================================================================
INSERT INTO campus_companion.campus.event_attendance
  (attendance_id, event_id, student_id, registrant_name, registrant_email, registered_at, source) VALUES
  -- evt_001: AI Workshop (5 rows; 3 Computer Science majors; 1 unmatched guest)
  ('att_0001', 'evt_001', 'stu_0001', 'Aditi Sharma',    'aditi.sharma@campus.edu',     TIMESTAMP_NTZ '2026-09-01 10:15:00', 'google_form'),
  ('att_0002', 'evt_001', 'stu_0009', 'Ananya Menon',    'ananya.menon@campus.edu',     TIMESTAMP_NTZ '2026-09-01 11:00:00', 'google_form'),
  ('att_0003', 'evt_001', 'stu_0013', 'Ritika Bose',     'ritika.bose@campus.edu',      TIMESTAMP_NTZ '2026-09-02 09:30:00', 'google_form'),
  ('att_0004', 'evt_001', 'stu_0004', 'Karan Mehta',     'karan.mehta@campus.edu',      TIMESTAMP_NTZ '2026-09-02 14:00:00', 'google_form'),
  ('att_0005', 'evt_001', NULL,       'Guest Visitor',   'guest.visitor@example.edu',   TIMESTAMP_NTZ '2026-09-02 16:45:00', 'google_form'),

  -- evt_002: Robotics Bootcamp (5 rows; att_0006/att_0007 are an intentional duplicate registration)
  ('att_0006', 'evt_002', 'stu_0002', 'Rohan Verma',     'rohan.verma@campus.edu',      TIMESTAMP_NTZ '2026-08-26 09:00:00', 'seed'),
  ('att_0007', 'evt_002', 'stu_0002', 'Rohan Verma',     'rohan.verma@campus.edu',      TIMESTAMP_NTZ '2026-08-27 10:00:00', 'seed'),
  ('att_0008', 'evt_002', 'stu_0006', 'Arjun Das',       'arjun.das@campus.edu',        TIMESTAMP_NTZ '2026-08-27 11:00:00', 'seed'),
  ('att_0009', 'evt_002', 'stu_0014', 'Siddharth Rao',   'siddharth.rao@campus.edu',    TIMESTAMP_NTZ '2026-08-28 09:00:00', 'seed'),
  ('att_0010', 'evt_002', 'stu_0019', 'Tanya Desai',     'tanya.desai@campus.edu',      TIMESTAMP_NTZ '2026-08-29 09:00:00', 'seed'),

  -- evt_003: Robotics Showcase (16 rows — high attendance, 15+)
  ('att_0011', 'evt_003', 'stu_0003', 'Priya Nair',      'priya.nair@campus.edu',       TIMESTAMP_NTZ '2026-08-14 09:00:00', 'seed'),
  ('att_0012', 'evt_003', 'stu_0004', 'Karan Mehta',     'karan.mehta@campus.edu',      TIMESTAMP_NTZ '2026-08-14 09:05:00', 'seed'),
  ('att_0013', 'evt_003', 'stu_0005', 'Sneha Iyer',      'sneha.iyer@campus.edu',       TIMESTAMP_NTZ '2026-08-14 09:10:00', 'seed'),
  ('att_0014', 'evt_003', 'stu_0006', 'Arjun Das',       'arjun.das@campus.edu',        TIMESTAMP_NTZ '2026-08-15 09:00:00', 'seed'),
  ('att_0015', 'evt_003', 'stu_0007', 'Neha Kapoor',     'neha.kapoor@campus.edu',      TIMESTAMP_NTZ '2026-08-15 09:05:00', 'seed'),
  ('att_0016', 'evt_003', 'stu_0008', 'Vikram Rao',      'vikram.rao@campus.edu',       TIMESTAMP_NTZ '2026-08-15 09:10:00', 'seed'),
  ('att_0017', 'evt_003', 'stu_0009', 'Ananya Menon',    'ananya.menon@campus.edu',     TIMESTAMP_NTZ '2026-08-16 09:00:00', 'seed'),
  ('att_0018', 'evt_003', 'stu_0010', 'Aditya Joshi',    'aditya.joshi@campus.edu',     TIMESTAMP_NTZ '2026-08-16 09:05:00', 'seed'),
  ('att_0019', 'evt_003', 'stu_0011', 'Divya Pillai',    'divya.pillai@campus.edu',     TIMESTAMP_NTZ '2026-08-16 09:10:00', 'seed'),
  ('att_0020', 'evt_003', 'stu_0012', 'Manish Gupta',    'manish.gupta@campus.edu',     TIMESTAMP_NTZ '2026-08-17 09:00:00', 'seed'),
  ('att_0021', 'evt_003', 'stu_0013', 'Ritika Bose',     'ritika.bose@campus.edu',      TIMESTAMP_NTZ '2026-08-17 09:05:00', 'seed'),
  ('att_0022', 'evt_003', 'stu_0014', 'Siddharth Rao',   'siddharth.rao@campus.edu',    TIMESTAMP_NTZ '2026-08-17 09:10:00', 'seed'),
  ('att_0023', 'evt_003', 'stu_0015', 'Kavya Reddy',     'kavya.reddy@campus.edu',      TIMESTAMP_NTZ '2026-08-18 09:00:00', 'seed'),
  ('att_0024', 'evt_003', 'stu_0016', 'Farhan Ali',      'farhan.ali@campus.edu',       TIMESTAMP_NTZ '2026-08-18 09:05:00', 'seed'),
  ('att_0025', 'evt_003', 'stu_0017', 'Meera Krishnan',  'meera.krishnan@campus.edu',   TIMESTAMP_NTZ '2026-08-19 09:00:00', 'seed'),
  ('att_0026', 'evt_003', 'stu_0018', 'Ishaan Kapoor',   'ishaan.kapoor@campus.edu',    TIMESTAMP_NTZ '2026-08-19 09:05:00', 'seed'),

  -- evt_004: Robotics Intro Talk — 0 rows (zero-attendance event)

  -- evt_005: Photography Walk (2 rows — low attendance, 1-2)
  ('att_0027', 'evt_005', 'stu_0003', 'Priya Nair',      'priya.nair@campus.edu',       TIMESTAMP_NTZ '2026-08-30 08:00:00', 'seed'),
  ('att_0028', 'evt_005', 'stu_0016', 'Farhan Ali',      'farhan.ali@campus.edu',       TIMESTAMP_NTZ '2026-09-01 08:00:00', 'seed'),

  -- evt_006: Career Fair Prep (4 rows)
  ('att_0029', 'evt_006', 'stu_0005', 'Sneha Iyer',      'sneha.iyer@campus.edu',       TIMESTAMP_NTZ '2026-08-25 09:00:00', 'seed'),
  ('att_0030', 'evt_006', 'stu_0010', 'Aditya Joshi',    'aditya.joshi@campus.edu',     TIMESTAMP_NTZ '2026-08-26 09:00:00', 'seed'),
  ('att_0031', 'evt_006', 'stu_0015', 'Kavya Reddy',     'kavya.reddy@campus.edu',      TIMESTAMP_NTZ '2026-08-27 09:00:00', 'seed'),
  ('att_0032', 'evt_006', 'stu_0020', 'Yash Malhotra',   'yash.malhotra@campus.edu',    TIMESTAMP_NTZ '2026-08-28 09:00:00', 'seed'),

  -- evt_007: Public Speaking Workshop (3 rows)
  ('att_0033', 'evt_007', 'stu_0007', 'Neha Kapoor',     'neha.kapoor@campus.edu',      TIMESTAMP_NTZ '2026-08-23 09:00:00', 'seed'),
  ('att_0034', 'evt_007', 'stu_0011', 'Divya Pillai',    'divya.pillai@campus.edu',     TIMESTAMP_NTZ '2026-08-24 09:00:00', 'seed'),
  ('att_0035', 'evt_007', 'stu_0018', 'Ishaan Kapoor',   'ishaan.kapoor@campus.edu',    TIMESTAMP_NTZ '2026-08-25 09:00:00', 'seed'),

  -- evt_008: Campus Sports Meet (5 rows; stu_0006/stu_0019 attending a 2nd distinct event)
  ('att_0036', 'evt_008', 'stu_0008', 'Vikram Rao',      'vikram.rao@campus.edu',       TIMESTAMP_NTZ '2026-08-16 09:00:00', 'seed'),
  ('att_0037', 'evt_008', 'stu_0012', 'Manish Gupta',    'manish.gupta@campus.edu',     TIMESTAMP_NTZ '2026-08-17 09:00:00', 'seed'),
  ('att_0038', 'evt_008', 'stu_0017', 'Meera Krishnan',  'meera.krishnan@campus.edu',   TIMESTAMP_NTZ '2026-08-18 09:00:00', 'seed'),
  ('att_0039', 'evt_008', 'stu_0006', 'Arjun Das',       'arjun.das@campus.edu',        TIMESTAMP_NTZ '2026-08-19 09:00:00', 'seed'),
  ('att_0040', 'evt_008', 'stu_0019', 'Tanya Desai',     'tanya.desai@campus.edu',      TIMESTAMP_NTZ '2026-08-20 09:00:00', 'seed'),

  -- evt_009: Chess Club Legacy Tournament (3 rows, past, now-inactive club)
  ('att_0041', 'evt_009', 'stu_0010', 'Aditya Joshi',    'aditya.joshi@campus.edu',     TIMESTAMP_NTZ '2026-07-10 09:00:00', 'seed'),
  ('att_0042', 'evt_009', 'stu_0015', 'Kavya Reddy',     'kavya.reddy@campus.edu',      TIMESTAMP_NTZ '2026-07-10 09:05:00', 'seed'),
  ('att_0043', 'evt_009', 'stu_0018', 'Ishaan Kapoor',   'ishaan.kapoor@campus.edu',    TIMESTAMP_NTZ '2026-07-10 09:10:00', 'seed'),

  -- evt_010: Study Skills Workshop — 0 rows (cancelled event, zero-attendance)

  -- evt_011: Robotics Club Open Lab Hours (2 rows; both attending a 2nd distinct event)
  ('att_0044', 'evt_011', 'stu_0002', 'Rohan Verma',     'rohan.verma@campus.edu',      TIMESTAMP_NTZ '2026-09-01 09:00:00', 'seed'),
  ('att_0045', 'evt_011', 'stu_0014', 'Siddharth Rao',   'siddharth.rao@campus.edu',    TIMESTAMP_NTZ '2026-09-01 09:05:00', 'seed'),

  -- evt_012: AI Club Peer Tutoring (2 rows; both attending a 2nd distinct event)
  ('att_0046', 'evt_012', 'stu_0001', 'Aditi Sharma',    'aditi.sharma@campus.edu',     TIMESTAMP_NTZ '2026-09-01 12:00:00', 'seed'),
  ('att_0047', 'evt_012', 'stu_0009', 'Ananya Menon',    'ananya.menon@campus.edu',     TIMESTAMP_NTZ '2026-09-01 12:05:00', 'seed');

-- =============================================================================
-- Sanity checks — run manually after seeding.
-- =============================================================================
-- SELECT 'clubs' t, count(*) n FROM campus_companion.campus.clubs
-- UNION ALL SELECT 'students', count(*) FROM campus_companion.campus.students
-- UNION ALL SELECT 'rooms', count(*) FROM campus_companion.campus.rooms
-- UNION ALL SELECT 'events', count(*) FROM campus_companion.campus.events
-- UNION ALL SELECT 'room_bookings', count(*) FROM campus_companion.campus.room_bookings
-- UNION ALL SELECT 'teacher_timetable', count(*) FROM campus_companion.campus.teacher_timetable
-- UNION ALL SELECT 'event_attendance', count(*) FROM campus_companion.campus.event_attendance;
-- Expected: clubs=6, students=20, rooms=9, events=12, room_bookings=10,
--           teacher_timetable=19, event_attendance=47.
