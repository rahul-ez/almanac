// frontend/src/components/genie/GenieResultTable.tsx
// arbitrary-shape Table. Capped at 20 rows. Horizontally scrollable.
// Per ui-registry.md.

import type { ReactNode } from "react";

interface GenieResultTableProps {
  rows: Record<string, unknown>[];
}

export function GenieResultTable({ rows }: GenieResultTableProps) {
  if (!rows || rows.length === 0) return null;

  const capped = rows.slice(0, 20);
  const keys = Object.keys(capped[0]);

  return (
    <div className="overflow-x-auto rounded-md border border-border mt-3">
      {rows.length > 20 && (
        <p className="text-caption text-text-muted px-3 pt-2">
          Showing 20 of {rows.length} rows
        </p>
      )}
      <table className="w-full border-collapse text-body min-w-max">
        <thead>
          <tr className="border-b border-border bg-surface-sunken">
            {keys.map((k) => (
              <th key={k} scope="col" className="px-3 py-2 text-left text-label font-medium text-text-muted whitespace-nowrap">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capped.map((row, i) => (
            <tr key={i} className="border-b border-divider last:border-0">
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 text-body text-text whitespace-nowrap">
                  {String(row[k] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
