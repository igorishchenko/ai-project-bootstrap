Add `GoogleService-Info.plist` from the Firebase console and reference it in
`app.json`:

```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist",
      "bundleIdentifier": "com.example.{{projectSlug}}"
    }
  }
}
```

Then rebuild — this is a native module, so a reload will not pick it up:

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios
```

**dSYM upload is the part that matters.** Without it, every crash report for the
release is a list of memory addresses rather than your function names. EAS
handles the upload when Crashlytics is configured; verify it on the first
production build by opening a real crash and confirming the stack names your
files.

Bitcode-enabled builds and any post-processing step can break symbolication —
check after changing the build pipeline, not before.
