import { router, Stack } from "expo-router";

import { HomeScreen } from "../../../src/features/home/home-screen";
import { InitialAvatar } from "../../../src/features/home/initial-avatar";

function openSettings() {
  router.push("/settings");
}

export default function HomeRoute() {
  return (
    <>
      <HomeScreen />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <InitialAvatar initial="T" onPress={openSettings} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}
