# Implementing push notifications — Expo Push

{{projectName}} uses Expo's push notification service. This plan gets you
from nothing to a permission prompt users actually accept, a token your
backend can send to, and a tap that reliably opens the right screen — even
when it launches the app from cold.

## What you're building

- A notifications service that requests permission in context (not on first
  launch), registers a push token, and keeps it current.
- A backend that stores tokens per user, deletes them on sign-out, and checks
  delivery receipts rather than assuming a 200 means delivered.
- Cold-start handling, so a tap that launches the app from scratch still
  opens the right screen.

## Before you start

- Read `docs/setup.md#expo-push` and this project's generated rule/skill
  (`.cursor/rules/expo-notifications.mdc` or
  `.claude/skills/expo-notifications/SKILL.md`).
- Confirm `EXPO_PUBLIC_EAS_PROJECT_ID` is set — see `.env.example`. It's
  needed to request a push token, and should already be in `app.json`.
- **This does not work in a simulator or Expo Go.** Test on a physical device
  with a development build: `npx expo prebuild --clean` then
  `npx expo run:ios` / `run:android`.

## Steps

1. **Show your own explanation screen before asking.** Requesting permission
   on first launch, with no context, is the single biggest reason for a
   permanent decline — on iOS the system prompt appears once per install, and
   a decline is effectively forever. Only call `requestPermissionsAsync()`
   after the user agrees to your own screen.

2. **Fill in `src/services/notifications/pushToken.ts`** (scaffolded):
   request permission, then register for a push token via
   `getExpoPushTokenAsync({ projectId })`. Treat denied as a normal state —
   the app must work fully without push, not degrade into a broken state.

3. **Send the token to your backend on every launch, keyed to the signed-in
   user**, and delete it on sign-out. Tokens rotate on reinstall and device
   restore; without a delete-on-sign-out step, the next person to sign in on
   a shared device receives the previous user's notifications.

4. **On Android, create a notification channel** — without one, importance
   (and therefore whether the notification makes a sound or shows a banner)
   is effectively ignored.

5. **Register the response listener once, at startup**, in
   `src/services/notifications/listener.ts` (scaffolded) — not per screen.

6. **Handle the cold-start case explicitly**, with
   `getLastNotificationResponseAsync()`. A tap usually launches the app from
   scratch rather than resuming it, and without checking this the deep link
   is silently lost.

7. **On the backend, check delivery receipts** after sending. A 200 from the
   push API means Expo accepted the request, not that it was delivered — the
   receipt is what tells you that. Purge any token that comes back
   `DeviceNotRegistered`.

8. **Never put personal data or a token inside the notification payload
   itself** — it's visible on the lock screen and passes through Apple's and
   Google's infrastructure. Send an identifier and let the app fetch details
   once it's open.

## Validation

Work through `implementation/push-notifications/checklist.md` on a real
device — most of this is untestable in a simulator.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/push-notifications/prompts/implement.md` to your
assistant — it has this plan's context already folded in.
