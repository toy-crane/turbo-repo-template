import { expect, test } from "@jest/globals";

import { appTabs } from "./app-tabs";

test("세 네이티브 탭이 route group과 플랫폼별 기본·선택 아이콘을 선언한다", () => {
  expect(appTabs).toEqual([
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
  ]);
});
