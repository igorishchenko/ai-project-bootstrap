# OneSignal

Push notifications in {{projectName}}.

## The identity bug to avoid

```ts
OneSignal.login(userId);   // after sign-in
OneSignal.logout();        // after sign-out
```

Subscriptions belong to the **device**. If `logout()` is missing, the device
stays registered as the previous user, and the next person to sign in on that
phone starts receiving notifications meant for someone else — including their
names, message previews and order updates.

It never shows up in single-account testing, which is exactly why it reaches
production. Whenever you touch the sign-out path, check this.

## Permission is one-shot on iOS

Request in context, after your own explanation screen — never at first launch.
The system prompt appears once per install; a decline is permanent short of
Settings, which nobody visits. Losing it costs the channel for that user
forever.

Denied is a normal state. The app must work fully without notifications.

## Tags hold no personal data

Tags drive segmentation — `plan`, `locale`, `onboarding_stage`. Never an email
address, name, or anything sensitive: this is a third-party store, it is hard to
purge, and a deletion request then involves their support rather than your
database.

If asked to tag users with their email so campaigns "read better", say why an
internal id is the right key.

## Payloads are visible

Notification content shows on the lock screen and passes through Apple's and
Google's infrastructure. Send an identifier and fetch the detail in-app.

## Configuration

`initialize()` once at startup. The Expo plugin's `mode` must match the build —
a `development` APNs environment in a release build fails silently, which is a
long afternoon if you do not know to check it.

## Verifying

Native module: no Expo Go, no simulator. If you could not test on a physical
device, say so plainly.
