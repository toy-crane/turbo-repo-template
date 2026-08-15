const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

// biome-ignore lint/correctness/noGlobalDirnameFilename: Expo loads Metro configuration as CommonJS.
const config = withUniwindConfig(getDefaultConfig(__dirname), {
  cssEntryFile: "./global.css",
});

module.exports = config;
