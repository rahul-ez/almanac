// frontend/src/hooks/useGenieConversation.ts
// Holds the in-memory Genie conversation for the Ask Genie page.
// Persists across navigation within the same session (owned by AskGenie page component).
// Per ui-rules.md: "the Genie conversation persists in memory and is restored when
// the user returns to Ask Genie during the same session."

import { useCallback, useRef, useState } from "react";
import { askGenie, type GenieResponse } from "../api/client";

export type MessageRole = "user" | "assistant";

export type AssistantStatus = "ok" | "no_answer" | "error" | "loading";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  // Assistant-only fields
  status?: AssistantStatus;
  sql?: string;
  rows?: Record<string, unknown>[];
}

let messageCounter = 0;
function nextId(): string {
  return `msg-${++messageCounter}`;
}

export interface GenieConversationState {
  messages: Message[];
  isLoading: boolean;
  sendQuestion: (question: string) => Promise<void>;
}

export function useGenieConversation(): GenieConversationState {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Stable ref for the pending assistant message ID so we can update it
  const pendingIdRef = useRef<string | null>(null);

  const sendQuestion = useCallback(async (question: string) => {
    if (isLoading) return;

    // 1. Append user message immediately
    const userMsg: Message = { id: nextId(), role: "user", content: question };
    // 2. Append loading assistant placeholder
    const loadingId = nextId();
    pendingIdRef.current = loadingId;
    const loadingMsg: Message = {
      id: loadingId,
      role: "assistant",
      content: "Checking campus data…",
      status: "loading",
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const res: GenieResponse = await askGenie(question);

      const assistantMsg: Message = {
        id: loadingId,
        role: "assistant",
        content: res.answer ?? res.message ?? "No answer returned.",
        status: res.status,
        sql: res.sql,
        rows: res.rows,
      };

      // Replace loading placeholder with real answer
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? assistantMsg : m))
      );
    } catch {
      const errorMsg: Message = {
        id: loadingId,
        role: "assistant",
        content: "Couldn't reach campus data. The question wasn't answered. Nothing was changed.",
        status: "error",
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === loadingId ? errorMsg : m))
      );
    } finally {
      setIsLoading(false);
      pendingIdRef.current = null;
    }
  }, [isLoading]);

  return { messages, isLoading, sendQuestion };
}
