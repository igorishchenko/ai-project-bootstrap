### Overview

Sentry captures unhandled errors{{#if has.react-native}} and native crashes{{/if}}, with the stack trace, the
breadcrumbs leading up to it, the device state, and which release it came from.

Two things do most of the work and are the two most commonly skipped: **source
maps**, without which every production stack trace is minified gibberish, and
**release tagging**, without which you cannot tell whether an error is new.

### Create the project

1. Create a project at [sentry.io](https://sentry.io) — choose the {{#if has.react-native}}React Native{{/if}}{{#unless has.react-native}}Next.js{{/unless}}
   platform so the correct defaults are applied.
2. Copy the DSN from Settings → Client Keys.
3. Create an auth token (Settings → Auth Tokens) with `project:releases` scope,
   for source map uploads from CI.
4. Set up separate environments for development, staging and production.

### Install

{{#if has.react-native}}```bash
npx expo install @sentry/react-native
npx expo prebuild --clean
```
{{/if}}{{#unless has.react-native}}```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

The wizard writes the config files, wraps `next.config.ts` in `withSentryConfig`
and sets up source map upload. Run it rather than hand-writing the wiring: the
exact file names have changed across major versions, and the wizard always
matches the version you just installed. Check the
[Next.js guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/) for
what it produced.
{{/unless}}
### Initialise

Once, as early as possible in startup — before anything that might throw:

{{#if has.react-native}}```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.{{envPrefix}}SENTRY_DSN,
  environment: process.env.{{envPrefix}}APP_ENV ?? 'development',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});
```

`enabled: !__DEV__` keeps development noise out of the dashboard. `sendDefaultPii: false`
keeps user identifiers out of events unless you add them deliberately.
{{/if}}{{#unless has.react-native}}The wizard generates one `Sentry.init` per runtime — browser, server and edge —
because they load at different times and take different options. Each takes the
same core settings:

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.{{envPrefix}}SENTRY_DSN,
  environment: process.env.{{envPrefix}}APP_ENV ?? 'development',
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});
```

The DSN needs the `{{envPrefix}}` prefix because the browser bundle reads it;
`SENTRY_AUTH_TOKEN` must **not** have one — it is a build-time credential and a
prefixed variable is inlined into JavaScript every visitor downloads.

`enabled` off outside production keeps development noise out of the dashboard.
`sendDefaultPii: false` keeps user identifiers out of events unless you add them
deliberately.
{{/unless}}
### Source maps

Without uploaded source maps, a production stack trace points at line 1 of a
minified bundle and is useless. {{#if has.react-native}}The Expo plugin handles upload during EAS builds
when the auth token is set:

```bash
eas secret:create --name SENTRY_AUTH_TOKEN --value <token>
```
{{/if}}{{#unless has.react-native}}`withSentryConfig` uploads them during `next build`
when the auth token is present. Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and
`SENTRY_PROJECT` as CI secrets — never in `.env` in the repository.
{{/unless}}
Verify after your first production build: open any error in Sentry and confirm
the frames name your files.

### Identifying users

```ts
Sentry.setUser({ id: userId });      // after sign-in
Sentry.setUser(null);                // after sign-out
```

Use your internal id. Do not send email addresses or names — an error tracker is
not the right store for personal data, and it makes deletion requests harder.

### Capturing deliberately

```ts
try {
  await syncSubscription();
} catch (error) {
  Sentry.captureException(error, { tags: { area: 'payments' } });
  throw error;
}
```

Add context rather than a bare capture. `tags` are filterable; `extra` carries
detail. Never put a token, a key or personal data in either.

### Breadcrumbs

Sentry records navigation and network activity automatically. Add your own for
domain events:

```ts
Sentry.addBreadcrumb({ category: 'payments', message: 'Paywall shown' });
```

These are what turn "TypeError: undefined" into a reproducible sequence.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
{{#if has.react-native}}| No events at all | `enabled: !__DEV__` and you are in development — expected |
| Stack traces are minified | Source maps not uploaded. Check the auth token in EAS secrets |
| Events lack a release | Release not set in the build. Check the plugin config |
| Native crashes missing | Rebuild after installing — this is a native module |
{{/if}}{{#unless has.react-native}}| No events at all | `enabled` is false outside production — expected |
| Nothing from the browser | The DSN is missing its `{{envPrefix}}` prefix, so the client bundle reads `undefined` |
| Stack traces are minified | Source maps not uploaded. Check `SENTRY_AUTH_TOKEN` in the build environment |
| Server errors missing | The server-side init is not loading. Re-run the wizard |
{{/unless}}| Too many events | Lower `tracesSampleRate`; filter noise in `beforeSend` |

### Common mistakes

- **Initialising late.** Errors before `init` are lost entirely.
- **Skipping source maps.** Every production trace becomes unreadable.
- **Sending personal data.** Emails and names in events create a deletion
  problem and often a compliance one.
- **Capturing and swallowing.** Reporting an error is not handling it — decide
  what the user sees.
- **Alerting on everything.** Alert fatigue means real incidents get ignored.
{{#unless has.react-native}}- **Prefixing the auth token.** `{{envPrefix}}SENTRY_AUTH_TOKEN` ships a
  project-write credential to every visitor.
{{/unless}}
### Production checklist

- [ ] DSN set for the production environment.
- [ ] Source maps uploading, verified on a real production error.
- [ ] Release{{#if has.mobile}} and build number{{/if}} tagged on every event.
- [ ] `environment` distinguishes development, staging and production.
- [ ] No personal data, tokens or keys in tags, extras or breadcrumbs.
- [ ] Alerts configured for a spike in the crash-free rate, not for every event.
{{#if has.react-native}}- [ ] A native crash verified end to end on a physical device.
{{/if}}{{#unless has.react-native}}- [ ] An error verified end to end from both the browser and the server.
{{/unless}}
### Documentation

{{#if has.react-native}}- [Sentry React Native](https://docs.sentry.io/platforms/react-native/)
- [Source maps](https://docs.sentry.io/platforms/react-native/sourcemaps/)
{{/if}}{{#unless has.react-native}}- [Sentry for Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/)
{{/unless}}- [Releases](https://docs.sentry.io/product/releases/)
- [Data scrubbing](https://docs.sentry.io/data-management-settings/scrubbing/)
