Upload an APNs authentication key (`.p8`, plus key id and team id) in the
OneSignal dashboard under Settings → Push & In-App → Apple iOS.

Add the config plugin to `app.json`, and make sure `mode` matches the build you
are producing:

```json
{
  "expo": {
    "plugins": [["onesignal-expo-plugin", { "mode": "production" }]]
  }
}
```

A `development` mode in a release build targets the APNs sandbox, so
notifications are accepted and never delivered — with nothing in the logs to
explain it.

The plugin adds the required capabilities, including the Notification Service
Extension used for rich media and confirmed delivery. Rebuild after changing it:

```bash
npx expo prebuild --platform ios --clean
```

The permission prompt appears once per install; request it after your own
explanation screen, never at launch. Test on a physical device — the simulator
cannot receive remote push.
