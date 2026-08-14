/**
 * The app has one Babel need of its own: the Worklets plugin has to run in
 * Bundle Mode, which is how `react-native-streamdown` repairs streaming
 * Markdown off the JS thread.
 *
 * `babel-preset-expo` registers that plugin by itself and passes it no options,
 * and Babel refuses a second registration of the same plugin. Both of the
 * preset's automatic paths are turned off here — `worklets: false` alone would
 * fall through to the Reanimated path, which in Reanimated 4 registers the very
 * same plugin — and the plugin is named once, with the options Bundle Mode
 * requires. Reanimated loses nothing: this is the plugin that serves it.
 *
 * `importForwarding` is what carries `remend` into the worklet runtime. Without
 * it the repair function stays on the JS side and the worklet reaches back for
 * it, which Worklets refuses. The Streamdown README calls this option
 * `workletizableModules`; that was its name in Worklets 0.8, and an option this
 * plugin does not know is accepted in silence rather than reported.
 *
 * This file is for Metro. Jest names its own transform in jest.config.mjs so
 * that Bundle Mode stays out of the tests, where the generated worklet modules
 * have no resolver to find them.
 */
module.exports = (api) => {
  api.cache(true);

  return {
    plugins: [
      [
        "react-native-worklets/plugin",
        { bundleMode: true, importForwarding: { moduleNames: ["remend"] } },
      ],
    ],
    presets: [["babel-preset-expo", { reanimated: false, worklets: false }]],
  };
};
