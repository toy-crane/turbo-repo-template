import { Button } from "heroui-native/button";
import { Card } from "heroui-native/card";
import { Chip } from "heroui-native/chip";
import { Description } from "heroui-native/description";
import { useThemeColor } from "heroui-native/hooks";
import { Input } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { Spinner } from "heroui-native/spinner";
import { TextField } from "heroui-native/text-field";
import { useToast } from "heroui-native/toast";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";

const previewDelayMs = 650;

export function HomeScreen() {
  const [contentName, setContentName] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const accentForeground = useThemeColor("accent-foreground");
  const { toast } = useToast();

  useEffect(
    () => () => {
      if (completionTimer.current !== undefined) {
        clearTimeout(completionTimer.current);
      }
    },
    []
  );

  const previewComponents = useCallback(() => {
    setIsPreviewing(true);
    completionTimer.current = setTimeout(() => {
      const previewName = contentName.trim() || "React Native UI";

      setIsPreviewing(false);
      toast.show({
        description: `${previewName} 샘플의 입력과 피드백 상태를 확인했습니다.`,
        label: "HeroUI 체험 완료",
        placement: "bottom",
        variant: "success",
      });
    }, previewDelayMs);
  }, [contentName, toast]);

  return (
    <ScrollView
      className="bg-background"
      contentContainerClassName="gap-4 px-5 pt-5 pb-6"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Card
        accessibilityLabel="HeroUI Native preview. React Native UI. 네이티브 Stack 안에서 HeroUI 콘텐츠 컴포넌트와 canonical token을 확인합니다."
        accessible
        className="gap-4 p-5"
      >
        <Card.Header>
          <Chip color="accent" size="sm" variant="soft">
            HeroUI Native
          </Chip>
        </Card.Header>
        <Card.Body className="gap-2">
          <Card.Title className="text-xl">React Native UI</Card.Title>
          <Card.Description>
            네이티브 Stack 안에서 HeroUI 콘텐츠 컴포넌트와 canonical token을
            확인합니다.
          </Card.Description>
        </Card.Body>
      </Card>

      <TextField>
        <Label>콘텐츠 이름</Label>
        <Input
          accessibilityLabel="콘텐츠 이름"
          onChangeText={setContentName}
          placeholder="이름을 입력해보세요"
          returnKeyType="done"
          value={contentName}
        />
        <Description>입력값은 완료 Toast의 메시지에 반영됩니다.</Description>
      </TextField>

      <Button isDisabled={isPreviewing} onPress={previewComponents}>
        {isPreviewing ? (
          <>
            <Spinner color={accentForeground} size="sm" />
            <Button.Label>적용 중</Button.Label>
          </>
        ) : (
          "HeroUI 체험하기"
        )}
      </Button>
    </ScrollView>
  );
}
