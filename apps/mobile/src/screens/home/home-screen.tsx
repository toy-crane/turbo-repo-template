import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { ChatPanel } from "@/features/chat/ui/chat-panel";

/**
 * Home is where the chat feature meets the signed-in session.
 *
 * Neither feature knows about the other, so this is the one place that reads
 * the session and hands the chat its access token. Owning the chat session
 * here also lets the header's tools act on the same conversation the panel
 * shows.
 */
export function HomeScreen() {
  const { session } = useAuthSession();
  const chat = useChatSession(session?.access_token);

  return <ChatPanel chat={chat} />;
}
