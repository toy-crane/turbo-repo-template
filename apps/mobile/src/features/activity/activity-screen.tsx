import { Card } from "heroui-native/card";
import { Chip } from "heroui-native/chip";
import { ScrollView, Text } from "react-native";

const activityPatterns = [
  {
    category: "Theme",
    color: "accent",
    description: "Canonical color tokens were resolved for light and dark.",
    title: "Theme tokens synced",
  },
  {
    category: "Shell",
    color: "success",
    description: "The native Stack toolbar remained the route owner.",
    title: "Native shell verified",
  },
  {
    category: "UI",
    color: "warning",
    description: "HeroUI content components rendered inside the screen body.",
    title: "Component previewed",
  },
] as const;

const activityItems = Array.from({ length: 18 }, (_, index) => {
  const pattern = activityPatterns[index % activityPatterns.length];

  if (!pattern) {
    throw new Error("Activity pattern is missing");
  }

  return {
    ...pattern,
    position: index + 1,
    time: `${index + 1}m ago`,
  };
});

export function ActivityScreen() {
  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-3 px-5 pt-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
    >
      {activityItems.map((item) => (
        <Card
          accessibilityLabel={`Activity item ${item.position}. ${item.title}. ${item.category}. ${item.description} ${item.time}`}
          accessible
          className="gap-3 p-4"
          key={item.position}
          variant="secondary"
        >
          <Card.Header className="w-full flex-row items-center justify-between">
            <Chip color={item.color} size="sm" variant="soft">
              {item.category}
            </Chip>
            <Text className="text-muted text-xs">{item.time}</Text>
          </Card.Header>
          <Card.Body className="gap-1">
            <Card.Title>
              {`${item.title} ${item.position.toString().padStart(2, "0")}`}
            </Card.Title>
            <Card.Description>{item.description}</Card.Description>
          </Card.Body>
        </Card>
      ))}
    </ScrollView>
  );
}
