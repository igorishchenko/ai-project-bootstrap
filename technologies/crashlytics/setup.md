### Overview

Crashlytics reports native crashes and non-fatal errors, grouped into issues,
with a crash-free-users percentage that is the single most useful stability
number a mobile team has.

Its strength is the native layer: it catches crashes that kill the process
before any JavaScript error handler could run. Its weakness is the same
boundary — a JavaScript error is not a native crash, so anything you want
reported from JS has to be sent deliberately.

### Install

```bash
npx expo install @react-native-firebase/app @react-native-firebase/crashlytics
npx expo prebuild --clean
```

Requires the native Firebase configuration files described in the Firebase
section: `GoogleService-Info.plist` for iOS and `google-services.json` for
Android.

### Initialise

Crashlytics starts collecting automatically once linked. Two things are worth
setting explicitly:

```ts
import crashlytics from '@react-native-firebase/crashlytics';

await crashlytics().setCrashlyticsCollectionEnabled(!__DEV__);
await crashlytics().setUserId(userId);        // after sign-in
```

Collection off in development keeps your own crashes out of the dashboard, where
they would otherwise drown the real ones.

### Reporting from JavaScript

```ts
crashlytics().log('Opened paywall');
crashlytics().recordError(error);
```

`log` adds breadcrumbs to whatever crash comes next. `recordError` reports a
non-fatal — use it where you handled the error but still want to know it
happened.

### dSYMs and mapping files

Without symbol files, an iOS crash report is a list of memory addresses. EAS
uploads them for you when Crashlytics is configured; a bare React Native project
must upload them as a build step.

Verify this on your first release build by opening a real crash and checking the
stack names your files. Discovering it after an incident is too late — the
reports for that release are already unreadable.

### Testing

```ts
crashlytics().crash();   // deliberate, debug builds only
```

Crashes appear after the app is **restarted** — the report is written on the way
down and uploaded on the next launch. Waiting on the dashboard without relaunching
is the usual source of "it isn't working".

### Privacy

Crash reports go to Google, tied to whatever id you set. Use an internal user id,
never an email address or name. Keep personal data out of custom keys and logs;
they are attached to the report.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| No crashes appear | App not relaunched after the crash |
| Unreadable stack traces | dSYMs / mapping files not uploaded |
| Nothing in development | Expected if collection is disabled there |
| Works on Android, not iOS | `GoogleService-Info.plist` missing from the build |
| JavaScript errors absent | Expected — send them with `recordError` |

### Common mistakes

- **Expecting JS errors automatically.** Only native crashes are automatic.
- **Skipping symbol upload.** Every report for that release is unusable.
- **Leaving collection on in development.** Your own crashes bury real ones.
- **Personal data in user ids or custom keys.** It ends up in a third party.
- **Reading the dashboard without relaunching the app.**

### Production checklist

- [ ] Symbol files uploading, verified against a real crash on a release build.
- [ ] Collection disabled in development builds.
- [ ] User identified by internal id only.
- [ ] No personal data in logs, keys or the user id.
- [ ] Handled-but-notable errors reported with `recordError`.
- [ ] Crash-free rate watched after each release, not just alert counts.

### Documentation

- [Crashlytics](https://firebase.google.com/docs/crashlytics)
- [React Native Firebase](https://rnfirebase.io/crashlytics/usage)
- [Symbol uploads](https://firebase.google.com/docs/crashlytics/get-deobfuscated-reports)
