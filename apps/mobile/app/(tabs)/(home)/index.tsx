import { HomeScreen } from "@/screens/home/home-screen";

// The header tools moved into HomeScreen: they act on the chat session it
// owns, and one toolbar must own the whole right side.
export default function HomeRoute() {
  return <HomeScreen />;
}
