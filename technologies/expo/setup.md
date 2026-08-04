### Overview

Expo sits on top of React Native and takes over the parts that are tedious to
maintain by hand: native project generation, dependency version alignment,
builds, and over-the-air updates.

The central idea is **config plugins**. Instead of editing `Info.plist` or
`AndroidManifest.xml`, you declare what you need in `app.json`, and Expo
regenerates the native projects from it. That is why `ios/` and `android/` are
disposable here — `npx expo prebuild --clean` recreates them, discarding any
manual edit.

### Install

```bash
npx expo install expo
npx expo install expo-dev-client
```

Use `npx expo install`, not `npm install`, for any Expo package. It picks the
version matching your Expo SDK — plain `npm install` will happily give you a
version that breaks the build in a way the error message does not explain.

### Running

```bash
npx expo start              # dev server
npx expo start --dev-client # when using a custom dev build
npx expo run:ios            # local native build
npx expo run:android
```

### Config plugins

Native configuration lives in `app.json`. Adding a library with native code
usually means installing its plugin package **and** listing it here, then
rebuilding — a plugin named in `app.json` but not installed fails `prebuild`:

```bash
npx expo install expo-build-properties
```

```json
{
  "expo": {
    "name": "{{projectName}}",
    "slug": "{{projectSlug}}",
    "plugins": [
      ["expo-build-properties", { "ios": { "deploymentTarget": "16.0" } }]
    ]
  }
}
```

Only override the native minimums when you actually need to. Left alone, Expo
applies the defaults for the installed SDK, which is one fewer thing to keep
current as the SDK moves.

### EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
eas build --profile production --platform all
```

Build profiles live in `eas.json`. Keep `development`, `preview` and
`production` distinct, each pointing at its own environment variables.

### Over-the-air updates

```bash
eas update --branch production --message "Fix checkout copy"
```

OTA updates ship JavaScript only. A change touching native code — a new native
dependency, a permission, an app icon — needs a real build. Shipping a JS bundle
that expects a native module the installed binary does not have will crash on
launch for every user who receives it.

### Environment variables

Only variables prefixed `EXPO_PUBLIC_` reach the app, and **they are embedded in
the bundle**. Anyone with the app can read them. Secrets belong on a server or
in EAS secrets, never in an `EXPO_PUBLIC_` variable.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Unable to resolve module" after installing | Restart with `npx expo start --clear` |
| Native module not found at runtime | The dev client is stale. Rebuild it — OTA cannot add native code |
| Version mismatch warnings on start | Run `npx expo install --fix` |
| Prebuild wiped a native change | Expected. Move that change into a config plugin |
| EAS build fails but local works | Different env vars or credentials. Check the profile in `eas.json` |

### Common mistakes

- **`npm install` for Expo packages.** Use `npx expo install`.
- **Editing `ios/` or `android/`.** Prebuild regenerates them; the edit vanishes.
- **Putting a secret in `EXPO_PUBLIC_*`.** It ships to every user's device.
- **OTA-updating across a native change.** Crashes on launch. Ship a build.
- **One EAS profile for everything.** Staging then writes to production.

### Production checklist

- [ ] `app.json` has the final name, slug, bundle identifier and version.
- [ ] Build number incremented — stores reject duplicates.
- [ ] Icons and splash screens set for every required size.
- [ ] Production EAS profile points at production credentials only.
- [ ] Permission strings explain the benefit to the user.
- [ ] OTA update channel matches the build channel.
- [ ] A release build tested on a physical device on both platforms.

### Documentation

- [Expo docs](https://docs.expo.dev/)
- [Config plugins](https://docs.expo.dev/config-plugins/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [Environment variables](https://docs.expo.dev/guides/environment-variables/)
