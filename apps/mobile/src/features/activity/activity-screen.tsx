import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { getSemanticColors } from "../../theme/semantic-colors";

const placeholderItems = Array.from({ length: 18 }, (_, index) => index + 1);

export function ActivityScreen() {
  const colors = getSemanticColors(useColorScheme());

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      {placeholderItems.map((position) => (
        <View
          accessibilityLabel={`Activity placeholder ${position}`}
          accessible
          key={position}
          style={[styles.card, { backgroundColor: colors.background.surface }]}
        >
          <Text style={[styles.message, { color: colors.text.primary }]}>
            {`Placeholder ${position.toString().padStart(2, "0")}`}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  content: {
    gap: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  message: {
    fontSize: 17,
  },
  screen: {
    flex: 1,
  },
});
