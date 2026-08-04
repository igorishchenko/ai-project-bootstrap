Android configuration also lives in `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.example.{{projectSlug}}",
      "versionCode": 1,
      "permissions": ["CAMERA"]
    }
  }
}
```

Then:

```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

**`versionCode` must increase on every Play Store upload.** A duplicate is
rejected after the upload completes, which wastes a full build cycle.

**Signing** — EAS generates and stores the upload keystore. If you bring your
own, upload it to EAS rather than committing it; a keystore in git is a
credential leak that cannot be rotated without a new app listing.

**Permissions** declared here appear in the generated manifest. Only request
what you use — the Play Console asks you to justify sensitive permissions, and
an unused one will hold up a review.
