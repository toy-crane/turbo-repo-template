/**
 * Settings is a sheet with a stack inside it.
 *
 * The outer route decides how the sheet arrives; the stack inside owns the
 * titles, the back gesture and the toolbars, which is what lets 프로필 수정 push
 * within the sheet rather than covering it.
 */
export function getSettingsSheetOptions() {
  return {
    // The stack inside draws the headers. Left on, the sheet would show its own
    // above them.
    headerShown: false,
    presentation: "pageSheet" as const,
  };
}

/** Shared by every screen inside the sheet, so they read as one surface. */
export function getSettingsStackScreenOptions() {
  return {
    headerShadowVisible: false,
    headerTransparent: true,
  };
}

/** The sheet's first screen. Its way out is the close button, not a back arrow. */
export function getSettingsRouteOptions() {
  return {
    headerBackVisible: false,
    title: "설정",
  };
}

/** Pushed onto the sheet's stack, so the back arrow is the platform's own. */
export function getProfileEditRouteOptions() {
  return {
    title: "프로필 수정",
  };
}
