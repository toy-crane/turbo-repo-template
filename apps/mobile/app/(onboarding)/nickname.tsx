import { router } from "expo-router";

import { NicknameScreen } from "@/features/auth/ui/nickname-screen";

function goToUsername() {
  router.push("/(onboarding)/username");
}

export default function NicknameRoute() {
  return <NicknameScreen onNext={goToUsername} />;
}
