Add `google-services.json` from the Firebase console and reference it in
`app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "com.example.{{projectSlug}}"
    }
  }
}
```

Rebuild after adding it:

```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

Release builds run R8/ProGuard, which renames everything. The Crashlytics Gradle
plugin uploads the mapping file so reports stay readable — if your traces are
obfuscated, that upload is what is missing.

Verify with a real crash on a release build, not a debug one: debug builds are
not minified, so they look fine either way and prove nothing about production.
