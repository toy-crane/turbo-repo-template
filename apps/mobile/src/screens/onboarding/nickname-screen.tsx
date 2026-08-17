import { Input } from "heroui-native/input";
import { Label } from "heroui-native/label";
import { TextField } from "heroui-native/text-field";
import type { TextInput } from "react-native";
import { View } from "react-native";

import { useNicknameStep } from "@/features/auth/state/use-nickname-step";
import { AuthError, AuthLayout } from "@/features/auth/ui/auth-layout";
import { onboardingLabels } from "@/features/auth/ui/onboarding-labels";
import { useFocusOnArrival } from "@/shared/navigation/use-screen-arrival";
import { Button } from "@/shared/ui/button";

/**
 * The first of the two screens a new account sees.
 *
 * No back control and no way past it: this is the root of the onboarding stack,
 * and the app screens behind it assume a nickname exists. No progress bar or
 * step count either — there are two fields, and counting them says less than
 * the two headings already do.
 *
 * `다음` is the exception the writing rules allow. It neither saves the value
 * nor creates the account id, so naming a destination would describe something
 * this button does not do.
 */
export function NicknameScreen({ onNext }: { onNext: () => void }) {
  const form = useNicknameStep(onNext);
  const inputRef = useFocusOnArrival<TextInput>();

  return (
    <AuthLayout
      footer={
        <Button
          accessibilityLabel={onboardingLabels.next}
          isDisabled={!form.canContinue}
          onPress={form.submit}
        >
          {onboardingLabels.next}
        </Button>
      }
      title="닉네임을 정해 주세요"
    >
      <View className="gap-2">
        <TextField isInvalid={form.message !== undefined}>
          <Label>{onboardingLabels.nickname}</Label>
          <Input
            accessibilityLabel={onboardingLabels.nickname}
            autoComplete="nickname"
            onChangeText={form.changeNickname}
            onSubmitEditing={form.canContinue ? form.submit : undefined}
            placeholder={onboardingLabels.nickname}
            ref={inputRef}
            returnKeyType="next"
            testID="onboarding-nickname"
            value={form.nickname}
          />
        </TextField>

        {form.message ? (
          <AuthError testID="onboarding-error-nickname">
            {form.message}
          </AuthError>
        ) : null}
      </View>
    </AuthLayout>
  );
}
