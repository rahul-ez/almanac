// frontend/src/components/campus/EventCard.tsx
// Per ui-registry.md & campus-companion-redesign-spec.md:
// Event name in --text-h2 (Playfair Display, 500). Everything else in Public Sans.
// Status badge + club name on one baseline.
// Upcoming = clickable to register / details.

import { Calendar, MapPin, Ticket } from "lucide-react";
import type { EventSummary } from "../../api/client";
import { StatusIndicator } from "../data/StatusIndicator";
import { AttendanceDatum } from "./AttendanceDatum";
import { LiveUpdateHighlight } from "./LiveUpdateHighlight";
import { formatDate, formatTime, deriveEventStatus } from "../../lib/formatTime";
import type { SemanticState } from "../../styles/tokens";

interface EventCardProps {
  event: EventSummary;
  onRegister?: (event: EventSummary) => void;
}

export function EventCard({ event, onRegister }: EventCardProps) {
  const derived = deriveEventStatus(event.start_ts);
  const currentStatus: SemanticState =
    event.status === "cancelled"
      ? "cancelled"
      : event.status === "ongoing" || event.status === "completed" || event.status === "upcoming"
      ? event.status
      : derived;

  const isUpcoming = currentStatus === "upcoming";
  const isLive = currentStatus === "ongoing";

  return (
    <article className="bg-surface rounded-lg border border-border shadow-raised p-4 flex flex-col gap-3 group hover:shadow-elevated transition-shadow duration-base ease-standard">
      {/* Header row: status + club on one baseline */}
      <div className="flex items-center justify-between gap-2 h-6">
        <StatusIndicator state={currentStatus} />
        <span className="text-caption text-text-muted truncate">{event.club}</span>
      </div>

      {/* Event name — only serif element in card */}
      <h3 className="font-display text-h2 font-medium text-text leading-snug line-clamp-2">
        {event.name}
      </h3>

      {/* Meta: date + time */}
      <div className="flex items-center gap-1.5 text-label text-text-muted">
        <Calendar size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>{formatDate(event.start_ts)}</span>
        <span className="text-divider">·</span>
        <span>{formatTime(event.start_ts)}</span>
      </div>

      {/* Room */}
      {event.room && (
        <div className="flex items-center gap-1.5 text-label text-text-muted">
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>{event.room}</span>
        </div>
      )}

      {/* Attendance & Register Action */}
      <div className="mt-auto pt-3 border-t border-divider flex items-center justify-between gap-2">
        <LiveUpdateHighlight value={event.attendance_count}>
          <AttendanceDatum count={event.attendance_count} isLive={isLive} />
        </LiveUpdateHighlight>

        {isUpcoming && onRegister && (
          <button
            type="button"
            onClick={() => onRegister(event)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary-subtle text-primary hover:bg-primary hover:text-white text-caption font-semibold transition-colors duration-fast"
            aria-label={`Register for ${event.name}`}
          >
            <Ticket size={12} strokeWidth={1.5} aria-hidden="true" />
            <span>Register</span>
          </button>
        )}
      </div>
    </article>
  );
}
