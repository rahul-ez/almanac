// frontend/src/pages/AskGenie.tsx
// Ask Genie page: PageHeader + GenieChatContainer + RegisterModal.
// Conversation held in useGenieConversation hook — persists within session.

import { useState } from "react";
import { Container } from "../components/layout/Container";
import { PageHeader } from "../components/layout/PageHeader";
import { GenieChatContainer } from "../components/genie/GenieChatContainer";
import { RegisterModal } from "../components/dialogs/RegisterModal";
import { useGenieConversation } from "../hooks/useGenieConversation";

export function AskGenie() {
  const { messages, isLoading, sendQuestion } = useGenieConversation();
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  return (
    <Container className="py-8 flex flex-col gap-6">
      <PageHeader
        title="Ask Genie"
        description="Ask any campus question in plain English. Genie answers from live governed data."
      />
      <GenieChatContainer
        messages={messages}
        isLoading={isLoading}
        onSend={sendQuestion}
        onRegisterClick={(eventId) => setRegisteringEventId(eventId)}
      />

      {registeringEventId && (
        <RegisterModal
          eventId={registeringEventId}
          onClose={() => setRegisteringEventId(null)}
        />
      )}
    </Container>
  );
}
