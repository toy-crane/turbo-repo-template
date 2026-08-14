import { Text, View } from "react-native";

/**
 * The phrase a side chat started from, at the top of its conversation.
 *
 * It is where the side chat came from rather than something said in it, so it
 * carries none of a message's actions and cannot be selected: another side
 * chat cannot start here, and the parent answer it was taken from is not this
 * screen's to change.
 */
export function SideChatSource({ phrase }: { phrase: string }) {
  return (
    <View
      className="mb-4 rounded-2xl bg-surface px-3.5 py-3"
      testID="side-chat-source"
    >
      <Text
        className="text-muted text-sm leading-5"
        selectable={false}
        testID="side-chat-source-phrase"
      >
        {phrase}
      </Text>
    </View>
  );
}
