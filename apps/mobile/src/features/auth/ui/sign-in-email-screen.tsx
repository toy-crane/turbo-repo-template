import { Button } from "heroui-native/button";
import { Input } from "heroui-native/input";
import { Spinner } from "heroui-native/spinner";
import { TextField } from "heroui-native/text-field";
import type { TextInput } from "react-native";
import { View } from "react-native";

import { useEmailRequest } from "@/features/auth/state/use-email-request";
import { useFocusOnArrival } from "@/shared/navigation/use-screen-arrival";
import { AuthError, AuthScreen } from "./auth-screen";
import { signInLabels } from "./sign-in-labels";

/**
 * The address step.
 *
 * No visible label above the field: the placeholder says what goes in it and
 * the accessibility name carries the same word, so a label would only repeat
 * itself and push the field down.
 */
export function SignInEmailScreen({
  onSent,
}: {
  onSent: (email: string) => void;
}) {
  const form = useEmailRequest(onSent);
  const inputRef = useFocusOnArrival<TextInput>();

  return (
    <AuthScreen
      footer={
        <Button
          accessibilityLabel={signInLabels.submitEmail}
          isDisabled={form.isBusy || !form.isSendable}
          onPress={form.submit}
        >
          {form.isBusy ? <Spinner size="sm" /> : null}
          <Button.Label>{signInLabels.submitEmail}</Button.Label>
        </Button>
      }
      title="이메일 주소를 입력해 주세요"
    >
      <View className="gap-2">
        <TextField isInvalid={form.failure !== undefined}>
          <Input
            accessibilityLabel={signInLabels.email}
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            onChangeText={form.changeEmail}
            // Guarded like the button below it: the return key is the same
            // action, so it must not reach states the button declares closed.
            onSubmitEditing={
              form.isBusy || !form.isSendable ? undefined : form.submit
            }
            placeholder="you@example.com"
            ref={inputRef}
            returnKeyType="send"
            testID="sign-in-email"
            value={form.email}
          />
        </TextField>

        {form.failure ? (
          <AuthError testID="sign-in-error-email">
            {form.failure.message}
          </AuthError>
        ) : null}
      </View>
    </AuthScreen>
  );
}
