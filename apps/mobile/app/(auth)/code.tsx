import { Redirect, useLocalSearchParams } from "expo-router";

import { SignInCodeScreen } from "@/screens/auth/sign-in-code-screen";

/**
 * Expo Router hands back an array when a query key appears more than once, and
 * a deep link can do that. Taking the first entry keeps a single address on its
 * way to `verifyOtp` instead of a comma-joined list.
 */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignInCodeRoute() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = firstParam(params.email)?.trim();

  // Nothing to verify without an address. Reaching this route directly means
  // the step before it never ran, so send the person back to it.
  if (!email) {
    return <Redirect href="/(auth)/email" />;
  }

  return <SignInCodeScreen email={email} />;
}
