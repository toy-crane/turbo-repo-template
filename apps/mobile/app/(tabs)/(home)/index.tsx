import { router, Stack } from "expo-router";

import { HomeScreen } from "@/screens/home/home-screen";
import { ProfileAvatarButton } from "@/screens/home/profile-avatar-button";

function openSettings() {
  router.push("/settings");
}

export default function HomeRoute() {
  return (
    <>
      <HomeScreen />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <ProfileAvatarButton onPress={openSettings} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}
