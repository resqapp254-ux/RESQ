// babel.config.js
// No babel config existed before — Expo's toolchain worked fine
// without one because nothing needed a custom transform. Now that
// react-native-reanimated is installed, it needs its own Babel plugin
// (compiles "worklets" — the functions that run on the UI thread) and
// that plugin MUST be listed last, per Reanimated's own docs.
module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin'
    ]
  }
}
