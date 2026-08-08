import { ScrollView, StyleSheet, Text, View } from "react-native";

const placeholderItems = Array.from({ length: 18 }, (_, index) => index + 1);

export function ActivityScreen() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
    >
      {placeholderItems.map((position) => (
        <View
          accessibilityLabel={`Activity placeholder ${position}`}
          accessible
          className="bg-surface"
          key={position}
          style={styles.card}
        >
          <Text className="text-foreground" style={styles.message}>
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
