// frontend/src/components/campus/CampusPulse.tsx
// Campus Pulse component per v2-ui-spec.md §6.
// Backed by GET /api/campus/pulse.
// 4 metric tiles: Happening now · Coming up · Rooms free · Registered today.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../data/Card";
import { StatusIndicator } from "../data/StatusIndicator";
import { Banner } from "../data/Banner";
import { Skeleton } from "../loading/Skeleton";
import { getCampusPulse, type CampusPulseResponse } from "../../api/client";
import { formatTime } from "../../lib/formatTime";
import { ArrowRight, Radio } from "lucide-react";

interface CampusPulseProps {
  onRefreshTrigger?: number;
}

export function CampusPulse({ onRefreshTrigger }: CampusPulseProps) {
  const [pulse, setPulse] = useState<CampusPulseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPulse() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCampusPulse();
      if (data.error) {
        setError(data.error);
      } else {
        setPulse(data);
      }
    } catch {
      setError("Couldn't load live campus pulse.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPulse();
  }, [onRefreshTrigger]);

  if (loading && !pulse) {
    return (
      <section aria-label="Campus Pulse" className="flex flex-col gap-3">
        <h2 className="text-label font-semibold text-text uppercase tracking-wider">
          Campus Pulse
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton variant="card" count={4} />
        </div>
      </section>
    );
  }

  if (error && !pulse) {
    return (
      <section aria-label="Campus Pulse" className="flex flex-col gap-3">
        <h2 className="text-label font-semibold text-text uppercase tracking-wider">
          Campus Pulse
        </h2>
        <Banner variant="error" title="Campus pulse unavailable">
          {error}
        </Banner>
      </section>
    );
  }

  if (!pulse) return null;

  const currentEvent = pulse.events_now && pulse.events_now.length > 0 ? pulse.events_now[0] : null;
  const nextEvent = pulse.next_major_event ?? (pulse.events_upcoming && pulse.events_upcoming.length > 0 ? pulse.events_upcoming[0] : null);

  return (
    <section aria-label="Campus Pulse" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-label font-semibold text-text uppercase tracking-wider flex items-center gap-2">
          <span>Campus Pulse</span>
          <span className="inline-flex items-center gap-1 text-caption font-medium text-accent-text bg-accent-subtle px-2 py-0.5 rounded-full">
            <Radio size={12} strokeWidth={2} className="text-accent animate-pulse" aria-hidden="true" />
            Live
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Happening now tile */}
        <Card variant="static" className="flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
              Happening now
            </span>
            {currentEvent ? (
              <StatusIndicator state="ongoing" label="Live" />
            ) : (
              <StatusIndicator state="empty" label="Quiet" />
            )}
          </div>

          {currentEvent ? (
            <div className="flex flex-col gap-1 my-auto">
              <Link
                to={`/events/${currentEvent.event_id}`}
                className="font-display text-h2 font-medium text-text hover:text-primary transition-colors line-clamp-1"
              >
                {currentEvent.name}
              </Link>
              <p className="text-caption text-text-muted truncate">
                {currentEvent.club} {currentEvent.room ? `· ${currentEvent.room}` : ""}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 my-auto">
              <span className="font-display text-h2 font-medium text-text">
                Nothing right now
              </span>
              <p className="text-caption text-text-muted">
                No active events in session
              </p>
            </div>
          )}

          {pulse.events_now && pulse.events_now.length > 1 ? (
            <Link
              to="/events"
              className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 mt-1"
            >
              +{pulse.events_now.length - 1} more happening <ArrowRight size={12} />
            </Link>
          ) : (
            <div className="h-4" />
          )}
        </Card>

        {/* 2. Coming up tile */}
        <Card variant="static" className="flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
              Coming up
            </span>
            {nextEvent ? (
              <StatusIndicator state="upcoming" />
            ) : (
              <StatusIndicator state="empty" label="None" />
            )}
          </div>

          {nextEvent ? (
            <div className="flex flex-col gap-1 my-auto">
              <Link
                to={`/events/${nextEvent.event_id}`}
                className="font-display text-h2 font-medium text-text hover:text-primary transition-colors line-clamp-1"
              >
                {nextEvent.name}
              </Link>
              <p className="text-caption text-text-muted truncate">
                {nextEvent.club} {nextEvent.start_ts ? `· ${formatTime(nextEvent.start_ts)}` : ""}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 my-auto">
              <span className="font-display text-h2 font-medium text-text">
                No scheduled events
              </span>
              <p className="text-caption text-text-muted">
                Check back soon
              </p>
            </div>
          )}

          <Link
            to="/events"
            className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 mt-1"
          >
            Browse all events <ArrowRight size={12} />
          </Link>
        </Card>

        {/* 3. Rooms free tile */}
        <Card variant="static" className="flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
              Rooms free
            </span>
            <span className="text-caption text-text-muted">Right now</span>
          </div>

          <div className="flex flex-col gap-0.5 my-auto">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-h1 font-semibold text-text">
                {pulse.rooms_available_count}
              </span>
              <span className="text-body text-text-muted font-normal">
                of {pulse.rooms_total_count}
              </span>
            </div>
            <p className="text-caption text-text-muted">
              Spaces open for study & meetings
            </p>
          </div>

          <a
            href="#room-availability"
            className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 mt-1"
          >
            View availability <ArrowRight size={12} />
          </a>
        </Card>

        {/* 4. Registered today tile */}
        <Card variant="static" className="flex flex-col justify-between h-full min-h-[140px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
              Registered today
            </span>
            <span className="text-caption text-text-muted">Today</span>
          </div>

          <div className="flex flex-col gap-0.5 my-auto">
            <div className="flex items-baseline gap-1">
              <span className="font-display text-h1 font-semibold text-text">
                {pulse.registrations_today}
              </span>
              <span className="text-body text-text-muted font-normal">
                sign-ups
              </span>
            </div>
            <p className="text-caption text-text-muted">
              Campus-wide activity
            </p>
          </div>

          <div className="h-4" />
        </Card>
      </div>
    </section>
  );
}
