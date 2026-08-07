export const appTabs = [
  {
    androidIcon: { default: "home", selected: "home_filled" },
    iosIcon: { default: "house", selected: "house.fill" },
    label: "Home",
    routeName: "(home)",
  },
  {
    androidIcon: { default: "monitoring", selected: "monitoring" },
    iosIcon: { default: "chart.bar", selected: "chart.bar.fill" },
    label: "Activity",
    routeName: "(activity)",
  },
  {
    androidIcon: { default: "settings", selected: "settings" },
    iosIcon: { default: "gearshape", selected: "gearshape.fill" },
    label: "Settings",
    routeName: "(settings)",
  },
] as const;
