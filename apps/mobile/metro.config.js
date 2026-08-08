const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

// biome-ignore lint/correctness/noGlobalDirnameFilename: Expo loads Metro configuration as CommonJS.
const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
});
