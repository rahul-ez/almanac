// frontend/src/components/genie/GenieMessage.tsx
// 5 variants: user / assistant-ok / assistant-no_answer / assistant-error / assistant-loading.
// Genie -> Action rendering per v2-ui-spec.md §10 & v2-api-contracts.md §7.2.
// Read-only action controls navigate or trigger existing application flows.

import { useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Message } from "../../hooks/useGenieConversation";
import { GenieEvidenceDisclosure } from "./GenieEvidenceDisclosure";
import { MarkdownText } from "../primitives/MarkdownText";
import { useSession } from "../../hooks/useSession";
import { User, AlertCircle, HelpCircle, Database, ArrowRight, Ticket, MapPin, Calendar, DoorClosed } from "lucide-react";

interface GenieMessageProps {
  message: Message;
  isNewest?: boolean;
  onRegisterClick?: (eventId: string) => void;
}

interface RecognizedAction {
  type: "event" | "room";
  id: string;
  name?: string;
}

export function GenieMessage({ message, isNewest = false, onRegisterClick }: GenieMessageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { role } = useSession();

  useEffect(() => {
    if (isNewest && message.role === "assistant") {
      ref.current?.focus({ preventScroll: false });
    }
  }, [isNewest, message.role]);

  // Heuristic action extraction from rows
  const recognizedActions = useMemo<RecognizedAction[]>(() => {
    if (!message.rows || message.rows.length === 0) return [];

    const actions: RecognizedAction[] = [];
    const seenIds = new Set<string>();

    for (const row of message.rows) {
      // 1. Check for event row patterns
      let eventId: string | undefined;
      let eventName: string | undefined;

      for (const [k, v] of Object.entries(row)) {
        const key = k.toLowerCase();
        const valStr = String(v ?? "");
        if (key.includes("event_id") || key === "evt_id" || valStr.startsWith("evt_")) {
          eventId = valStr;
        }
        if (key === "name" || key === "event_name" || key === "title") {
          eventName = valStr;
        }
      }

      if (eventId && !seenIds.has(eventId)) {
        seenIds.add(eventId);
        actions.push({ type: "event", id: eventId, name: eventName });
      }

      // 2. Check for room row patterns
      let roomId: string | undefined;
      let roomName: string | undefined;

      for (const [k, v] of Object.entries(row)) {
        const key = k.toLowerCase();
        const valStr = String(v ?? "");
        if (key.includes("room_id") || key === "rm_id" || valStr.startsWith("room_") || valStr.startsWith("r_")) {
          roomId = valStr;
        }
        if (key === "room" || key === "room_name" || (key === "name" && !eventId)) {
          roomName = valStr;
        }
      }

      if (roomId && !seenIds.has(roomId) && !eventId) {
        seenIds.add(roomId);
        actions.push({ type: "room", id: roomId, name: roomName });
      }
    }

    return actions.slice(0, 3); // Cap at top 3 actions to keep chat clean
  }, [message.rows]);

  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] bg-primary text-white rounded-lg px-4 py-3 text-body shadow-raised">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center flex-shrink-0 mt-0.5 border border-border">
          <User size={16} strokeWidth={1.5} className="text-text-muted" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Loading state
  if (message.status === "loading") {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary-mid">
          <Database size={15} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
        </div>
        <div
          ref={ref}
          tabIndex={-1}
          aria-label="Genie is thinking"
          className="max-w-[80%] bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-2 shadow-raised"
        >
          <span className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
          <span className="text-body text-text-muted sr-only">Checking campus data…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (message.status === "error") {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-error-subtle flex items-center justify-center flex-shrink-0 mt-0.5 border border-error">
          <AlertCircle size={16} strokeWidth={1.5} className="text-error" aria-hidden="true" />
        </div>
        <div
          ref={ref}
          tabIndex={-1}
          className="max-w-[80%] bg-error-subtle border border-error rounded-lg px-4 py-3"
        >
          <p className="text-body text-error">{message.content}</p>
        </div>
      </div>
    );
  }

  // No answer state
  if (message.status === "no_answer") {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-info-subtle flex items-center justify-center flex-shrink-0 mt-0.5 border border-info">
          <HelpCircle size={16} strokeWidth={1.5} className="text-info" aria-hidden="true" />
        </div>
        <div
          ref={ref}
          tabIndex={-1}
          className="max-w-[80%] bg-surface border border-border rounded-lg px-4 py-3 shadow-raised"
        >
          <p className="text-body text-text-muted">{message.content}</p>
        </div>
      </div>
    );
  }

  // OK answer state
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary-mid">
        <Database size={15} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
      </div>
      <div
        ref={ref}
        tabIndex={-1}
        className="max-w-[85%] bg-surface-elevated border border-border rounded-lg px-4 py-3 shadow-elevated flex flex-col gap-3"
      >
        <MarkdownText
          content={message.content}
          className="text-body text-text"
          onRegisterClick={onRegisterClick}
        />

        {/* Genie -> Action controls */}
        {recognizedActions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-divider" aria-label="Suggested actions">
            {recognizedActions.map((act) => {
              if (act.type === "event") {
                return (
                  <div key={act.id} className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to={`/events/${act.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary-subtle text-primary hover:bg-primary hover:text-white text-caption font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                    >
                      <Calendar size={13} aria-hidden="true" />
                      <span>View Event {act.name ? `(${act.name})` : ""}</span>
                      <ArrowRight size={12} aria-hidden="true" />
                    </Link>

                    {onRegisterClick && (
                      <button
                        type="button"
                        onClick={() => onRegisterClick(act.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-primary text-primary hover:bg-primary-subtle text-caption font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Register for ${act.name ?? act.id}`}
                      >
                        <Ticket size={13} aria-hidden="true" />
                        <span>Register</span>
                      </button>
                    )}
                  </div>
                );
              }

              if (act.type === "room") {
                return (
                  <div key={act.id} className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      to="/events"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary-subtle text-primary hover:bg-primary hover:text-white text-caption font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                    >
                      <MapPin size={13} aria-hidden="true" />
                      <span>View availability {act.name ? `(${act.name})` : ""}</span>
                    </Link>

                    {role === "council" && (
                      <Link
                        to={`/admin?area=rooms&room_id=${encodeURIComponent(act.id)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-white hover:bg-primary-hover text-caption font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-sm"
                      >
                        <DoorClosed size={13} aria-hidden="true" />
                        <span>Book room</span>
                      </Link>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* Evidence Disclosure (SQL & Result table) */}
        {message.sql && (
          <GenieEvidenceDisclosure
            sql={message.sql}
            rows={message.rows ?? []}
          />
        )}
      </div>
    </div>
  );
}

