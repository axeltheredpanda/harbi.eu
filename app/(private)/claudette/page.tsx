import { listConversations } from "@/backend/chat/conversations";
import { ChatShell } from "./chat-shell";

export default async function ClaudettePage() {
  const conversations = await listConversations();

  return <ChatShell initialConversations={conversations} />;
}
