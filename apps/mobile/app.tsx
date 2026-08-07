import { StatusBar } from "expo-status-bar";

import { DevelopmentHome } from "./src/components/development-home";

export default function App() {
  return (
    <>
      <DevelopmentHome />
      <StatusBar style="auto" />
    </>
  );
}
