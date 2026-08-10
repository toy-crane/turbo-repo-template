import { router, Stack } from "expo-router";

import { HomeScreen } from "@/screens/home/home-screen";
import { InitialAvatar } from "@/screens/home/initial-avatar";

function openSettings() {
  router.push("/settings");
}

export default function HomeRoute() {
  return (
    <>
      <HomeScreen />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <InitialAvatar initial="T" onPress={openSettings} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}
