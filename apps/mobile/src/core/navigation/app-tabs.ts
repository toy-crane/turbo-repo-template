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
    androidIcon: { default: "bookmark_border", selected: "bookmark" },
    iosIcon: { default: "bookmark", selected: "bookmark.fill" },
    label: "Saved",
    routeName: "(saved)",
  },
] as const;
