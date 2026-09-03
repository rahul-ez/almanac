// frontend/src/pages/ControlCenter/AnalyticsArea.tsx
// Council Control Center - Analytics area per v2-ui-spec.md §16 & v2-api-contracts.md §5.
// Useful operational metrics and readable tables across Events, Rooms, and Clubs.
// Pure semantic tokens and compact tabular displays — no heavy external charting frameworks.

import { useState, useEffect } from "react";
import { Section } from "../../components/layout/Section";
import { Card } from "../../components/data/Card";
import { FormField } from "../../components/primitives/FormField";
import { Button } from "../../components/primitives/Button";
import { Banner } from "../../components/data/Banner";
import { Skeleton } from "../../components/loading/Skeleton";
import {
  getAnalyticsOverview,
  getAnalyticsEvents,
  getAnalyticsRooms,
  getAnalyticsClubs,
  type AnalyticsOverviewResponse,
  type AnalyticsEventsResponse,
  type AnalyticsRoomsResponse,
  type AnalyticsClubsResponse,
} from "../../api/client";
import { Users, DoorClosed, TrendingUp, Clock, Filter, RotateCcw } from "lucide-react";

export function AnalyticsArea() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedRange, setAppliedRange] = useState<{ from?: string; to?: string }>({});

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [eventsData, setEventsData] = useState<AnalyticsEventsResponse | null>(null);
  const [roomsData, setRoomsData] = useState<AnalyticsRoomsResponse | null>(null);
  const [clubsData, setClubsData] = useState<AnalyticsClubsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAnalytics(range: { from?: string; to?: string }) {
    setLoading(true);
    setError(null);
    try {
      const fromISO = range.from ? `${range.from}T00:00:00` : undefined;
      const toISO = range.to ? `${range.to}T23:59:59` : undefined;

      const [ovRes, evRes, rmRes, clRes] = await Promise.allSettled([
        getAnalyticsOverview(fromISO, toISO),
        getAnalyticsEvents(fromISO, toISO),
        getAnalyticsRooms(fromISO, toISO),
        getAnalyticsClubs(fromISO, toISO),
      ]);

      if (ovRes.status === "fulfilled" && !ovRes.value.error) setOverview(ovRes.value);
      if (evRes.status === "fulfilled" && !evRes.value.error) setEventsData(evRes.value);
      if (rmRes.status === "fulfilled" && !rmRes.value.error) setRoomsData(rmRes.value);
      if (clRes.status === "fulfilled" && !clRes.value.error) setClubsData(clRes.value);
    } catch {
      setError("Couldn't load operational analytics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics(appliedRange);
  }, [appliedRange]);

  function handleApplyFilter(e: React.FormEvent) {
    e.preventDefault();
    setAppliedRange({
      from: fromDate || undefined,
      to: toDate || undefined,
    });
  }

  function handleResetFilter() {
    setFromDate("");
    setToDate("");
    setAppliedRange({});
  }

  const isFiltered = Boolean(appliedRange.from || appliedRange.to);

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Date Range Filter Toolbar */}
      <form onSubmit={handleApplyFilter} className="flex flex-wrap items-end justify-between gap-4 p-4 bg-surface rounded-lg border border-border shadow-raised">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <FormField
              id="analytics-from"
              label="From Date"
              variant="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="w-40">
            <FormField
              id="analytics-to"
              label="To Date"
              variant="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            leftIcon={<Filter size={14} />}
            className="text-label font-semibold"
          >
            Apply Range
          </Button>
          {isFiltered && (
            <Button
              type="button"
              variant="tertiary"
              onClick={handleResetFilter}
              leftIcon={<RotateCcw size={14} />}
              className="text-caption font-semibold"
            >
              Reset
            </Button>
          )}
        </div>

        <div className="text-caption text-text-muted">
          {isFiltered ? `Filtered: ${appliedRange.from ?? "Beginning"} to ${appliedRange.to ?? "Latest"}` : "Full dataset summary"}
        </div>
      </form>

      {error && (
        <Banner variant="error" title="Analytics Error">
          {error}
        </Banner>
      )}

      {/* 2. Overview High-Level Metrics */}
      <div className="flex flex-col gap-3">
        <h3 className="text-label font-semibold text-text uppercase tracking-wider">
          Aggregated Operations Metrics
        </h3>

        {loading && !overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton variant="card" count={4} />
          </div>
        ) : overview ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="static" className="flex flex-col justify-between p-4">
              <span className="text-caption font-semibold text-text-muted uppercase">Total Events</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="font-display text-h1 font-semibold text-text">{overview.total_events}</span>
                <span className="text-caption text-text-muted">({overview.upcoming_events} upcoming)</span>
              </div>
              <span className="text-caption text-text-muted">Governed scheduled events</span>
            </Card>

            <Card variant="static" className="flex flex-col justify-between p-4">
              <span className="text-caption font-semibold text-text-muted uppercase">Total Registrations</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="font-display text-h1 font-semibold text-text">{overview.total_registrations}</span>
                <span className="text-caption text-text-muted">(Avg {overview.average_attendance_per_event}/event)</span>
              </div>
              <span className="text-caption text-text-muted">Verified student entries</span>
            </Card>

            <Card variant="static" className="flex flex-col justify-between p-4">
              <span className="text-caption font-semibold text-text-muted uppercase">Current Room Utilization</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="font-display text-h1 font-semibold text-text">
                  {Math.round((overview.rooms_booked_now / (overview.rooms_total || 1)) * 100)}%
                </span>
                <span className="text-caption text-text-muted">({overview.rooms_booked_now}/{overview.rooms_total})</span>
              </div>
              <span className="text-caption text-text-muted">Rooms currently reserved</span>
            </Card>

            <Card variant="static" className="flex flex-col justify-between p-4">
              <span className="text-caption font-semibold text-text-muted uppercase">Active Societies</span>
              <div className="my-2 flex items-baseline gap-2">
                <span className="font-display text-h1 font-semibold text-text">{overview.active_clubs}</span>
                <span className="text-caption text-text-muted">Clubs</span>
              </div>
              <span className="text-caption text-text-muted">Host organizers</span>
            </Card>
          </div>
        ) : null}
      </div>

      {/* 3. Event Attendance Breakdown Table */}
      <Section
        id="analytics-events"
        title="Event Attendance Breakdown"
        description="Ranking of events by student registrations and engagement"
      >
        {loading && !eventsData && <Skeleton variant="row" count={4} />}

        {eventsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Events */}
            <div className="bg-surface rounded-lg border border-border p-5 shadow-raised flex flex-col gap-3">
              <h4 className="text-label font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={15} className="text-primary" />
                <span>Highest Attendance Events</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-divider text-caption font-semibold text-text-muted uppercase">
                      <th className="py-2.5 pr-4">Event Name</th>
                      <th className="py-2.5 px-4 text-right">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {eventsData.popular_events.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-caption text-text-muted">
                          No event records in range.
                        </td>
                      </tr>
                    ) : (
                      eventsData.popular_events.map((ev) => (
                        <tr key={ev.event_id} className="hover:bg-surface-sunken transition-colors">
                          <td className="py-2.5 pr-4">
                            <span className="font-medium text-text">{ev.name}</span>
                            <span className="text-caption font-mono text-text-muted block">{ev.event_id}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-primary">
                            {ev.attendance_count}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low / Zero Attendance Attention Table */}
            <div className="bg-surface rounded-lg border border-border p-5 shadow-raised flex flex-col gap-3">
              <h4 className="text-label font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                <Users size={15} className="text-accent" />
                <span>Low / Zero Registration Events</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-divider text-caption font-semibold text-text-muted uppercase">
                      <th className="py-2.5 pr-4">Event Name</th>
                      <th className="py-2.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {[...eventsData.low_attendance_events, ...eventsData.zero_attendance_events].length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-caption text-text-muted">
                          No low attendance events.
                        </td>
                      </tr>
                    ) : (
                      [...eventsData.low_attendance_events, ...eventsData.zero_attendance_events].map((ev) => (
                        <tr key={ev.event_id} className="hover:bg-surface-sunken transition-colors">
                          <td className="py-2.5 pr-4">
                            <span className="font-medium text-text">{ev.name}</span>
                            <span className="text-caption font-mono text-text-muted block">{ev.event_id}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <span className="text-caption font-medium px-2 py-0.5 rounded bg-warning-subtle text-warning-text">
                              {ev.attendance_count} registrations
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* 4. Room Utilization & Peak Hours */}
      <Section
        id="analytics-rooms"
        title="Room & Facility Utilization"
        description="Booking volume, cumulative reserved hours, and peak occupancy hours"
      >
        {loading && !roomsData && <Skeleton variant="row" count={4} />}

        {roomsData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Room Utilization Table */}
            <div className="lg:col-span-7 bg-surface rounded-lg border border-border p-5 shadow-raised flex flex-col gap-3">
              <h4 className="text-label font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                <DoorClosed size={15} className="text-primary" />
                <span>Facility Bookings Summary</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-divider text-caption font-semibold text-text-muted uppercase">
                      <th className="py-2.5 pr-4">Room</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Bookings</th>
                      <th className="py-2.5 pl-4 text-right">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {roomsData.room_utilization.map((rm) => (
                      <tr key={rm.room_id} className="hover:bg-surface-sunken transition-colors">
                        <td className="py-2.5 pr-4 font-medium text-text">{rm.name}</td>
                        <td className="py-2.5 px-4 text-caption text-text-muted">{rm.type}</td>
                        <td className="py-2.5 px-4 text-right font-medium">{rm.confirmed_bookings}</td>
                        <td className="py-2.5 pl-4 text-right font-semibold text-primary">
                          {rm.total_booked_hours.toFixed(1)} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Peak Hours Compact Table */}
            <div className="lg:col-span-5 bg-surface rounded-lg border border-border p-5 shadow-raised flex flex-col gap-3">
              <h4 className="text-label font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={15} className="text-primary" />
                <span>Peak Booking Hours</span>
              </h4>

              <div className="flex flex-col divide-y divide-divider">
                {roomsData.peak_booking_periods.map((pk) => {
                  const hourLabel = `${pk.hour_of_day}:00 – ${pk.hour_of_day + 1}:00`;
                  return (
                    <div key={pk.hour_of_day} className="py-2.5 flex items-center justify-between">
                      <span className="text-label text-text font-medium">{hourLabel}</span>
                      <span className="text-caption font-semibold px-2 py-0.5 rounded bg-primary-subtle text-primary">
                        {pk.booking_count} bookings
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* 5. Club Activity Table */}
      <Section
        id="analytics-clubs"
        title="Student Club & Society Engagement"
        description="Event frequency and aggregate registrations per organization"
      >
        {loading && !clubsData && <Skeleton variant="row" count={4} />}

        {clubsData && (
          <div className="bg-surface rounded-lg border border-border p-5 shadow-raised overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-divider text-caption font-semibold text-text-muted uppercase">
                    <th className="py-2.5 pr-4">Club / Society</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Scheduled Events</th>
                    <th className="py-2.5 pl-4 text-right">Total Registrations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {clubsData.club_activity.map((cl) => (
                    <tr key={cl.club_id} className="hover:bg-surface-sunken transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-text">{cl.name}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-caption px-2 py-0.5 rounded font-medium ${
                            cl.active ? "bg-success-subtle text-success-text" : "bg-surface-sunken text-text-muted"
                          }`}
                        >
                          {cl.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium">{cl.event_count}</td>
                      <td className="py-2.5 pl-4 text-right font-semibold text-primary">{cl.total_registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
