// frontend/src/components/campus/EventCard.tsx
// Per ui-registry.md: upcoming / ongoing / cancelled / completed variants.
// Upcoming = clickable (single stretched link, no nested interactives).
// Others = static display.

import { Calendar, MapPin } from "lucide-react";
import type { EventSummary } from "../../api/client";
import { StatusIndicator } from "../data/StatusIndicator";
import { AttendanceDatum } from "./AttendanceDatum";
import { LiveUpdateHighlight } from "./LiveUpdateHighlight";
import { formatDate, formatTime } from "../../lib/formatTime";

interface EventCardProps {
  event: EventSummary;
}

export function EventCard({ event }: EventCardProps) {
  const isClickable = event.status === "upcoming";
  const isLive = event.status === "ongoing";

  const cardContent = (
    <>
      {/* Header row: status + club */}
      <div className="flex items-center justify-between gap-2">
        <StatusIndicator state={event.status} />
        <span className="text-caption text-text-muted truncate">{event.club}</span>
      </div>

      {/* Event name */}
      <h3 className="text-h3 font-semibold text-text leading-snug line-clamp-2">
        {event.name}
      </h3>

      {/* Meta: date + time */}
      <div className="flex items-center gap-1.5 text-label text-text-muted">
        <Calendar size={14} aria-hidden="true" />
        <span>{formatDate(event.start_ts)}</span>
        <span className="text-divider">·</span>
        <span>{formatTime(event.start_ts)}</span>
      </div>

      {/* Room */}
      {event.room && (
        <div className="flex items-center gap-1.5 text-label text-text-muted">
          <MapPin size={14} aria-hidden="true" />
          <span>{event.room}</span>
        </div>
      )}

      {/* Attendance */}
      <div className="mt-auto pt-1 border-t border-divider">
        <LiveUpdateHighlight value={event.attendance_count}>
          <AttendanceDatum count={event.attendance_count} isLive={isLive} />
        </LiveUpdateHighlight>
      </div>
    </>
  );

  if (isClickable) {
    return (
      <article className="relative bg-surface rounded-lg border border-border shadow-raised p-4 flex flex-col gap-3 group hover:shadow-elevated transition-shadow duration-base ease-standard">
        <a
          href={`/events/${event.event_id}`}
          aria-label={`${event.name} — ${formatDate(event.start_ts)} at ${formatTime(event.start_ts)}`}
          className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        />
        {cardContent}
      </article>
    );
  }

  return (
    <article className="bg-surface rounded-lg border border-border shadow-raised p-4 flex flex-col gap-3">
      {cardContent}
    </article>
  );
}
