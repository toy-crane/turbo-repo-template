import Constants from "expo-constants";
import { Platform } from "react-native";

import { useProviderSignIn } from "@/features/auth/state/use-provider-sign-in";
import { AuthDivider, AuthError, AuthScreen } from "./auth-screen";
import { LoginButton } from "./login-button";
import { signInLabels } from "./sign-in-labels";

/**
 * The first screen of the auth stack: which way in.
 *
 * It holds no input and no explaining. Email gets its own screen so this one
 * stays a choice, the buttons sit where the thumb is, and the app name is the
 * only thing above them.
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
            isBusy={provider.pending === "google"}
            isDisabled={provider.isBusy}
            label={signInLabels.google}
            onPress={provider.startGoogle}
            provider="google"
            testID="sign-in-google"
          />

          {Platform.OS === "ios" ? (
            <LoginButton
              isBusy={provider.pending === "apple"}
              isDisabled={provider.isBusy}
              label={signInLabels.apple}
              onPress={provider.startApple}
              provider="apple"
              testID="sign-in-apple"
            />
          ) : null}

          <AuthDivider />

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
      isRoot
      title={appName}
    />
  );
}
