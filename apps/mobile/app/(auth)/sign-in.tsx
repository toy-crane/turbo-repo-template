import { router } from "expo-router";

import { SignInMethodScreen } from "@/features/auth/ui/sign-in-method-screen";

function goToEmail() {
  router.push("/(auth)/email");
}

export default function SignInRoute() {
  return <SignInMethodScreen onChooseEmail={goToEmail} />;
}
