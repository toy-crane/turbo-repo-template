import { View } from "react-native";

/**
 * What the app shows while it reads the stored session.
 *
 * Deliberately empty: it continues the splash screen rather than announcing
 * itself. Showing the sign-in screen here would flash it at every returning
 * user, and showing the app would hand protected screens to someone who turns
 * out to be signed out.
 */
export function SessionCheckingScreen() {
  return (
    <View
      accessibilityLabel="로그인 상태 확인 중"
      accessible
      className="flex-1 bg-background"
      testID="session-checking"
    />
  );
}
