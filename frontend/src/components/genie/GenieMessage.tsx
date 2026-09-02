// frontend/src/components/genie/GenieMessage.tsx
// 5 variants: user / assistant-ok / assistant-no_answer / assistant-error / assistant-loading.
// Per ui-registry.md: newest assistant message gets programmatic focus.

import { useEffect, useRef } from "react";
import type { Message } from "../../hooks/useGenieConversation";
import { GenieEvidenceDisclosure } from "./GenieEvidenceDisclosure";
import { Sparkles, User, AlertCircle, HelpCircle } from "lucide-react";

interface GenieMessageProps {
  message: Message;
  isNewest?: boolean;
}

export function GenieMessage({ message, isNewest = false }: GenieMessageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNewest && message.role === "assistant") {
      ref.current?.focus({ preventScroll: false });
    }
  }, [isNewest, message.role]);

  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] bg-primary text-surface rounded-lg px-4 py-3 text-body">
          {message.content}
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={16} className="text-text-muted" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Loading state
  if (message.status === "loading") {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={16} className="text-primary" aria-hidden="true" />
        </div>
        <div
          ref={ref}
          tabIndex={-1}
          aria-label="Genie is thinking"
          className="max-w-[80%] bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-2"
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
        <div className="w-8 h-8 rounded-full bg-error-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
          <AlertCircle size={16} className="text-error" aria-hidden="true" />
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
        <div className="w-8 h-8 rounded-full bg-info-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
          <HelpCircle size={16} className="text-info" aria-hidden="true" />
        </div>
        <div
          ref={ref}
          tabIndex={-1}
          className="max-w-[80%] bg-surface border border-border rounded-lg px-4 py-3"
        >
          <p className="text-body text-text-muted">{message.content}</p>
        </div>
      </div>
    );
  }

  // OK answer state
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary-subtle flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles size={16} className="text-primary" aria-hidden="true" />
      </div>
      <div
        ref={ref}
        tabIndex={-1}
        className="max-w-[85%] bg-surface border border-border rounded-lg px-4 py-3"
      >
        <p className="text-body text-text">{message.content}</p>
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
