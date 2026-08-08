export function getSettingsSheetOptions() {
  return {
    contentStyle: { backgroundColor: "transparent" },
    headerShown: true,
    presentation: "formSheet" as const,
    sheetAllowedDetents: [0.5, 1],
    sheetGrabberVisible: true,
    sheetInitialDetentIndex: "last" as const,
    title: "Settings",
  };
}
