# Expo release checklist

Run alongside `release.md`.

## Configuration

- [ ] `app.json` has the final name, slug, bundle identifier and package name.
- [ ] `ios.buildNumber` and `android.versionCode` incremented — stores reject
      a duplicate after the upload finishes, costing a whole build cycle.
- [ ] Icons and splash screens present at every required size.
- [ ] Permission usage strings explain the benefit to the user.

## Environment

- [ ] The production EAS profile points only at production credentials.
- [ ] No secret sits in an `EXPO_PUBLIC_*` variable — those ship inside the
      bundle and can be extracted from the installed app.
- [ ] EAS secrets set for anything CI needs.

## Native versus OTA

- [ ] Every native change in this release ships as a **build**, not an update.
- [ ] The update channel matches the build channel.
- [ ] The previous production build can still run the update you are shipping.

## Verification

- [ ] Production build installed and tested on a physical iOS device.
- [ ] Production build installed and tested on a physical Android device.
- [ ] Cold start works — not just a reload over a running dev session.
- [ ] Deep links open correctly from a cold start.
