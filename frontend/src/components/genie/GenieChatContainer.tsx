// frontend/src/components/genie/GenieChatContainer.tsx
// The one bounded Genie panel.
// Per campus-companion-redesign-spec.md §4 & §5:
// Empty state leads directly with typography (no mascot icon).
// Heading pulled to upper third of container with suggested chips below.

import { useEffect, useRef, useState } from "react";
import type { Message } from "../../hooks/useGenieConversation";
import { GenieMessage } from "./GenieMessage";
import { GenieQueryInput } from "./GenieQueryInput";
import { SuggestedQuestionChip } from "./SuggestedQuestionChip";

const SUGGESTED_QUESTIONS = [
  "Is Lab 204 available right now?",
  "Which labs are free at 3pm today?",
  "Is Prof. Rao free tomorrow morning?",
  "How many students registered for the AI Workshop?",
];

interface GenieChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (question: string) => void;
}

export function GenieChatContainer({ messages, isLoading, onSend }: GenieChatContainerProps) {
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface shadow-raised overflow-hidden">
      {/* Message area */}
      <div
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 min-h-[420px] max-h-[60vh]"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions"
        aria-label="Genie conversation"
      >
        {isEmpty ? (
          /* Empty state — leads with typography, no mascot icon */
          <div className="flex flex-col items-center justify-start h-full gap-6 pt-12 pb-8">
            <div className="flex flex-col items-center gap-2 text-center max-w-md">
              <h2 className="font-display text-h1 font-semibold text-text">
                Ask Genie
              </h2>
              <p className="text-body text-text-muted">
                Ask any campus question in plain English — room availability, teacher schedules,
                event attendance, and more.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <SuggestedQuestionChip
                  key={q}
                  question={q}
                  onClick={(q) => { onSend(q); }}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <>
            {messages.map((msg, i) => (
              <GenieMessage
                key={msg.id}
                message={msg}
                isNewest={i === messages.length - 1}
              />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Query input — sticky at bottom */}
      <GenieQueryInput
        value={inputValue}
        onChange={setInputValue}
        onSubmit={(q) => { onSend(q); setInputValue(""); }}
        disabled={isLoading}
      />
    </div>
  );
}
