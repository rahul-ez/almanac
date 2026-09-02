// frontend/src/components/campus/RoomAvailabilityTable.tsx
// Per ui-registry.md: snapshot / check variants.
// snapshot: Newsletter Home — current free rooms.
// check: Admin Panel — availability check before booking.
// Stacks to label/value blocks below --bp-md.

import type { FreeRoom } from "../../api/client";
import { StatusIndicator } from "../data/StatusIndicator";
import { Table } from "../data/Table";

interface RoomAvailabilityTableProps {
  variant: "snapshot" | "check";
  freeRooms: FreeRoom[];
  allRooms?: FreeRoom[]; // For "check" variant to show unavailable rooms too
  labelledById?: string;
}

export function RoomAvailabilityTable({
  variant,
  freeRooms,
  allRooms,
  labelledById,
}: RoomAvailabilityTableProps) {
  const freeIds = new Set(freeRooms.map((r) => r.room_id));

  // For snapshot: just the free rooms
  // For check: all rooms with availability indicator
  const rows = variant === "check" && allRooms
    ? allRooms.map((r) => ({ ...r, available: freeIds.has(r.room_id) }))
    : freeRooms.map((r) => ({ ...r, available: true }));

  const columns =
    variant === "check"
      ? [
          { key: "name", header: "Room" },
          { key: "type", header: "Type" },
          {
            key: "available",
            header: "Status",
            render: (v: unknown) => (
              <StatusIndicator state={(v as boolean) ? "available" : "unavailable"} />
            ),
          },
        ]
      : [
          { key: "name", header: "Room" },
          { key: "type", header: "Type" },
        ];

  return (
    <Table
      columns={columns}
      rows={rows as Record<string, unknown>[]}
      labelledById={labelledById}
      emptyMessage="No rooms available right now."
    />
  );
}
