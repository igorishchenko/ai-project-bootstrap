# Crashlytics

Crash reporting in {{projectName}}.

## Native crashes are automatic; JavaScript errors are not

This catches people out constantly. Crashlytics hooks the native layer, so it
sees crashes that kill the process outright — but a JavaScript exception that
React handles is invisible to it.

If you want to know about a JS-level failure, send it:

```ts
crashlytics().recordError(error);
```

And recording is not handling. Decide what the user sees afterwards — a retry, a
message, a fallback. A dashboard entry does nothing for the person looking at a
blank screen.

## Symbol files decide whether reports are usable

Without dSYMs (iOS) or mapping files (Android), a crash report is a list of
memory addresses. EAS uploads them when Crashlytics is configured; a bare React
Native project needs a build step.

Verify it once, on the first release build, by opening a real crash and checking
that the stack names your files. Finding out during an incident means the reports
for that release are already worthless.

## Never put personal data in a report

Identify users with an internal id — never an email or name. Keep personal data
out of `log()` and custom keys; all of it is attached to the report and stored by
a third party, where a deletion request becomes their process rather than yours.

## Verifying

Crashes upload on the **next launch**, not at the moment of the crash. Testing
means: trigger it, relaunch, then look. And collection is normally disabled in
development, so an empty dashboard locally is expected rather than a bug.

If you have not tested on a release build with symbols uploaded, say so.
