import { requireOptionalNativeModule } from "expo";

interface DevelopmentBuildEvidence {
  hasDevLauncher: boolean;
  isDevelopmentMode: boolean;
}

interface DevelopmentGlobal {
  __DEV__?: boolean;
}

export function hasDevelopmentBuildEvidence({
  hasDevLauncher,
  isDevelopmentMode,
}: DevelopmentBuildEvidence) {
  return hasDevLauncher && isDevelopmentMode;
}

export function isDevelopmentBuild() {
  const developmentGlobal = globalThis as typeof globalThis & DevelopmentGlobal;

  return hasDevelopmentBuildEvidence({
    hasDevLauncher: requireOptionalNativeModule("ExpoDevLauncher") !== null,
    isDevelopmentMode: developmentGlobal.__DEV__ === true,
  });
}
