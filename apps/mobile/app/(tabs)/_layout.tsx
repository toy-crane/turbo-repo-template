import {
  GlassTabBar,
  GlassTabButton,
  renderFadingTabScreen,
  setMinimized,
  TabBarMinimizeProvider,
  useMinimizeState,
} from "expo-glass-tabs";
import { usePathname, useRouter } from "expo-router";
import { TabList, TabSlot, Tabs, TabTrigger } from "expo-router/ui";
import { type ComponentProps, useCallback, useEffect, useMemo } from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";

import { appTabs } from "../../src/navigation/app-tabs";
import { getGlassTabTheme } from "../../src/theme/glass-tab-theme";
import { getSemanticColors } from "../../src/theme/semantic-colors";

function AccessibleGlassTabButton(
  props: ComponentProps<typeof GlassTabButton>
) {
  return (
    <GlassTabButton
      {...props}
      accessibilityLabel={props.item.label}
      accessibilityRole={Platform.OS === "ios" ? "button" : "tab"}
      accessibilityState={{ selected: Boolean(props.isFocused) }}
    />
  );
}

function TabBarRouteReset() {
  const minimizeState = useMinimizeState();

  useEffect(() => {
    setMinimized(minimizeState, 0);
  }, [minimizeState]);

  return null;
}

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const scheme = useColorScheme();
  const colors = getSemanticColors(scheme);
  const tabTheme = useMemo(() => getGlassTabTheme(scheme), [scheme]);
  const selectTab = useCallback(
    (index: number) => {
      const tab = appTabs[index];
      if (tab) {
        router.navigate(tab.href);
      }
    },
    [router]
  );

  return (
    <TabBarMinimizeProvider>
      <TabBarRouteReset key={pathname} />
      <Tabs
        style={[styles.tabs, { backgroundColor: colors.background.canvas }]}
      >
        <TabSlot
          renderFn={renderFadingTabScreen}
          style={[styles.slot, { backgroundColor: colors.background.canvas }]}
        />
        <TabList asChild>
          <GlassTabBar onIndexSelected={selectTab} theme={tabTheme}>
            {appTabs.map((item, index) => (
              <TabTrigger
                asChild
                href={item.href}
                key={item.name}
                name={item.name}
              >
                <AccessibleGlassTabButton index={index} item={item} />
              </TabTrigger>
            ))}
          </GlassTabBar>
        </TabList>
      </Tabs>
    </TabBarMinimizeProvider>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
    height: "100%",
  },
  tabs: {
    flex: 1,
  },
});
