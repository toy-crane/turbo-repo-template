import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "../../theme/app-theme-provider";

export function HomeScreen() {
  const { colors } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <View
        accessibilityLabel="Home placeholder"
        accessible
        style={[styles.card, { backgroundColor: colors.background.surface }]}
      >
        <Text style={[styles.message, { color: colors.text.primary }]}>
          콘텐츠를 준비 중입니다.
        </Text>
      </View>
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
