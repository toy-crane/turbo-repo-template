import Constants from "expo-constants";
import { Platform } from "react-native";

import { useProviderSignIn } from "@/features/auth/state/use-provider-sign-in";
import {
  AuthDivider,
  AuthError,
  AuthLayout,
} from "@/features/auth/ui/auth-layout";
import { SignInButton } from "@/features/auth/ui/sign-in-button";
import { signInLabels } from "@/features/auth/ui/sign-in-labels";

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
    <AuthLayout
      footer={
        <>
          <SignInButton
            isBusy={provider.pending === "google"}
            isDisabled={provider.isBusy}
            label={signInLabels.google}
            method="google"
            onPress={provider.startGoogle}
            testID="sign-in-google"
          />

          {Platform.OS === "ios" ? (
            <SignInButton
              isBusy={provider.pending === "apple"}
              isDisabled={provider.isBusy}
              label={signInLabels.apple}
              method="apple"
              onPress={provider.startApple}
              testID="sign-in-apple"
            />
          ) : null}

          <AuthDivider />

          <SignInButton
            isDisabled={provider.isBusy}
            label={signInLabels.emailMethod}
            method="email"
            onPress={onChooseEmail}
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
