import { listConversations } from "@/backend/chat/conversations";
import { ChatShell } from "./chat-shell";

export default async function ChatPage() {
  const conversations = await listConversations();
  return <ChatShell initialConversations={conversations} />;
}
