// frontend/src/components/data/Table.tsx
// Per ui-registry.md: known-shape / arbitrary-shape variants.
// Real table/thead/th scope="col" markup. aria-labelledby → Section heading.

import type { ReactNode } from "react";

interface Column {
  key: string;
  header: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
}

interface TableProps {
  variant?: "known-shape" | "arbitrary-shape";
  columns: Column[];
  rows: Record<string, unknown>[];
  /** aria-labelledby value — should match the containing Section's heading id. */
  labelledById?: string;
  caption?: string;
  emptyMessage?: string;
}

export function Table({
  columns,
  rows,
  labelledById,
  caption,
  emptyMessage = "No data available.",
}: TableProps) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table
        className="w-full border-collapse text-body"
        aria-labelledby={labelledById}
      >
        {caption && (
          <caption className="text-caption text-text-muted text-left px-4 py-2">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="border-b border-border bg-surface-sunken">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 h-table-row text-left text-label font-medium text-text-muted whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-6 text-center text-body text-text-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-divider last:border-0 hover:bg-surface-sunken transition-colors duration-fast"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 h-table-row text-body text-text"
                  >
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
