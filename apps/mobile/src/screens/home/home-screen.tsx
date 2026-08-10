import { Text, View } from "react-native";

/**
 * The starting point for a conversation.
 *
 * Home holds no chat state. The header's new-conversation button pushes the
 * chat screen, and that screen owns the conversation for as long as it is on
 * the stack.
 */
export function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-8">
      <Text className="font-semibold text-2xl text-foreground">
        무엇을 도와드릴까요?
      </Text>
      <Text className="text-center text-muted">
        위의 새 대화 버튼을 누르면 바로 물어볼 수 있어요.
      </Text>
    </View>
  );
}
