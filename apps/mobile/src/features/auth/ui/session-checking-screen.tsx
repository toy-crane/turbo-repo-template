import { View } from "react-native";

/**
 * What the app shows while it reads the stored session.
 *
 * Deliberately empty: it continues the splash screen rather than announcing
 * itself. Showing the sign-in screen here would flash it at every returning
 * user, and showing the app would hand protected screens to someone who turns
 * out to be signed out.
 *
 * The colour arrives as a prop because the app theme belongs to the root
 * layout, and a feature does not reach up into it.
 */
export function SessionCheckingScreen({ background }: { background: string }) {
  return (
    <View
      accessibilityLabel="로그인 상태 확인 중"
      accessible
      style={{ backgroundColor: background, flex: 1 }}
      testID="session-checking"
    />
  );
}
