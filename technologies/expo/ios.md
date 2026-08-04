Native iOS configuration is declared in `app.json`, not in Xcode:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.{{projectSlug}}",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Scan a receipt to add it to your account."
      }
    }
  }
}
```

Then regenerate and build:

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios
```

**Credentials** — let EAS manage signing unless you have a reason not to. It
generates and stores the certificates and provisioning profiles, which avoids
the usual expiry surprises mid-release.

**Push notifications** need an APNs key uploaded to EAS, and the capability
enabled — the config plugin adds the capability, but the key is a manual upload.
