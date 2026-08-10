import { router } from "expo-router";

import { SignInEmailScreen } from "@/features/auth/ui/sign-in-email-screen";

function goToCode(email: string) {
  router.push({ params: { email }, pathname: "/(auth)/code" });
}

export default function SignInEmailRoute() {
  return <SignInEmailScreen onSent={goToCode} />;
}
