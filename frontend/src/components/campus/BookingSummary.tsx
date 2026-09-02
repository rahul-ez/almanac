// frontend/src/components/campus/BookingSummary.tsx
// Per ui-registry.md: success / conflict variants. DefinitionList composition.

import { DefinitionList } from "../data/DefinitionList";
import { Banner } from "../data/Banner";
import { formatDateTime, formatTimeRange } from "../../lib/formatTime";
import type { BookingResponse } from "../../api/client";

interface BookingSummaryProps {
  response: BookingResponse;
}

export function BookingSummary({ response }: BookingSummaryProps) {
  if (response.error === "conflict" && response.conflicting_booking) {
    const conflict = response.conflicting_booking;
    return (
      <Banner variant="conflict" title="Booking conflict — room already taken">
        <DefinitionList
          items={[
            { term: "Room", definition: conflict.room },
            { term: "Booked for", definition: conflict.event },
            {
              term: "Time",
              definition: formatTimeRange(conflict.start_ts, conflict.end_ts),
            },
          ]}
        />
      </Banner>
    );
  }

  return (
    <Banner variant="success" title="Room booked successfully">
      <DefinitionList
        items={[
          { term: "Booking ID", definition: response.booking_id },
          { term: "Room", definition: response.room_id },
          { term: "Event", definition: response.event_id },
          {
            term: "Time",
            definition: formatTimeRange(response.start_ts, response.end_ts),
          },
          { term: "Booked at", definition: formatDateTime(new Date().toISOString()) },
        ]}
      />
    </Banner>
  );
}
