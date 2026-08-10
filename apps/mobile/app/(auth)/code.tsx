import { Redirect, useLocalSearchParams } from "expo-router";

import { SignInCodeScreen } from "@/features/auth/ui/sign-in-code-screen";

export default function SignInCodeRoute() {
  const { email } = useLocalSearchParams<{ email?: string }>();

  // Nothing to verify without an address. Reaching this route directly means
  // the step before it never ran, so send the person back to it.
  if (!email) {
    return <Redirect href="/(auth)/email" />;
  }

  return <SignInCodeScreen email={email} />;
}
