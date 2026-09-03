// frontend/src/pages/ControlCenter/OverviewArea.tsx
// Council Control Center - Overview per v2-ui-spec.md §13.
// Concise operational snapshot: key metrics, recent activity summary, quick actions.

import { useEffect, useState } from "react";
import { Card } from "../../components/data/Card";
import { Button } from "../../components/primitives/Button";
import { Banner } from "../../components/data/Banner";
import { Skeleton } from "../../components/loading/Skeleton";
import {
  getAnalyticsOverview,
  getActivity,
  type AnalyticsOverviewResponse,
  type ActivityItem,
} from "../../api/client";
import { formatTime, formatDate } from "../../lib/formatTime";
import {
  Calendar,
  Users,
  DoorClosed,
  Building2,
  ArrowRight,
  PlusCircle,
  Clock,
  Radio,
} from "lucide-react";

interface OverviewAreaProps {
  onNavigateArea: (area: "overview" | "events" | "rooms" | "analytics" | "activity") => void;
}

export function OverviewArea({ onNavigateArea }: OverviewAreaProps) {
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, actRes] = await Promise.allSettled([
        getAnalyticsOverview(),
        getActivity(5),
      ]);

      if (ovRes.status === "fulfilled") {
        if (ovRes.value.error) setError(ovRes.value.error);
        else setOverview(ovRes.value);
      }

      if (actRes.status === "fulfilled" && !actRes.value.error) {
        setActivities(actRes.value.activity);
      }
    } catch {
      setError("Couldn't load operational overview data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-surface rounded-lg border border-border shadow-raised">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-label font-semibold text-text uppercase tracking-wider">
            Operational Quick Actions
          </h2>
          <p className="text-caption text-text-muted">
            Directly create scheduled events or reserve campus facilities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => onNavigateArea("rooms")}
            leftIcon={<DoorClosed size={16} />}
            className="text-label font-semibold"
          >
            Book a room
          </Button>
          <Button
            variant="primary"
            onClick={() => onNavigateArea("events")}
            leftIcon={<PlusCircle size={16} />}
            className="text-label font-semibold"
          >
            Create event
          </Button>
        </div>
      </div>

      {error && (
        <Banner variant="error" title="Overview data unavailable">
          {error}
        </Banner>
      )}

      {/* Metric Tiles */}
      <div className="flex flex-col gap-3">
        <h3 className="text-label font-semibold text-text uppercase tracking-wider">
          Campus Operations Pulse
        </h3>

        {loading && !overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton variant="card" count={4} />
          </div>
        ) : overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Upcoming Events */}
            <Card variant="static" className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
                  Upcoming Events
                </span>
                <Calendar size={16} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="my-auto">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-h1 font-semibold text-text">
                    {overview.upcoming_events}
                  </span>
                  <span className="text-caption text-text-muted">
                    of {overview.total_events} total
                  </span>
                </div>
                <p className="text-caption text-text-muted">Scheduled across clubs</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateArea("events")}
                className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 text-left"
              >
                Manage events <ArrowRight size={12} />
              </button>
            </Card>

            {/* 2. Total Registrations */}
            <Card variant="static" className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
                  Registrations
                </span>
                <Users size={16} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="my-auto">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-h1 font-semibold text-text">
                    {overview.total_registrations}
                  </span>
                  <span className="text-caption text-text-muted">
                    (~{overview.average_attendance_per_event}/event)
                  </span>
                </div>
                <p className="text-caption text-text-muted">Student sign-ups</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateArea("analytics")}
                className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 text-left"
              >
                View analytics <ArrowRight size={12} />
              </button>
            </Card>

            {/* 3. Rooms Booked */}
            <Card variant="static" className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
                  Room Utilization
                </span>
                <DoorClosed size={16} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="my-auto">
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-h1 font-semibold text-text">
                    {overview.rooms_booked_now}
                  </span>
                  <span className="text-caption text-text-muted">
                    of {overview.rooms_total} occupied
                  </span>
                </div>
                <p className="text-caption text-text-muted">
                  {overview.rooms_total - overview.rooms_booked_now} rooms currently free
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateArea("rooms")}
                className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 text-left"
              >
                Check availability <ArrowRight size={12} />
              </button>
            </Card>

            {/* 4. Active Clubs */}
            <Card variant="static" className="flex flex-col justify-between h-full min-h-[130px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-text-muted uppercase tracking-wide">
                  Active Clubs
                </span>
                <Building2 size={16} strokeWidth={1.5} className="text-primary" />
              </div>
              <div className="my-auto">
                <span className="font-display text-h1 font-semibold text-text">
                  {overview.active_clubs}
                </span>
                <p className="text-caption text-text-muted">Governed student societies</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateArea("analytics")}
                className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1 text-left"
              >
                Club breakdown <ArrowRight size={12} />
              </button>
            </Card>
          </div>
        ) : null}
      </div>

      {/* Recent Activity Snapshot */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-label font-semibold text-text uppercase tracking-wider flex items-center gap-2">
            <span>Recent Governed Activity</span>
            <span className="inline-flex items-center gap-1 text-caption text-accent-text bg-accent-subtle px-2 py-0.5 rounded-full">
              <Radio size={11} className="text-accent animate-pulse" />
              Feed
            </span>
          </h3>

          <button
            type="button"
            onClick={() => onNavigateArea("activity")}
            className="text-caption font-semibold text-primary hover:text-primary-hover inline-flex items-center gap-1"
          >
            <span>View full audit log</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {loading && !activities ? (
          <Skeleton variant="row" count={3} />
        ) : activities && activities.length > 0 ? (
          <div className="bg-surface rounded-lg border border-border divide-y divide-divider shadow-raised overflow-hidden">
            {activities.map((act, index) => (
              <div key={index} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-sunken transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-subtle border border-primary-mid flex items-center justify-center text-primary flex-shrink-0">
                    {act.type === "room_booked" ? (
                      <DoorClosed size={15} strokeWidth={1.5} />
                    ) : (
                      <Calendar size={15} strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-label font-medium text-text">
                      {act.type === "room_booked"
                        ? `Booked ${act.room ?? "Room"} for "${act.event_name ?? "Event"}"`
                        : `Scheduled new event "${act.name ?? "Event"}"`}
                    </span>
                    <span className="text-caption text-text-muted">
                      {act.booking_id ? `Booking ${act.booking_id}` : `Event ID ${act.event_id}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-caption text-text-muted flex-shrink-0">
                  <Clock size={12} />
                  <span>{formatDate(act.at)}, {formatTime(act.at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-surface rounded-lg border border-border">
            <p className="text-body text-text-muted">No recent operations recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
}
