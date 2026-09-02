// frontend/src/components/genie/GenieEvidenceDisclosure.tsx
// "How this was answered" tertiary toggle. Collapsed by default.
// SQL in --text-mono + --color-surface-sunken. Then GenieResultTable.
// Per ui-registry.md: present on every "ok" answer.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GenieResultTable } from "./GenieResultTable";

interface GenieEvidenceDisclosureProps {
  sql: string;
  rows: Record<string, unknown>[];
}

export function GenieEvidenceDisclosure({ sql, rows }: GenieEvidenceDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 border-t border-divider pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-caption font-medium text-text-muted hover:text-primary transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
      >
        {open ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
        How this was answered
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p className="text-caption font-medium text-text-muted mb-1.5">SQL run by Genie</p>
            <div className="bg-surface-sunken rounded-md p-3 overflow-x-auto">
              <pre className="text-mono text-text whitespace-pre-wrap break-words">{sql}</pre>
            </div>
          </div>

          {rows && rows.length > 0 && (
            <div>
              <p className="text-caption font-medium text-text-muted mb-1.5">Data returned</p>
              <GenieResultTable rows={rows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
