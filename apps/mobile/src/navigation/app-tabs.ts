import type { GlassTabItem } from "expo-glass-tabs";
import type { Href } from "expo-router";

export type AppTab = GlassTabItem & {
  href: Href;
};

export const appTabs: AppTab[] = [
  {
    href: "/",
    icon: { android: "home_filled", ios: "house.fill" },
    label: "Home",
    name: "home",
  },
  {
    href: "/activity",
    icon: { android: "monitoring", ios: "chart.bar.fill" },
    label: "Activity",
    name: "activity",
  },
  {
    href: "/settings",
    icon: { android: "settings", ios: "gearshape.fill" },
    label: "Settings",
    name: "settings",
  },
];
