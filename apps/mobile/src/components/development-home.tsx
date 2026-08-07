import { useCallback, useState } from "react";
import {
  Pressable,
  type PressableStateCallbackType,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getVerificationMessage,
  type VerificationStatus,
} from "../utils/get-verification-message";
import { isDevelopmentBuild } from "../utils/is-development-build";

export function DevelopmentHome() {
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("pending");
  const handleVerification = useCallback(() => {
    setVerificationStatus(isDevelopmentBuild() ? "verified" : "unavailable");
  }, []);

  return (
    <View style={styles.container}>
      <Text role="heading" style={styles.title}>
        Expo Development Build
      </Text>
      <Text style={styles.status}>
        {getVerificationMessage(verificationStatus)}
      </Text>
      <Pressable
        aria-label="런타임 검증"
        onPress={handleVerification}
        role="button"
        style={getButtonStyle}
      >
        <Text style={styles.buttonLabel}>런타임 검증</Text>
      </Pressable>
    </View>
  );
}

function getButtonStyle({ pressed }: PressableStateCallbackType) {
  return [styles.button, pressed && styles.buttonPressed];
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.72,
  },
  container: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    gap: 20,
    justifyContent: "center",
    padding: 24,
  },
  status: {
    color: "#475569",
    fontSize: 16,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "700",
  },
});
