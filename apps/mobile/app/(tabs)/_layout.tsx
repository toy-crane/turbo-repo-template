import { NativeTabs } from "expo-router/unstable-native-tabs";

import { appTabs } from "@/core/navigation/app-tabs";

export default function TabLayout() {
  return (
    <NativeTabs backBehavior="history" minimizeBehavior="onScrollDown">
      {appTabs.map((tab) => (
        <NativeTabs.Trigger key={tab.routeName} name={tab.routeName}>
          <NativeTabs.Trigger.Icon md={tab.androidIcon} sf={tab.iosIcon} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
