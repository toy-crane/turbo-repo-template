import { type ReactNode, useEffect, useState } from "react";
import { AppState, Text, View } from "react-native";

import { getSupabaseClient } from "./client";

function readConfigurationError(): string | undefined {
  try {
    getSupabaseClient();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/**
 * Initializes the Supabase singleton inside React, so a missing public
 * environment variable renders its own message instead of crashing the bundle
 * before anything can catch it.
 */
export function SupabaseGate({ children }: { children: ReactNode }) {
  const [configurationError] = useState(readConfigurationError);

  useEffect(() => {
    if (configurationError) {
      return;
    }

    // Supabase starts a refresh ticker that never stops on native, so pause it
    // whenever the app leaves the foreground.
    const { auth } = getSupabaseClient();

    auth.startAutoRefresh();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        auth.startAutoRefresh();
      } else {
        auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
      auth.stopAutoRefresh();
    };
  }, [configurationError]);

  if (configurationError) {
    return (
      <View style={{ flex: 1, gap: 12, justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 17, fontWeight: "600" }}>
          Supabase 설정이 필요합니다
        </Text>
        <Text style={{ fontSize: 14 }}>{configurationError}</Text>
      </View>
    );
  }

  return children;
}
