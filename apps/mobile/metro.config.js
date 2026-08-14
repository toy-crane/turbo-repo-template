const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const {
  getBundleModeMetroConfig,
} = require("react-native-worklets/bundleMode");
const { withUniwindConfig } = require("uniwind/metro");

// biome-ignore lint/correctness/noGlobalDirnameFilename: Expo loads Metro configuration as CommonJS.
const config = withUniwindConfig(getDefaultConfig(__dirname), {
  cssEntryFile: "./global.css",
});

// Bundle Mode writes the worklet bundles it compiles into the Worklets package
// itself, and Metro only picks up files inside a watched folder. The path is
// resolved rather than written out because Bun keeps each package in a shared
// store instead of a folder under the app.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.join(
    path.dirname(require.resolve("react-native-worklets/package.json")),
    ".worklets"
  ),
];

// Read before Bundle Mode replaces it: the call below both mutates the config
// and returns it.
const appResolveRequest = config.resolver.resolveRequest;
const bundleModeResolveRequest =
  getBundleModeMetroConfig(config).resolver.resolveRequest;

/**
 * Bundle Mode sends every `react-native` import to a shim, which is what the
 * generated worklet bundles need and what the app itself must not get. So only
 * those bundles are resolved its way; everything else keeps the resolver Expo
 * and Uniwind built.
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("react-native-worklets/.worklets/")) {
    return bundleModeResolveRequest(context, moduleName, platform);
  }

  return appResolveRequest
    ? appResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
