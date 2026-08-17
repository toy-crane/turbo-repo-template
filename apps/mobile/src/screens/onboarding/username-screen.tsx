import { InputGroup } from "heroui-native/input-group";
import { Label } from "heroui-native/label";
import { Spinner } from "heroui-native/spinner";
import { TextField } from "heroui-native/text-field";
import { useCallback } from "react";
import type { TextInput } from "react-native";
import { Pressable, Text, View } from "react-native";

import { useUsernameStep } from "@/features/auth/state/use-username-step";
import { AuthError, AuthLayout } from "@/features/auth/ui/auth-layout";
import { onboardingLabels } from "@/features/auth/ui/onboarding-labels";
import { useFocusOnArrival } from "@/shared/navigation/use-screen-arrival";
import { Button } from "@/shared/ui/button";

/**
 * The second onboarding screen, and the one that saves.
 *
 * The rules for an account id are not written on the screen. A person typing
 * their own name never meets most of them, and a list of them is a wall in
 * front of a single field — so the screen stays quiet until a value actually
 * runs into one.
 *
 * No `@` anywhere. It would promise mentions and profile addresses this product
 * does not have, and it would make the value shown differ from the value typed.
 */
export function UsernameScreen() {
  const form = useUsernameStep();
  const inputRef = useFocusOnArrival<TextInput>();

  return (
    <AuthLayout
      footer={
        <Button
          accessibilityLabel={onboardingLabels.start}
          isDisabled={!form.canSubmit}
          isPending={form.isSaving}
          onPress={form.submit}
        >
          {onboardingLabels.start}
        </Button>
      }
      title="아이디를 정해 주세요"
    >
      <View className="gap-2">
        <TextField isInvalid={form.message !== undefined}>
          <Label>{onboardingLabels.username}</Label>
          <InputGroup>
            <InputGroup.Input
              accessibilityLabel={onboardingLabels.username}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              onChangeText={form.changeUsername}
              onSubmitEditing={form.canSubmit ? form.submit : undefined}
              placeholder={onboardingLabels.username}
              ref={inputRef}
              returnKeyType="done"
              spellCheck={false}
              testID="onboarding-username"
              value={form.username}
            />
            <InputGroup.Suffix>
              <UsernameMark
                isAvailable={form.isAvailable}
                isChecking={form.isChecking}
              />
            </InputGroup.Suffix>
          </InputGroup>
        </TextField>

        {form.message ? (
          <UsernameMessage
            canRetry={form.isCheckFailed}
            message={form.message}
            onRetry={form.retryCheck}
          />
        ) : null}
      </View>

      {form.suggestions.length > 0 ? (
        <UsernameSuggestions
          onChoose={form.chooseSuggestion}
          suggestions={form.suggestions}
        />
      ) : null}
    </AuthLayout>
  );
}

/**
 * Whether the id is being checked, or free.
 *
 * The check is drawn as a character rather than an icon: the app has no icon
 * system yet, and one glyph does not justify adding one. Colour and shape are
 * not the message either — the accessible name is, so a screen reader hears
 * that the id is free rather than that there is a green circle.
 */
function UsernameMark({
  isAvailable,
  isChecking,
}: {
  isAvailable: boolean;
  isChecking: boolean;
}) {
  if (isChecking) {
    return (
      <View
        accessibilityLabel={onboardingLabels.checking}
        accessibilityRole="progressbar"
        accessible
        testID="onboarding-username-checking"
      >
        <Spinner size="sm" />
      </View>
    );
  }

  if (!isAvailable) {
    return null;
  }

  return (
    <View
      accessibilityLabel={onboardingLabels.available}
      accessible
      className="h-5 w-5 items-center justify-center rounded-full bg-success"
      testID="onboarding-username-available"
    >
      <Text className="font-bold text-success-foreground text-xs">✓</Text>
    </View>
  );
}

/**
 * The message under the field.
 *
 * A failed check is the one message the person can act on directly, so in that
 * state the text is the retry control. It looks the same either way; what
 * changes is that it now has a role and a name saying it can be pressed.
 */
function UsernameMessage({
  canRetry,
  message,
  onRetry,
}: {
  canRetry: boolean;
  message: string;
  onRetry: () => void;
}) {
  if (!canRetry) {
    return <AuthError testID="onboarding-error-username">{message}</AuthError>;
  }

  return (
    <Pressable
      accessibilityLabel={onboardingLabels.retryCheck}
      accessibilityRole="button"
      onPress={onRetry}
      testID="onboarding-username-retry"
    >
      <AuthError testID="onboarding-error-username">{message}</AuthError>
    </Pressable>
  );
}

/** Free spellings of the id the person asked for, confirmed by the server. */
function UsernameSuggestions({
  onChoose,
  suggestions,
}: {
  onChoose: (value: string) => void;
  suggestions: string[];
}) {
  return (
    <View className="gap-2.5">
      <Text className="font-semibold text-muted text-sm">
        {onboardingLabels.suggestions}
      </Text>
      <View className="gap-2">
        {suggestions.map((candidate) => (
          <UsernameSuggestion
            candidate={candidate}
            key={candidate}
            onChoose={onChoose}
          />
        ))}
      </View>
    </View>
  );
}

function UsernameSuggestion({
  candidate,
  onChoose,
}: {
  candidate: string;
  onChoose: (value: string) => void;
}) {
  const choose = useCallback(() => {
    onChoose(candidate);
  }, [candidate, onChoose]);

  return (
    <Pressable
      accessibilityLabel={candidate}
      accessibilityRole="button"
      className="rounded-xl bg-surface px-3.5 py-3"
      onPress={choose}
      testID="onboarding-username-suggestion"
    >
      <Text className="font-semibold text-base text-foreground">
        {candidate}
      </Text>
    </Pressable>
  );
}
