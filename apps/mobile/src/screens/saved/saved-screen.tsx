import { Card } from "heroui-native/card";
import { Chip } from "heroui-native/chip";
import { ScrollView, Text, View } from "react-native";

import { Icon } from "@/shared/ui/icon";

const savedItems = [
  {
    category: "Theme",
    color: "accent",
    description:
      "HeroUI의 background, foreground, surface를 canonical token으로 사용합니다.",
    title: "디자인 시스템 결정",
  },
  {
    category: "Navigation",
    color: "success",
    description:
      "Stack 헤더와 formSheet는 Expo Router의 네이티브 셸이 계속 소유합니다.",
    title: "네이티브 셸 경계",
  },
  {
    category: "HeroUI",
    color: "warning",
    description:
      "Card, Chip, TextField, Button, Spinner, Toast를 실제 화면에서 검증합니다.",
    title: "컴포넌트 후보",
  },
] as const;

export function SavedScreen() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-3 px-5 pt-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="mb-1 flex-row items-center gap-2">
        <Icon name="bookmark" testID="saved-bookmark-icon" tone="accent" />
        <Text className="font-semibold text-base text-foreground">
          저장한 결정
        </Text>
      </View>
      {savedItems.map((item) => (
        <Card
          accessibilityLabel={`Saved item ${item.title}. ${item.category}. ${item.description}`}
          accessible
          className="gap-3 p-5"
          key={item.title}
        >
          <Card.Header>
            <Chip color={item.color} size="sm" variant="soft">
              {item.category}
            </Chip>
          </Card.Header>
          <Card.Body className="gap-1.5">
            <Card.Title>{item.title}</Card.Title>
            <Card.Description>{item.description}</Card.Description>
          </Card.Body>
        </Card>
      ))}
    </ScrollView>
  );
}
