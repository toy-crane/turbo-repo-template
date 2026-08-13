import { useNavigation } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { useAuthSession } from "@/features/auth/state/auth-session";
import { useChatSession } from "@/features/chat/state/use-chat-session";
import { ChatPanel } from "@/features/chat/ui/chat-panel";

/**
 * The native stack tells this screen when its push animation has finished.
 * `useNavigation` types only the events every navigator shares, so the shape of
 * the one event we listen for is declared here.
 */
interface ScreenTransition {
  addListener: (
    event: "transitionEnd",
    listener: (payload: { data: { closing: boolean } }) => void
  ) => () => void;
}

/**
 * One conversation, for as long as this screen is on the stack.
 *
 * The screen owns the session rather than the panel: the conversation starts
 * when the person opens this screen and ends when they leave it, so "new
 * conversation" is a push and nothing has to clear state in place. The access
 * token comes from here because a feature does not read another feature's
 * state.
 *
 * Entry focus is timed here for the same reason. Focusing while the push is
 * still running makes iOS carry the rising keyboard along with the screen, so
 * it slides in from the right and the composer then climbs from the bottom —
 * two directions for one arrival. Waiting for the transition to finish leaves
 * the keyboard and the composer moving up together.
 */
export function ChatScreen() {
  const { session } = useAuthSession();
  const chat = useChatSession(session?.access_token);
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<ScreenTransition>();
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(
    () =>
      navigation.addListener("transitionEnd", ({ data }) => {
        if (!data.closing) {
          setHasArrived(true);
        }
      }),
    [navigation]
  );

  return (
    <ChatPanel
      chat={chat}
      shouldFocusInput={hasArrived}
      topInset={Platform.OS === "ios" ? headerHeight : 0}
    />
  );
}
