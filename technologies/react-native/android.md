Gradle picks up native modules automatically via autolinking — no manual
registration needed. After adding a native package, rebuild:

```bash
npm run android
```

**SDK versions** live in `android/build.gradle` (`compileSdkVersion`,
`targetSdkVersion`, `minSdkVersion`). Google enforces a minimum `targetSdk` for
Play Store submissions and raises it yearly; check it before a release, not
during one.

**Signing** — debug builds use the shared debug keystore. Release builds need
your own keystore, referenced from `android/gradle.properties`, with the
credentials supplied by CI secrets. Never commit the keystore or its password.

**ProGuard/R8** — enabled for release builds. If something works in debug and
crashes in release, a missing keep rule for a reflection-based library is the
usual cause.

**Clean build**, when Gradle gets into a strange state:

```bash
cd android && ./gradlew clean && cd ..
```
