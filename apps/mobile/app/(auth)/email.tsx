import { router } from "expo-router";

import { SignInEmailScreen } from "@/screens/auth/sign-in-email-screen";

function goToCode(email: string) {
  router.push({ params: { email }, pathname: "/(auth)/code" });
}

export default function SignInEmailRoute() {
  return <SignInEmailScreen onSent={goToCode} />;
}
