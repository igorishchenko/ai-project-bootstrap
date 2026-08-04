Push requires an APNs key uploaded to EAS:

```bash
eas credentials
```

Select iOS → Push Notifications and let EAS generate or upload the key. The
capability itself is added by the config plugin during prebuild.

For notifications that arrive while the app is running, add background modes in
`app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

**The permission prompt appears once in the lifetime of an install.** If the
user declines, the only way back is Settings, and almost nobody goes there. Show
your own explanation screen first, and only call
`requestPermissionsAsync()` when they agree — that way a "no" costs you the
in-app screen rather than the system prompt.

Test on a physical device. The iOS Simulator cannot register for remote push.
