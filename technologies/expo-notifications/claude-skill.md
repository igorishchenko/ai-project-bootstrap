# Expo Push

Notifications in {{projectName}}.

## Permission is a one-shot resource on iOS

The system prompt appears **once per install**. A user who declines can only
change it in Settings, and effectively nobody does. Asking on first launch —
before they know what the notifications are for — permanently burns the channel
for a large share of users.

So: show an in-app explanation first, and call `requestPermissionsAsync()` only
after they agree. A "no" then costs you your own screen, which you can ask
again, instead of the system prompt, which you cannot.

If asked to request permission at startup, say why that is expensive and propose
the in-context prompt instead.

## Denied is a normal state

The app must be fully usable without notifications. Never block a feature or
show an error because permission was refused.

## Tokens rotate

Refresh on every launch and send to the backend with the user id. Two things
that are easy to miss:

- **Delete the token on sign-out.** Otherwise the next person to use that device
  receives the previous user's notifications — a real privacy incident, and one
  nobody discovers in testing.
- **Purge `DeviceNotRegistered` tokens** returned in receipts, or you accumulate
  dead tokens and skew delivery metrics.

## Cold start is the case people forget

Tapping a notification usually launches the app from scratch, so the listener
registered at startup never fires for it. Handle
`getLastNotificationResponseAsync()` as well, or the tap dumps the user on the
home screen with the deep link lost.

## Payloads are not private

Notification content appears on the lock screen and passes through Apple's and
Google's infrastructure. Never include personal data, tokens or anything
sensitive — send an identifier and fetch the detail in-app.

## Verifying

Push does not work in a simulator or Expo Go. If you could not test on a
physical device, say so rather than implying it works.
