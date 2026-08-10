import { useAuthSession } from "@/features/auth/state/auth-session";
import { ChatPanel } from "@/features/chat/ui/chat-panel";

/**
 * Home is where the chat feature meets the signed-in session.
 *
 * Neither feature knows about the other, so this is the one place that reads
 * the session and hands the chat its access token.
 */
export function HomeScreen() {
  const { session } = useAuthSession();

  return <ChatPanel accessToken={session?.access_token} />;
}
