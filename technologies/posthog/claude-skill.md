# PostHog

How analytics work in {{projectName}}.

## Naming, before anything else

`object_action`, past tense, snake_case:

```ts
posthog.capture('subscription_started', { plan: 'annual', source: 'paywall' });
```

This matters more than it looks. Event names cannot be renamed retroactively —
history does not backfill — so an inconsistent name is permanent, and it is
what makes a funnel impossible to build six months later.

Values go in properties, never in the name: `plan_selected` with `{ plan }`,
not `plan_selected_annual`.

## What deserves an event

Track decisions and outcomes: a signup completed, a paywall shown, a
subscription started, a search that returned nothing. If you cannot state the
question an event answers, it should not exist — every extra event costs money
and dilutes the events that matter.

When asked to "add analytics" to a feature, propose the three or four events
worth having rather than instrumenting every interaction.

## Where the code goes

All capture calls go through `src/services/analytics/`. Components do not import
the SDK. This keeps naming consistent, makes events testable, and means a
provider change touches one file.

## Analytics must never break a flow

Wrap capture calls so a failure cannot propagate. A dropped event is a minor
data gap; a crashed checkout because an analytics request failed is an incident.

## Privacy

Never send personal data as a property — no emails, names, phone numbers,
addresses, or message content. Identify users by internal id, and call
`posthog.reset()` on sign-out so the next user on a shared device does not
inherit the previous identity.

If a task asks for user emails in event properties "to make the dashboard
readable", say why that is not safe and suggest joining on the internal id
instead.

## Feature flags

```ts
const enabled = posthog.isFeatureEnabled('new-paywall');
```

Flags are cached and refreshed in the background, so the first read after launch
may be stale, and the fetch can fail. Always have a sensible default, and never
block first render waiting for one.

Delete a flag from the code once it has fully rolled out — stale flags turn into
dead branches nobody dares remove.
