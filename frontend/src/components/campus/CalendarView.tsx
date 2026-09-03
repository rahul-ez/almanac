// frontend/src/components/campus/CalendarView.tsx
// Week-oriented Calendar View per v2-ui-spec.md §7.2.
// Grid = discovery, Calendar = planning.
// 7-day week view on desktop, collapsing to vertical agenda list below --bp-md.
// All events link to /events/:event_id.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "../primitives/Button";
import { StatusIndicator } from "../data/StatusIndicator";
import { Banner } from "../data/Banner";
import { Skeleton } from "../loading/Skeleton";
import { listEvents, type EventSummary } from "../../api/client";
import { formatTime } from "../../lib/formatTime";
import type { SemanticState } from "../../styles/tokens";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

// Helpers for week date math
function getStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // Mon = 1 ... Sun = 0; make Monday = 0
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FULL_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CalendarViewProps {
  onRegisterClick?: (event: EventSummary) => void;
}

export function CalendarView({ onRegisterClick }: CalendarViewProps = {}) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [events, setEvents] = useState<EventSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(currentWeekStart, 7), [currentWeekStart]);

  const daysInWeek = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const today = useMemo(() => new Date(), []);

  async function fetchWeekEvents() {
    setLoading(true);
    setError(null);
    try {
      const fromISO = currentWeekStart.toISOString();
      const toISO = weekEnd.toISOString();
      const res = await listEvents({
        from: fromISO,
        to: toISO,
        upcoming: false, // In calendar view, show all events including cancelled/past for full picture
      });
      if (res.error) {
        setError(res.error);
      } else {
        setEvents(res.events);
      }
    } catch {
      setError("Couldn't load calendar events — try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWeekEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart]);

  function handlePrevWeek() {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  }

  function handleNextWeek() {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  }

  function handleToday() {
    setCurrentWeekStart(getStartOfWeek(new Date()));
  }

  // Group events by day index (0-6)
  const eventsByDay = useMemo(() => {
    const map = new Map<number, EventSummary[]>();
    for (let i = 0; i < 7; i++) {
      map.set(i, []);
    }
    if (!events) return map;

    events.forEach((evt) => {
      const evtDate = new Date(evt.start_ts);
      daysInWeek.forEach((dayDate, index) => {
        if (isSameDay(evtDate, dayDate)) {
          map.get(index)?.push(evt);
        }
      });
    });

    // Sort events within each day by start_ts
    map.forEach((evts) => {
      evts.sort((a, b) => new Date(a.start_ts).getTime() - new Date(b.start_ts).getTime());
    });

    return map;
  }, [events, daysInWeek]);

  // Format week range header (e.g. "Sep 1 – Sep 7, 2026")
  const rangeHeader = useMemo(() => {
    const startStr = currentWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = addDays(currentWeekStart, 6).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }, [currentWeekStart]);

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar navigation toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface rounded-lg border border-border shadow-raised">
        <div className="flex items-center gap-2">
          <CalendarIcon size={20} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
          <h2 className="font-display text-h2 font-medium text-text">
            {rangeHeader}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleToday}
            className="text-caption font-semibold"
          >
            Today
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              onClick={handlePrevWeek}
              aria-label="Previous week"
              leftIcon={<ChevronLeft size={16} />}
              className="px-2"
            >
              <span className="hidden md:inline">Prev</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleNextWeek}
              aria-label="Next week"
              rightIcon={<ChevronRight size={16} />}
              className="px-2"
            >
              <span className="hidden md:inline">Next</span>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Banner variant="error" title="Calendar unavailable">
          {error}
        </Banner>
      )}

      {loading && !events && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-surface rounded-lg border border-border min-h-[220px]">
              <div className="h-5 bg-surface-sunken rounded w-16 mb-2" />
              <Skeleton variant="card" count={2} />
            </div>
          ))}
        </div>
      )}

      {/* 1. Desktop 7-Column Week Grid (>= md) */}
      {!loading && (
        <div className="hidden md:grid md:grid-cols-7 gap-3">
          {daysInWeek.map((dayDate, index) => {
            const isCurrentDay = isSameDay(dayDate, today);
            const dayEvents = eventsByDay.get(index) ?? [];

            return (
              <div
                key={index}
                className={`flex flex-col rounded-lg border transition-colors min-h-[300px] bg-surface ${
                  isCurrentDay ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                {/* Day column header */}
                <div
                  className={`px-3 py-2.5 border-b border-divider flex flex-col items-center justify-center text-center ${
                    isCurrentDay ? "bg-primary-subtle" : "bg-surface-sunken"
                  }`}
                >
                  <span className={`text-caption font-semibold uppercase tracking-wider ${isCurrentDay ? "text-primary" : "text-text-muted"}`}>
                    {DAY_NAMES[index]}
                  </span>
                  <span className={`font-display text-h3 font-semibold ${isCurrentDay ? "text-primary" : "text-text"}`}>
                    {dayDate.getDate()}
                  </span>
                </div>

                {/* Day events container */}
                <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-2 text-center text-caption text-text-muted opacity-60">
                      No events
                    </div>
                  ) : (
                    dayEvents.map((evt) => {
                      const isCancelled = evt.status === "cancelled";

                      return (
                        <Link
                          key={evt.event_id}
                          to={`/events/${evt.event_id}`}
                          className={`p-2.5 rounded-md border text-left transition-all duration-fast flex flex-col gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isCancelled
                              ? "bg-surface-sunken border-border opacity-70"
                              : "bg-surface border-border hover:border-primary-mid hover:shadow-raised"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-caption font-semibold text-text-muted flex items-center gap-1">
                              <Clock size={11} aria-hidden="true" />
                              {formatTime(evt.start_ts)}
                            </span>
                            <StatusIndicator
                              state={
                                evt.status === "scheduled"
                                  ? "upcoming"
                                  : (evt.status as SemanticState)
                              }
                            />
                          </div>

                          <span
                            className={`text-label font-medium text-text line-clamp-2 leading-snug ${
                              isCancelled ? "line-through text-text-muted" : "hover:text-primary"
                            }`}
                          >
                            {evt.name}
                          </span>

                          <span className="text-caption text-text-muted truncate">
                            {evt.club}
                          </span>

                          {evt.room && (
                            <span className="text-caption text-text-muted flex items-center gap-1 truncate mt-0.5">
                              <MapPin size={11} aria-hidden="true" />
                              {evt.room}
                            </span>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. Mobile Day Agenda List (< md) */}
      {!loading && (
        <div className="flex md:hidden flex-col gap-4">
          {daysInWeek.map((dayDate, index) => {
            const isCurrentDay = isSameDay(dayDate, today);
            const dayEvents = eventsByDay.get(index) ?? [];

            return (
              <div
                key={index}
                className={`flex flex-col rounded-lg border overflow-hidden bg-surface ${
                  isCurrentDay ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                {/* Day Header */}
                <div
                  className={`px-4 py-2.5 border-b border-divider flex items-center justify-between ${
                    isCurrentDay ? "bg-primary-subtle" : "bg-surface-sunken"
                  }`}
                >
                  <span className={`text-label font-semibold ${isCurrentDay ? "text-primary" : "text-text"}`}>
                    {FULL_DAY_NAMES[index]}, {dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  {isCurrentDay && (
                    <span className="text-caption font-semibold text-primary bg-white px-2 py-0.5 rounded-full border border-primary-mid">
                      Today
                    </span>
                  )}
                </div>

                {/* Day Agenda Items */}
                <div className="p-3 flex flex-col gap-2.5">
                  {dayEvents.length === 0 ? (
                    <p className="text-caption text-text-muted py-3 text-center">
                      No events scheduled for this day.
                    </p>
                  ) : (
                    dayEvents.map((evt) => {
                      const isCancelled = evt.status === "cancelled";

                      return (
                        <div
                          key={evt.event_id}
                          className="p-3 rounded-md border border-border bg-surface flex flex-col gap-2 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-caption font-medium text-text-muted flex items-center gap-1">
                              <Clock size={13} aria-hidden="true" />
                              {formatTime(evt.start_ts)}
                              {evt.end_ts ? ` – ${formatTime(evt.end_ts)}` : ""}
                            </span>
                            <StatusIndicator
                              state={
                                evt.status === "scheduled"
                                  ? "upcoming"
                                  : (evt.status as SemanticState)
                              }
                            />
                          </div>

                          <Link
                            to={`/events/${evt.event_id}`}
                            className={`font-display text-h3 font-medium text-text hover:text-primary transition-colors ${
                              isCancelled ? "line-through text-text-muted" : ""
                            }`}
                          >
                            {evt.name}
                          </Link>

                          <div className="flex items-center justify-between gap-2 text-caption text-text-muted pt-1 border-t border-divider">
                            <span>{evt.club}</span>
                            <div className="flex items-center gap-2">
                              {evt.room && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} aria-hidden="true" />
                                  {evt.room}
                                </span>
                              )}
                              {!isCancelled && onRegisterClick && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onRegisterClick(evt);
                                  }}
                                  className="text-primary hover:text-primary-hover font-semibold underline text-caption ml-1"
                                >
                                  Register
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
