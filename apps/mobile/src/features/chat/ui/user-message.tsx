import type { MenuTriggerRef } from "heroui-native/menu";
import { Menu } from "heroui-native/menu";
import { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { Icon } from "@/shared/ui/icon";
import { chatLabels } from "./chat-labels";

/** Long enough not to fire while the person is scrolling the list. */
const LONG_PRESS_DELAY_MS = 400;
/**
 * The item titles stretch to fill the card, so a card sized to its own content
 * collapses them to nothing and leaves only the icons standing. This is the
 * width the approved prototype used.
 */
const MENU_WIDTH = 208;

/**
 * A question, and the menu a long press opens on it.
 *
 * HeroUI's trigger opens its menu on a plain tap, which this screen does not
 * want: a tap on a message does nothing. So the bubble reaches the trigger as
 * a `View`, which ignores the press handler the trigger hands down, and the
 * long press calls the trigger's own `open()` — the call that measures the
 * bubble and places the menu beside it.
 */
export function UserMessage({
  canOpenMenu,
  onCopy,
  onEdit,
  text,
}: {
  canOpenMenu: boolean;
  onCopy: () => void;
  onEdit: () => void;
  text: string;
}) {
  const triggerRef = useRef<MenuTriggerRef>(null);
  const openMenu = useCallback(() => {
    triggerRef.current?.open();
  }, []);

  return (
    <Menu style={{ alignItems: "flex-end" }}>
      <Menu.Trigger asChild ref={triggerRef}>
        {/*
          The role is taken back on purpose. The trigger marks its child as a
          button, and this bubble is the words of a message that happens to
          hold a menu, not a control that does something when tapped.
        */}
        <View className="max-w-[85%] rounded-2xl bg-accent" role="none">
          <Pressable
            className="px-4 py-3"
            delayLongPress={LONG_PRESS_DELAY_MS}
            onLongPress={canOpenMenu ? openMenu : undefined}
          >
            <Text
              className="text-accent-foreground text-base leading-6"
              // Selecting a message would take the long press the menu needs.
              // The menu's own copy is how a question gets taken away.
              selectable={false}
              testID="chat-message-user"
            >
              {text}
            </Text>
          </Pressable>
        </View>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content
          align="end"
          placement="bottom"
          presentation="popover"
          width={MENU_WIDTH}
        >
          <Menu.Item onPress={onCopy}>
            <Menu.ItemTitle>{chatLabels.copyMessage}</Menu.ItemTitle>
            <Icon name="copy" size="sm" tone="muted" />
          </Menu.Item>
          <Menu.Item onPress={onEdit}>
            <Menu.ItemTitle>{chatLabels.editMessage}</Menu.ItemTitle>
            <Icon name="edit" size="sm" tone="muted" />
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
