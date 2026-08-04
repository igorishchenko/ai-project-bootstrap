### Overview

React Native renders real native views from React components. One TypeScript
codebase produces an iOS app and an Android app, with an escape hatch to native
code when a platform API has no JavaScript binding.

The thing that surprises people coming from the web: there is no DOM and no CSS
cascade. `View` and `Text` replace `div` and `span`, styles are plain objects on
each component, and layout is Flexbox — with `flexDirection` defaulting to
`column`, not `row`.

### Requirements

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22.22.1 or newer | Set by the tooling; an older Node fails at install |
| Watchman | latest | macOS/Linux; makes file watching reliable |
| Xcode | 15 or newer | iOS builds — macOS only |
| CocoaPods | 1.14 or newer | iOS native dependencies |
| Android Studio | latest | Android SDK, emulator, JDK 17 |

### Verify your environment

```bash
node --version
npx react-native doctor
```

`doctor` checks the native toolchains and tells you what is missing. Run it
before debugging a build failure — most first-day problems are a missing
Android SDK path or an unaccepted licence, not your code.

### Running

```bash
npm start              # Metro bundler
npm run ios            # build and launch the iOS app
npm run android        # build and launch the Android app
```

Metro must stay running while you develop. Press `r` in its terminal to reload,
`d` to open the developer menu.

### Project conventions

Group by feature, not by file type:

```
src/features/subscriptions/
  screens/       components/      hooks/      services/
```

Anything shared moves up to `src/components/` or `src/services/` on its third
use, not its first.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Red screen: "Unable to resolve module" | Metro's cache is stale. `npm start -- --reset-cache` |
| iOS build fails after adding a package | Pods not installed. `cd ios && pod install` |
| Android build fails on a clean checkout | `cd android && ./gradlew clean`, then rebuild |
| Changes do not appear | Metro is watching a different directory. Restart it from the project root |
| "Command PhaseScriptExecution failed" | Almost always a Node path issue in Xcode's build phase. Check `.xcode.env` |

### Common mistakes

- **Editing native folders by hand.** `ios/` and `android/` are generated. Keep
  configuration in the project's config files, or your next regeneration will
  silently discard the change.
- **Assuming a JS reload picks up a native module.** Adding a package with
  native code requires a full rebuild — a fast refresh will not do it.
- **Using `flexDirection: 'row'` habits from the web.** The default is `column`.
- **Testing only on the simulator.** Performance, permissions, push
  notifications and payments all behave differently on a physical device.
- **Ignoring the New Architecture flag.** Some libraries still need interop;
  check before upgrading, not after.

### Production checklist

- [ ] Release builds tested on a physical device, both platforms.
- [ ] Hermes enabled and the release bundle profiled for startup time.
- [ ] Long lists virtualised; no unbounded `map` over fetched data.
- [ ] App icons and splash screens set for every required density.
- [ ] Permission strings written in plain language — reviewers reject vague ones.
- [ ] Deep links tested cold-start, not just while the app is running.
- [ ] `console.log` stripped from release builds.

### Documentation

- [React Native docs](https://reactnative.dev/docs/getting-started)
- [Environment setup](https://reactnative.dev/docs/set-up-your-environment)
- [Performance](https://reactnative.dev/docs/performance)
- [New Architecture](https://reactnative.dev/docs/the-new-architecture/landing-page)
