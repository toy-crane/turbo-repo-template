import Constants from "expo-constants";
import { Platform } from "react-native";

import { useProviderSignIn } from "@/features/auth/state/use-provider-sign-in";
import { AuthError, AuthScreen, AuthSubtitle } from "./auth-screen";
import { LoginButton } from "./login-button";
import { signInLabels } from "./sign-in-labels";

/**
 * The first screen of the auth stack: which way in.
 *
 * It holds no input. Email gets its own screen so this one stays a choice, and
 * so the buttons can sit where the thumb is.
 */
export function SignInMethodScreen({
  onChooseEmail,
}: {
  onChooseEmail: () => void;
}) {
  const provider = useProviderSignIn();
  const appName = Constants.expoConfig?.name ?? "앱";

  return (
    <AuthScreen
      footer={
        <>
          <LoginButton
            isDisabled={provider.isBusy}
            label={signInLabels.google}
            onPress={provider.startGoogle}
            provider="google"
            testID="sign-in-google"
          />

          {Platform.OS === "ios" ? (
            <LoginButton
              isDisabled={provider.isBusy}
              label={signInLabels.apple}
              onPress={provider.startApple}
              provider="apple"
              testID="sign-in-apple"
            />
          ) : null}

          <LoginButton
            isDisabled={provider.isBusy}
            label={signInLabels.emailMethod}
            onPress={onChooseEmail}
            provider="email"
            testID="sign-in-email-method"
          />

          {provider.failure ? (
            <AuthError testID="sign-in-error-provider">
              {provider.failure.message}
            </AuthError>
          ) : null}
        </>
      }
      subtitle={
        <AuthSubtitle>
          로그인하면 저장한 내용을 어느 기기에서나 볼 수 있어요.
        </AuthSubtitle>
      }
      title={appName}
    />
  );
}
