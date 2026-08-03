import { ChatViewportLock } from "./chat-viewport-lock";

/**
 * Chat fills the viewport below the private header — no page scroll.
 */
export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 top-14 bottom-0 z-[1] flex flex-col overflow-hidden bg-canvas">
      <ChatViewportLock />
      {children}
    </div>
  );
}
