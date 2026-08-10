import { TabStack } from "@/core/navigation/tab-stack";

export default function HomeLayout() {
  // Home is the chat surface: its scroll position lives at the end of the
  // conversation, so a collapsing Large Title would never expand. A compact
  // bar matches platform chat conventions.
  return <TabStack largeTitle={false} routeName="index" title="Home" />;
}
