// frontend/src/pages/ControlCenter/ActivityArea.tsx
// Council Control Center - Activity area per v2-ui-spec.md §17 & v2-api-contracts.md §6.
// Chronological audit log of governed writes: event creation, room bookings, cancellations.

import { useState, useEffect } from "react";
import { Section } from "../../components/layout/Section";
import { Button } from "../../components/primitives/Button";
import { Banner } from "../../components/data/Banner";
import { Skeleton } from "../../components/loading/Skeleton";
import { getActivity, type ActivityItem } from "../../api/client";
import { formatDate, formatTime } from "../../lib/formatTime";
import {
  Calendar,
  DoorClosed,
  Ban,
  Clock,
  RotateCcw,
  Radio,
  FileCheck,
} from "lucide-react";

export function ActivityArea() {
  const [activities, setActivities] = useState<ActivityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadActivity() {
    setLoading(true);
    setError(null);
    try {
      const res = await getActivity(50);
      if (res.error) {
        setError(res.error);
      } else {
        setActivities(res.activity);
      }
    } catch {
      setError("Couldn't load activity feed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivity();
  }, []);

  function getActivityIcon(type: ActivityItem["type"]) {
    switch (type) {
      case "room_booked":
        return <DoorClosed size={16} strokeWidth={1.5} className="text-primary" />;
      case "event_created":
        return <Calendar size={16} strokeWidth={1.5} className="text-primary" />;
      case "event_cancelled":
        return <Ban size={16} strokeWidth={1.5} className="text-error" />;
      default:
        return <FileCheck size={16} strokeWidth={1.5} className="text-text-muted" />;
    }
  }

  function getActivityTitle(act: ActivityItem) {
    switch (act.type) {
      case "room_booked":
        return `Room Reserved: ${act.room ?? "Room"} for "${act.event_name ?? "Scheduled Event"}"`;
      case "event_created":
        return `New Event Created: "${act.name ?? "Event"}"`;
      case "event_cancelled":
        return `Event Cancelled: "${act.name ?? act.event_id ?? "Event"}"`;
      default:
        return "Governed Campus Action";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 p-4 bg-surface rounded-lg border border-border shadow-raised">
        <div className="flex items-center gap-2">
          <Radio size={16} className="text-accent animate-pulse" />
          <div>
            <h3 className="text-label font-semibold text-text uppercase tracking-wider">
              Live Governance Feed
            </h3>
            <p className="text-caption text-text-muted">
              Chronological log of event creations, room allocations, and administrative changes
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={loadActivity}
          loading={loading}
          loadingLabel="Refreshing…"
          leftIcon={<RotateCcw size={14} />}
          className="text-caption font-semibold"
        >
          Refresh Log
        </Button>
      </div>

      <Section
        id="activity-feed"
        title="Audit Timeline"
        description="All recorded modifications in chronological order"
      >
        {error && (
          <Banner variant="error" title="Activity Feed Unavailable">
            {error}
          </Banner>
        )}

        {loading && !activities && <Skeleton variant="row" count={6} />}

        {!loading && !error && activities && activities.length === 0 && (
          <div className="p-8 text-center bg-surface rounded-lg border border-border">
            <p className="text-body text-text-muted">
              No activity records logged yet. New event creations and bookings will appear here.
            </p>
          </div>
        )}

        {!loading && !error && activities && activities.length > 0 && (
          <div className="bg-surface rounded-lg border border-border divide-y divide-divider shadow-raised overflow-hidden">
            {activities.map((act, index) => (
              <div
                key={index}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-sunken transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-primary-subtle border border-primary-mid flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                    {getActivityIcon(act.type)}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-label font-medium text-text">
                      {getActivityTitle(act)}
                    </span>
                    <div className="flex items-center gap-2 text-caption text-text-muted flex-wrap">
                      {act.event_id && (
                        <span className="font-mono bg-surface-sunken px-1.5 py-0.5 rounded border border-border">
                          {act.event_id}
                        </span>
                      )}
                      {act.booking_id && (
                        <span className="font-mono bg-surface-sunken px-1.5 py-0.5 rounded border border-border">
                          {act.booking_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-caption text-text-muted flex-shrink-0 ml-12 sm:ml-0">
                  <Clock size={13} aria-hidden="true" />
                  <span>
                    {formatDate(act.at)}, {formatTime(act.at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
