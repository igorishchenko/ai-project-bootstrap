# Sentry

How errors are reported in {{projectName}}.

## Reporting is not handling

```ts
try {
  await syncSubscription();
} catch (error) {
  Sentry.captureException(error, { tags: { area: 'payments' } });
  throw error;   // or show a retry — but decide
}
```

Capturing an error tells the team it happened. It does nothing for the user
staring at a blank screen. Every catch block needs an answer to "what does the
user see now?" — a retry, a message, a fallback, or deliberate propagation.

## Context beats volume

Add `tags` for things you will filter by (area, feature, screen) and `extra` for
detail. Add breadcrumbs for domain events:

```ts
Sentry.addBreadcrumb({ category: 'payments', message: 'Paywall shown' });
```

An error with a breadcrumb trail is reproducible. An error without one is a
guess.

## Never send personal data

No email addresses, names, phone numbers, addresses, or message content — in
tags, extras, breadcrumbs, or user context. Identify users by internal id:

```ts
Sentry.setUser({ id: userId });
```

And never send a token, API key, password, or session id. If a task asks you to
attach request payloads or user records to an error for debugging, say why that
is not safe and suggest an id the team can look up instead.

## Do not over-catch

Unhandled errors are captured automatically. Wrapping every call in try/catch to
report it adds noise and hides where the failure originated. Catch where you can
do something about it.

## Verifying

Sentry is disabled in development by design (`enabled: !__DEV__`), so an absence
of events locally is expected, not a bug. Verifying this integration means a
production or staging build — if you have not done that, say so.
