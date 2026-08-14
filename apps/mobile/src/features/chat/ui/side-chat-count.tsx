import type { MenuTriggerRef } from "heroui-native/menu";
import { Menu } from "heroui-native/menu";
import { useCallback, useRef } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { Icon } from "@/shared/ui/icon";
import {
  openSideChatAction,
  sideChatCountAction,
  sideChatCountLabel,
} from "./chat-labels";
import { FloatingSurface } from "./floating-surface";

/** One side chat, as the way back into it reads. */
export interface SideChatEntry {
  id: string;
  /** The newest thing said in it, as one plain line. */
  lastLine: string;
  phrase: string;
}

const COUNT_HEIGHT = 36;
const COUNT_GAP = 6;
const COUNT_PADDING_HORIZONTAL = 14;
/**
 * The list is as wide as the composer it sits over. A phrase cut after a few
 * words tells two side chats apart badly, and the composer's own room is the
 * most this screen has to give it.
 */
const COMPOSER_SIDE_PADDING = 40;

const glassPill = {
  alignItems: "center",
  borderRadius: COUNT_HEIGHT / 2,
  flexDirection: "row",
  gap: COUNT_GAP,
  height: COUNT_HEIGHT,
  justifyContent: "center",
  paddingHorizontal: COUNT_PADDING_HORIZONTAL,
} as const;

function ReopenItem({
  entry,
  onOpen,
}: {
  entry: SideChatEntry;
  onOpen: (id: string) => void;
}) {
  const open = useCallback(() => onOpen(entry.id), [entry.id, onOpen]);

  return (
    <Menu.Item
      accessibilityLabel={openSideChatAction(entry.phrase)}
      onPress={open}
    >
      {/*
        The phrase says where the side chat started and the line under it says
        how far it has gone, which is what tells two side chats from similar
        phrases apart. Only the phrase is in the name a screen reader reads.
      */}
      <View className="flex-1 gap-0.5">
        <Menu.ItemTitle numberOfLines={1}>{entry.phrase}</Menu.ItemTitle>
        <Menu.ItemDescription numberOfLines={1}>
          {entry.lastLine}
        </Menu.ItemDescription>
      </View>
      <Icon name="forward" size="sm" tone="muted" />
    </Menu.Item>
  );
}

/**
 * The way back into this conversation's side chats.
 *
 * It floats above the composer rather than hanging under the answer a side
 * chat came from, so the way back is in the same place wherever the person is
 * reading. That is also why it counts the conversation rather than one answer:
 * which answer each side chat started in is told by the phrase in the list.
 *
 * One side chat opens straight away. Several open the list first.
 */
export function SideChatCount({
  chats,
  isDisabled = false,
  onOpen,
}: {
  chats: SideChatEntry[];
  isDisabled?: boolean;
  onOpen: (id: string) => void;
}) {
  const triggerRef = useRef<MenuTriggerRef>(null);
  const { width } = useWindowDimensions();
  const [only] = chats;
  const press = useCallback(() => {
    if (chats.length === 1) {
      onOpen(only.id);

      return;
    }

    triggerRef.current?.open();
  }, [chats.length, onOpen, only]);

  if (chats.length === 0) {
    return null;
  }

  return (
    <Menu style={{ alignItems: "center" }}>
      <Menu.Trigger asChild ref={triggerRef}>
        {/*
          The trigger marks its child as a button and opens on a plain tap.
          Reaching it as a `View` leaves both to the control inside, which is
          what lets one side chat reopen without a list in the way.
        */}
        <View role="none">
          <Pressable
            accessibilityLabel={sideChatCountAction(chats.length)}
            accessibilityRole="button"
            accessibilityState={{ disabled: isDisabled }}
            className={isDisabled ? "opacity-40" : undefined}
            disabled={isDisabled}
            onPress={press}
            testID="chat-side-count"
          >
            <FloatingSurface
              glassShape={glassPill}
              surfaceClassName="h-9 flex-row items-center justify-center gap-1.5 rounded-full bg-surface px-3.5"
              testID="chat-side-count-glass"
            >
              <Icon name="sideChat" size="sm" tone="muted" />
              <Text className="text-foreground text-sm leading-5">
                {sideChatCountLabel(chats.length)}
              </Text>
            </FloatingSurface>
          </Pressable>
        </View>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Overlay />
        <Menu.Content
          align="center"
          placement="top"
          presentation="popover"
          width={width - COMPOSER_SIDE_PADDING}
        >
          {chats.map((entry) => (
            <ReopenItem entry={entry} key={entry.id} onOpen={onOpen} />
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu>
  );
}
