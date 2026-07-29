import { listConversations } from "@/backend/chat/conversations";
import { createClient } from "@/backend/supabase/server";
import { getPublicSiteSettings } from "@/backend/settings";
import { isLouisEmail, LOUIS_COPY } from "@/backend/louis";
import { ChatShell } from "./chat-shell";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getPublicSiteSettings();
  const conversations = await listConversations();

  const claudetteBlocked =
    settings.louisJokeMode && isLouisEmail(user?.email ?? null);

  return (
    <ChatShell
      initialConversations={conversations}
      claudetteBlocked={claudetteBlocked}
      claudetteBlockMessage={
        claudetteBlocked ? LOUIS_COPY.claudetteBlock : undefined
      }
    />
  );
}
