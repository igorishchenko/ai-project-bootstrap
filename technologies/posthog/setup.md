### Overview

PostHog covers product analytics, feature flags and session replay from one SDK.

The hard part of analytics is not installing it — it is deciding what to track.
Instrument the handful of events that answer a real question, name them
consistently, and resist adding an event for every tap. A dashboard full of
events nobody defined is worse than no analytics, because people trust it.

### Create the project

1. Create a project at [posthog.com](https://posthog.com), or self-host.
2. Copy the project API key and host from Project Settings.
3. Note the host: `https://us.i.posthog.com` or `https://eu.i.posthog.com`.
   Sending EU data to the US region is a compliance problem, not a preference.
4. Create separate projects for development and production so test events do not
   pollute real metrics.

### Install

{{#if has.react-native}}```bash
npx expo install posthog-react-native expo-file-system expo-application \
  expo-device expo-localization
```
{{/if}}{{#unless has.react-native}}```bash
npm install posthog-js
```
{{/unless}}
### Initialise

{{#if has.react-native}}```ts
import PostHog from 'posthog-react-native';

export const posthog = new PostHog(process.env.{{envPrefix}}POSTHOG_KEY!, {
  host: process.env.{{envPrefix}}POSTHOG_HOST,
  captureAppLifecycleEvents: true,
});
```

Wrap the app in `PostHogProvider` so hooks and autocapture work.
{{/if}}{{#unless has.react-native}}```ts
'use client';

import posthog from 'posthog-js';

posthog.init(process.env.{{envPrefix}}POSTHOG_KEY!, {
  api_host: process.env.{{envPrefix}}POSTHOG_HOST,
});

export { posthog };
```

Initialise from a client component mounted in the root layout — `posthog-js`
touches `window`, so importing it from a server component fails the build. Both
variables need the `{{envPrefix}}` prefix or the browser reads `undefined`.

App Router does not fire a page view on client-side navigation by default.
Capture `$pageview` yourself from a `usePathname` effect, or the funnel only
ever sees first loads.
{{/unless}}
### Naming events

Pick one convention and hold to it. This project uses `object_action`, past
tense, snake_case:

```ts
posthog.capture('subscription_started', { plan: 'annual', source: 'paywall' });
```

- `subscription_started`, not `Started Subscription` or `sub-start`.
- Properties describe the event; they are not a second event name.
- Do not put values in the event name — `plan_selected` with a `plan` property,
  never `plan_selected_annual`.

Inconsistent naming is not a cosmetic problem: it makes funnels impossible to
build later, and renaming events does not backfill history.

### Identifying users

```ts
posthog.identify(userId, { plan: 'pro' });   // after sign-in
posthog.reset();                             // after sign-out
```

`reset()` on sign-out matters on shared devices — without it, the next user's
events attach to the previous person.

### Feature flags

```ts
const enabled = posthog.isFeatureEnabled('new-paywall');
```

Flags are cached locally and refreshed in the background, so treat the first
read after launch as possibly stale. Never block first render on a flag fetch —
render the default and update when it arrives.

### Privacy

- Never send personal data as a property: no emails, names, phone numbers, or
  message content.
- Session replay masks text inputs by default. Verify that before enabling it,
  and mask any custom component showing sensitive data.
- Have an answer for a deletion request before you launch, not after.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| No events in the dashboard | Wrong project key, or events sent to the other region's host |
| Events appear minutes later | Expected — the SDK batches. Use the debug view for immediate feedback |
| Flags always return the default | Fetched before `identify`, or the flag is not rolled out to that user |
| Duplicate users | `reset()` not called on sign-out |
{{#unless has.react-native}}| Only the first page appears | App Router navigations need `$pageview` captured manually |
| `window is not defined` at build | `posthog-js` imported from a server component |
{{/unless}}
| Replay shows sensitive data | Masking not configured for a custom input |

### Common mistakes

- **Tracking everything.** Volume is not insight; it is noise you pay for.
- **Inconsistent naming.** Funnels become impossible and history cannot be fixed.
- **Personal data in properties.** Creates a compliance problem you cannot undo.
- **Blocking startup on a flag fetch.** Users wait for analytics to load.
- **One project for all environments.** Test events distort production metrics.

### Production checklist

- [ ] Production project key set, and separate from development.
- [ ] Host matches the intended data region.
- [ ] Event names follow one documented convention.
- [ ] No personal data in any event property.
- [ ] `identify` on sign-in and `reset` on sign-out both verified.
- [ ] Session replay masking checked on screens with sensitive input.
- [ ] Feature flags have a sensible default for when they cannot be fetched.

### Documentation

- [PostHog docs](https://posthog.com/docs)
{{#if has.react-native}}- [React Native SDK](https://posthog.com/docs/libraries/react-native)
{{/if}}{{#unless has.react-native}}- [Next.js SDK](https://posthog.com/docs/libraries/next-js)
{{/unless}}
- [Feature flags](https://posthog.com/docs/feature-flags)
- [Session replay privacy](https://posthog.com/docs/session-replay/privacy)
