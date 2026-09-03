# V2 Genie Benchmark Question/SQL Pairs

V2 benchmark questions covering Event Detail, Campus Pulse, Analytics (Overview, Events, Rooms, Clubs), Activity, Genie -> Action shapes, and Internships against the seed data in `data-platform/notebooks/02_seed_data.sql`.

Reference base date: **2026-09-02**.

---

## A. Event Detail & Actions

### 1. "Tell me about the AI Workshop"
```sql
SELECT e.event_id, e.name, c.name AS club, r.name AS room, e.start_ts, e.end_ts, e.topic, e.description, e.status,
       (SELECT COUNT(*) FROM campus_companion.campus.event_attendance a WHERE a.event_id = e.event_id) AS attendance_count
FROM campus_companion.campus.events e
JOIN campus_companion.campus.clubs c ON c.club_id = e.club_id
LEFT JOIN campus_companion.campus.rooms r ON r.room_id = e.room_id
WHERE e.event_id = 'evt_001' OR LOWER(e.name) LIKE '%ai workshop%';
```
**Expected result:** Event ID `evt_001`, Club `AI Club`, Room `Lab 204`, 42 registered attendees.

---

## B. Campus Pulse

### 2. "What's happening on campus right now?"
```sql
SELECT e.event_id, e.name, c.name AS club, r.name AS room, e.start_ts, e.end_ts
FROM campus_companion.campus.events e
JOIN campus_companion.campus.clubs c ON c.club_id = e.club_id
LEFT JOIN campus_companion.campus.rooms r ON r.room_id = e.room_id
WHERE e.status != 'cancelled' AND e.start_ts <= TIMESTAMP_NTZ '2026-09-02 14:00:00' AND TIMESTAMP_NTZ '2026-09-02 14:00:00' < e.end_ts;
```

---

## C. Operational Analytics

### 3. "Which events have the highest attendance?"
```sql
SELECT e.event_id, e.name, COUNT(a.attendance_id) AS attendance_count
FROM campus_companion.campus.events e
LEFT JOIN campus_companion.campus.event_attendance a ON a.event_id = e.event_id
WHERE e.status != 'cancelled'
GROUP BY e.event_id, e.name
ORDER BY attendance_count DESC;
```
**Expected result:** AI Workshop (`evt_001`, 42 attendees), Robotics Demo Day (`evt_002`, 18 attendees). Total registrations in seed data = 47. Exactly 2 zero-attendance events (`evt_004`, `evt_010`).

### 4. "What is our room utilization and peak booking hour?"
```sql
SELECT hour(b.start_ts) AS peak_hour, COUNT(*) AS booking_count
FROM campus_companion.campus.room_bookings b
JOIN campus_companion.campus.events e ON e.event_id = b.event_id
WHERE b.status = 'confirmed' AND e.status != 'cancelled'
GROUP BY hour(b.start_ts)
ORDER BY booking_count DESC;
```
**Expected result:** Peak booking hour is 10:00 (3 bookings).

---

## D. Internships

### 5. "What open internships are available?"
```sql
SELECT internship_id, company_name, role_title, location, stipend, eligibility, deadline_ts
FROM campus_companion.campus.internships
WHERE status = 'open'
ORDER BY deadline_ts ASC;
```
**Expected result:** 5 open internships returned (Databricks, Google, etc.).
