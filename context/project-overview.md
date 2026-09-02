# Project Overview

## About the Project

Campus Companion is a campus information assistant that lets students and campus
stakeholders ask everyday campus questions in plain English and receive answers grounded
in real, governed campus data — instead of digging through portals, PDFs, or WhatsApp
groups. Alongside the question-answering experience, the product provides a
newsletter-style view that surfaces campus events, room availability, and live updates at
a glance, and a governed way for authorised users (club heads and student council) to
create events and book rooms.

At the product level, Genie is the reasoning and query layer of the product. It is the
mechanism by which a natural-language question typed by a user becomes a query over
governed campus data and returns a precise, grounded, explainable answer. Genie is not a
bolt-on chatbot feature — it is the primary way users interact with campus data throughout
the product, both in a dedicated question-asking surface and in answering the questions
the newsletter view implicitly represents (what's on, what's free, who's available).

The central value the product provides is this: any campus question that has an answer
sitting somewhere in campus data should be answerable in seconds, at any hour, without a
human intermediary, and the user should be able to trust the answer because its data
origin is visible.

---

## The Problem It Solves

Campus information today is scattered across separate portals, static PDFs, and informal
channels like WhatsApp groups. A student who wants to know which study rooms are free
right now, whether a professor is available this afternoon, what events are happening this
week, or how many people have registered for a workshop has no single place to ask and no
guarantee of a fast answer. Existing campus tools are either static (a portal that only
shows what its designer anticipated) or slow (an email or office visit that takes hours or
days to resolve).

This creates a specific, everyday gap: a student's question is usually simple and has a
factual answer that already exists in some system, but there is no interface that can
take an arbitrary plain-English question and resolve it against real campus data on the
spot. Campus Companion closes that specific gap — it does not attempt to replace the
underlying campus systems, only to make their data instantly and conversationally
queryable, and to make a small set of common write actions (booking a room, registering
attendance, creating an event) go through the same governed data source the questions are
answered from.

---

## Target Users

**Primary user: Student**
Who they are: any student on campus, most commonly a first-year or new student who does
not yet know where campus information lives.
What they need: fast, reliable answers to everyday campus questions (room availability,
teacher availability, upcoming events, attendance numbers) without navigating multiple
systems or waiting on a reply.
What they should be able to accomplish: ask a campus question in plain English and get a
grounded answer; browse a single view of upcoming events and current availability; register
for an event and see that their registration is reflected immediately.

**Secondary user: Club head / Student council member**
Who they are: a student with elevated responsibility for organising events and clubs.
What they need: a way to book rooms and create or edit events without going through a
manual, offline administrative process, while their changes remain visible to the same
governed data other users query against.
What they should be able to accomplish: create an event, book a room for it, and have
that change immediately reflected in what Genie and the newsletter view show to everyone
else.

Teachers and general campus administrators are represented in the product only as data
subjects (their timetable is queried) in this hackathon scope. They are not active users
of the product for this implementation — see Features Out of Scope.

---

## Product Boundaries

Campus Companion **is**:
- A natural-language question-answering experience over a small, defined set of governed
  campus data (events, attendance, room bookings, teacher timetables, clubs, students).
- A lightweight newsletter-style view that summarises that same data for browsing.
- A governed, role-restricted way for club heads/council to create events and book rooms.
- A live demonstration of a real, working ingestion loop: a registration submitted through
  a form updates the underlying data, and that update is immediately reflected in what the
  product shows and what Genie answers.

Campus Companion **is not**:
- A general-purpose campus management system (it does not manage courses, grades,
  admissions, finance, or facilities beyond rooms/events/attendance).
- A generic AI chatbot capable of answering arbitrary non-campus questions.
- A full identity/authentication platform. Role distinction (student vs. club
  head/council) is a product concept, not a security system to be engineered here.
- A personalization engine that tailors answers to an individual's academic history, major,
  or year.
- A mobile app, notification system, or multi-campus product.
- A system of record — it queries and lightly extends existing-style campus data, it does
  not aim to become the canonical source of truth for the institution.

---

## Pages and User Surfaces

**1. Newsletter Home**
- Purpose: give any user a single, at-a-glance view of what's happening on campus — events,
  live attendance counts for events, and current room availability.
- Primary user: student.
- Key capabilities: browse upcoming events; see attendance/registration counts update live;
  see a snapshot of room availability; find the entry point to ask Genie a question or
  register for an event.

**2. Ask Genie**
- Purpose: the dedicated natural-language question-answering surface.
- Primary user: student (also usable by club heads/council for the same purpose).
- Key capabilities: type a free-form campus question; receive a grounded natural-language
  answer; see the data/SQL basis of the answer for transparency; ask follow-up questions
  such as room availability at a specific time or a specific teacher's availability.

**3. Event Registration (Google Form)**
- Purpose: let a student register/check in for an event, which drives the live-updating
  data demo.
- Primary user: student.
- Key capabilities: reach the registration form from an event shown in the Newsletter Home
  or from a Genie answer; submit the form; trigger an update to the underlying attendance
  data.

**4. Council/Club Admin Panel**
- Purpose: give authorised users a governed way to create events and book rooms.
- Primary user: club head / student council member.
- Key capabilities: create a new event; book a room for an event, subject to existing
  bookings; edits are restricted to the authorised role and are reflected in the same data
  Genie and the newsletter query.

---

## Navigation

The Newsletter Home is the landing surface for all users. From it, a user can move to Ask
Genie to ask a specific question, or select an event to reach its Event Registration form.
A user recognised as (or who identifies as) a club head/council member can additionally
reach the Council/Club Admin Panel, either from the Newsletter Home or a persistent
navigation element. There is no deep multi-level navigation: the product is intentionally
a small set of flat, directly reachable surfaces rather than a nested application.

---

## Core User Flows

**1. Ask a campus question**
1. The user starts from Ask Genie (or a prompt on the Newsletter Home).
2. The user types a plain-English campus question (e.g. "Which labs are free at 3pm?").
3. The system routes the question through Genie against the governed campus data and
   composes a grounded answer, along with the query/data basis for that answer.
4. The user receives a direct, specific answer (not a generic response) with visibility
   into where it came from.
5. The user may ask a follow-up question or return to Newsletter Home.

**2. Check room availability**
1. The user asks (via Ask Genie) whether a specific room/lab type is free, optionally at a
   specific time.
2. Genie checks current room bookings against the requested room/time.
3. The system returns the specific rooms that are free (or confirms none are).
4. The user can use this answer to decide where to go or, if authorised, to book that room.

**3. Check teacher availability**
1. The user asks whether a specific teacher is free at a specific time.
2. Genie checks the teacher timetable data for that teacher and time.
3. The system returns a direct yes/no with the relevant schedule context.
4. The user proceeds with that information (e.g. deciding when to visit).

**4. Register for an event / live attendance update (core demo loop)**
1. The user finds an event on the Newsletter Home or via a Genie answer and opens its
   registration form.
2. The user fills in the Google Form and submits.
3. The submission updates the underlying attendance data for that event.
4. Without manual refresh of the underlying data, the Newsletter Home and any subsequent
   Genie question about that event's attendance reflect the new count.
5. The loop can be repeated to visibly demonstrate the count rising in real time.

**5. Club head/council books a room or creates an event (governed write)**
1. An authorised user opens the Council/Club Admin Panel.
2. The user provides the details of a new event, or selects a room and time to book.
3. The system checks the action is permitted for that room/time (no conflicting booking)
   and applies the change to the governed data.
4. The user receives confirmation that the booking/event now exists.
5. The change is immediately visible to Genie queries and the Newsletter Home for all
   users — e.g. that room now shows as unavailable, or the new event appears.

**6. Browse the newsletter view**
1. The user opens the Newsletter Home.
2. The system presents current events, live attendance figures, and a room-availability
   snapshot drawn from the same governed data Genie uses.
3. The user scans this view without needing to ask a specific question.
4. The user may proceed into any of the other flows above (ask a follow-up question,
   register for an event, or, if authorised, make a booking).

---

## Product Capabilities

**Natural-language campus Q&A (Core)**
- What it does: answers arbitrary, plain-English campus questions grounded in governed
  data.
- Who uses it: students primarily; also club heads/council.
- Why it exists: it is the central value proposition of the product — replacing scattered,
  slow lookups with instant, trustworthy answers.

**Room availability lookup (Core)**
- What it does: answers "is this room/type of room free" questions, including at a
  specific time.
- Who uses it: students (to find a place to study/work) and club heads/council (as a
  precursor to booking).
- Why it exists: named explicitly as one of the flagship questions the product must answer,
  and it underpins the booking flow.

**Teacher availability lookup (Core)**
- What it does: answers "is this teacher free at this time" questions from timetable data.
- Who uses it: students.
- Why it exists: named explicitly as one of the flagship questions the product must answer.

**Live attendance tracking via event registration (Core)**
- What it does: lets a student register for an event through a form, updating attendance
  data that is then immediately queryable and visible.
- Who uses it: students (registering); everyone (seeing the resulting count).
- Why it exists: this is the product's proof that it is a real, working, self-updating data
  pipeline rather than a static demo — it is the centerpiece of the live demonstration.

**Newsletter-style overview (Supporting)**
- What it does: presents events, attendance, and room availability in a single browsable
  view without requiring a question to be asked.
- Who uses it: all users, especially as an entry point.
- Why it exists: not every user need is a specific question; some users just want to scan
  what's currently true on campus.

**Role-based booking and event creation (Supporting)**
- What it does: lets club heads/council create events and book rooms, with changes
  reflected in the same governed data everyone else queries.
- Who uses it: club heads/student council.
- Why it exists: the product isn't only about reading campus data — a small, clearly
  bounded write capability shows the data source is live and governed, not just read-only
  reference data, and it is explicitly requested project functionality.

**Answer transparency / grounding display (Supporting)**
- What it does: shows the data or query basis behind a Genie answer, so the user (or a
  judge) can see the answer is not invented.
- Who uses it: any user of Ask Genie, especially during the demo.
- Why it exists: distinguishes the product from a generic chatbot and is central to the
  "grounded, not guessed" positioning of the project.

**Multi-step/agentic reasoning across data sources (Optional)**
- What it does: answers more complex questions that require combining multiple tables/steps
  (e.g. cross-referencing events and rooms in one answer) beyond the single-lookup
  questions above.
- Who uses it: any user, opportunistically.
- Why it exists: strengthens the demo if time allows but is not required for the product to
  demonstrate its core value.

---

## Data at the Product Level

The product needs to understand the following categories of campus information, at a
conceptual level:

- **Clubs**: the organisations that run events on campus.
- **Events**: what is happening, when, run by which club, and what it's about — the basis
  for both the newsletter view and event-related questions.
- **Event attendance/registration**: how many people (and, implicitly, who) have registered
  for or attended a given event — the data that the live registration loop updates.
- **Rooms**: the physical spaces (including labs) that can be queried for availability and
  booked.
- **Room bookings**: which room is reserved by whom, for what event, and during what time
  window — the basis for availability questions and for detecting booking conflicts.
- **Teacher timetable**: when a given teacher is scheduled to be occupied, which allows the
  system to infer availability.
- **Students**: the population asking questions and registering for events; only the
  minimal identity needed to support registration and role distinction (student vs.
  club head/council) is required.

These categories exist to support the flows above — the product's need for data is defined
entirely by the questions it must answer and the writes it must support, not by a general
desire to represent the campus.

---

## Databricks / Genie Role

Genie is the component that lets a user's plain-English campus question become a precise
answer over governed data. Product-level responsibilities of Genie:

- Genie enables the "ask anything" experience: a user does not need to know what data
  exists, how it's structured, or how to query it — they simply ask.
- Genie is what makes the answers trustworthy: because it queries governed, curated campus
  data rather than a general knowledge source, its answers are current and specific to this
  campus, not generic or hallucinated.
- Genie is expected to support, at minimum, the flagship question types the product is
  built around: room availability (optionally at a specific time), teacher availability,
  what events are happening (and when), and how many people are registered/attending a
  given event.
- Genie's answers should be explainable — the product surfaces enough of the underlying
  query/data basis that a user can see the answer is grounded, which is core to the
  product's trust proposition.
- Governed data matters because it is what separates this product from a generic chatbot:
  the campus data is the source of truth, access to it is controlled, and Genie only
  answers from what it is permitted to see.

What Genie is not responsible for: Genie does not perform the governed writes (room
bookings, event creation, attendance registration) — those happen through the product's own
booking/registration flows and are simply reflected in the data Genie subsequently reads.
Genie is not responsible for authentication, role enforcement, or UI presentation; it is
the answer-generation layer, not the whole product.

---

## Features In Scope

**MUST HAVE**
- Natural-language question answering over campus data via Genie, covering at minimum:
  room availability, teacher availability, and event attendance counts.
- Visible grounding/basis for Genie's answers (the data or query behind the answer is shown
  to the user).
- Event registration via a Google Form that updates underlying attendance data.
- The live-update loop: a new registration is reflected in subsequent Genie answers and/or
  the newsletter view without manual data reload.
- A newsletter-style view showing current events and room availability.
- Role-restricted room booking and event creation for club heads/student council.

**SHOULD HAVE**
- A dedicated Ask Genie chat-style surface embedded in the product's own frontend (rather
  than relying solely on a Databricks-native UI for the demo).
- Conflict prevention on room bookings (a room already booked for a given time cannot be
  double-booked through the Admin Panel).
- A simple, low-friction way to distinguish a club head/council user from a general student
  user when using the Admin Panel.

**OPTIONAL**
- Multi-step/agentic Genie answers that combine more than one data source in a single
  response.
- Visual charts/graphs of data (e.g. attendance over time) in the newsletter view.
- Editing of existing events/bookings (beyond creating new ones) in the Admin Panel.
- A visible audit trail of governed writes shown in the UI.

---

## Features Out of Scope

The following must not be implemented during this hackathon:

- SIS/LMS integration or any personalization based on a student's major, year, or academic
  record.
- General user account creation, login/authentication systems, or password management.
- Notifications, alerts, reminders, or any push/email/SMS functionality.
- A native mobile application.
- Support for additional campuses or any multi-tenant capability.
- Sensor-based or IoT-based real-time occupancy tracking.
- General-purpose chatbot behaviour unrelated to campus data (the assistant should not
  attempt to answer arbitrary non-campus questions).
- Course catalog, grading, admissions, financial, or HR functionality of any kind.
- Historical trend analysis, forecasting, or reporting dashboards beyond the newsletter
  snapshot view.
- Any data source or table not already implied by the categories in "Data at the Product
  Level."
- Editing/administrative capability for teacher timetables (the timetable is read-only
  source data in this product).

---

## Success Criteria

1. A user can type a free-form question like "which labs are free at 3pm?" into Ask Genie
   and receive a specific, correct answer drawn from live data.
2. A user can ask whether a named teacher is free at a given time and receive a direct
   answer based on the timetable data.
3. A user can ask how many people are registered/attending a specific event and get an
   accurate current count.
4. Submitting the event registration Google Form results in the attendance count changing,
   observably, without any manual data reload — visible either via a repeat Genie question
   or the newsletter view.
5. Genie's answers are accompanied by visible evidence of their data/query basis, not just
   a bare text answer.
6. The Newsletter Home displays current events and room availability drawn from the same
   underlying data Genie queries.
7. A club head/council user can book a room and/or create an event through the Admin Panel,
   and that action is reflected in subsequent room-availability answers and the newsletter
   view.
8. A student user cannot perform the club head/council write actions (booking/creating
   events) through the same interface a general student uses.
9. The entire loop — ask a question, register for an event, see the update, make a governed
   booking — can be demonstrated live, end-to-end, without fabricated or pre-staged data.

---

## Product Invariants

- Genie remains the mechanism for all natural-language campus question answering; no
  question-answering surface should bypass it with hardcoded or scripted responses.
- Every answer Genie gives must be grounded in the product's governed campus data and must
  expose its data/query basis to the user.
- Only club heads/student council may perform governed write actions (room booking, event
  creation); general students may only read/query and register for events.
- A write made through the Admin Panel or the event registration form must be immediately
  reflected in what Genie and the Newsletter Home present — there is no separate, stale copy
  of the data.
- The product's scope is limited to the data categories defined in "Data at the Product
  Level"; no additional campus domains (courses, grades, finance, etc.) are introduced.
- The core demo loop (ask → register → live update → governed booking) must work
  end-to-end without manual intervention or fabricated data at demo time.
- The product does not attempt authentication or personalization beyond distinguishing a
  student from a club head/council user for the purpose of write permissions.

---

## Rules for This File

- This document is the product-level source of truth.
- Later context files may add implementation detail but must not contradict this document.
- Do not put technical implementation decisions here unless they affect product boundaries.
- Do not put visual design decisions here.
- Do not put detailed schema definitions here.
- Do not put implementation sequencing here.
- Do not repeat large portions of the project's research or presentation.
- Do not use marketing language.
- Do not use placeholders.
- Do not leave unresolved alternatives.
