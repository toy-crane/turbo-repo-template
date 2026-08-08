export function getSettingsSheetOptions() {
  return {
    headerBackVisible: false,
    headerShadowVisible: false,
    headerShown: true,
    headerTransparent: true,
    presentation: "pageSheet" as const,
    title: "Settings",
  };
}
