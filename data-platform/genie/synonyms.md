# Genie Space Synonyms

Reference for the Genie Space's **Synonyms** configuration, per
`context/genie.md`'s Trusted Assets / Tuning: "Synonyms (required): map the
informal terms students actually use to the canonical schema." Each row below
maps an informal term to the exact canonical value it must resolve to.
Synonyms are seed-data-specific where noted — a change to `02_seed_data.sql`
(a renamed club, room, or teacher) requires updating the matching row here,
per `context/genie.md`'s Synthetic Data section.

Configure these in the Genie Space's synonym/glossary UI (or equivalent
column-level "synonyms" field in Unity Catalog if the workspace supports it)
after pasting `instructions.md` and before running the benchmark set.

## Room availability

| Informal term | Canonical meaning |
|---|---|
| "free room" / "available room" / "open room" | A room with `room_is_free(room_id, ts) = true` at the query instant |
| "lab" | `rooms.type = 'lab'` |
| "classroom" / "lecture room" | `rooms.type = 'classroom'` |
| "auditorium" / "hall" (large-venue sense) | `rooms.type = 'auditorium'` |
| "study room" / "study space" / "quiet room" | `rooms.type = 'study_room'` |

## Teachers

| Informal term | Canonical meaning |
|---|---|
| "prof" / "professor" / "teacher" / "faculty" | `teacher_timetable.teacher_name` |
| "Prof. Rao" / "Professor Rao" / "Rao" | `teacher_timetable.teacher_name = 'Prof. Rao'` — always the exact seeded spelling, never a variant |
| "Prof. Iyer" / "Professor Iyer" / "Iyer" | `teacher_timetable.teacher_name = 'Prof. Iyer'` |
| "Prof. Nathan" / "Professor Nathan" / "Nathan" | `teacher_timetable.teacher_name = 'Prof. Nathan'` |
| "Dr. Sen" / "Sen" | `teacher_timetable.teacher_name = 'Dr. Sen'` |
| "Prof. Kulkarni" / "Professor Kulkarni" / "Kulkarni" | `teacher_timetable.teacher_name = 'Prof. Kulkarni'` |
| "Dr. Fernandes" / "Fernandes" | `teacher_timetable.teacher_name = 'Dr. Fernandes'` |
| "free" / "available" / "not busy" (of a teacher) | `teacher_is_free(teacher_name, T)` per `data-contracts.md` — no occupying `teacher_timetable` row at instant T |

## Academic majors

| Informal term | Canonical meaning |
|---|---|
| "CS" / "comp sci" / "computer science" | `students.major = 'Computer Science'` |
| "EC" / "electronics" | `students.major = 'Electronics'` |
| "mech" / "mechanical" | `students.major = 'Mechanical'` |
| "civil" | `students.major = 'Civil'` |
| "biotech" / "biotechnology" | `students.major = 'Biotechnology'` |

## Clubs (as seeded — see `02_seed_data.sql`)

| Informal term | Canonical meaning |
|---|---|
| "AI club" / "the AI society" / "AI" (club sense) | `clubs.name = 'AI Club'` (`club_001`) |
| "robotics club" / "robotics" (club sense) | `clubs.name = 'Robotics Club'` (`club_002`) |
| "photo club" / "photography club" | `clubs.name = 'Photography Club'` (`club_003`) |
| "debate club" / "debate society" | `clubs.name = 'Debate Society'` (`club_004`) |
| "sports club" / "athletics club" | `clubs.name = 'Campus Sports Club'` (`club_005`) |
| "chess club" | `clubs.name = 'Chess Club'` (`club_006`, currently inactive) |

## Events / topics

| Informal term | Canonical meaning |
|---|---|
| "attending" / "registered" / "signed up" | `event_attendance` row count for the event (raw `attendance_count`, duplicates included, unless "unique"/"distinct" is specified) |
| "AI event(s)" | `events.topic = 'AI'` |
| "robotics event(s)" | `events.topic = 'Robotics'` |
| "career event(s)" / "career fair" | `events.topic = 'Career'` |
| "cultural event(s)" | `events.topic = 'Cultural'` |
| "sports event(s)" | `events.topic = 'Sports'` |
| "workshop(s)" | `events.topic = 'Workshop'` |
| "happening" / "on" / "coming up" | `events.status = 'scheduled'` (default framing — excludes `cancelled` unless the question is explicitly historical) |

## Time

| Informal term | Canonical meaning |
|---|---|
| "today" | Current campus-local calendar date |
| "right now" / "currently" | Current campus-local timestamp |
| "this week" | Current campus-local Monday-Sunday calendar week |
| "tomorrow" | Current campus-local calendar date + 1 day |
