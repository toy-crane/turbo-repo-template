import { ScrollView, StyleSheet, Text, View } from "react-native";

export function HomeScreen() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      <View
        accessibilityLabel="Home placeholder"
        accessible
        className="bg-surface"
        style={styles.card}
      >
        <Text className="text-foreground" style={styles.message}>
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
