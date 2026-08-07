# Implementing push notifications — OneSignal

{{projectName}} uses OneSignal. This plan gets you from nothing to a
permission prompt users actually accept, identity tied correctly to your
signed-in user, and a send path that never leaks who's who through a
third-party store.

## What you're building

- A notifications service that initializes OneSignal once, requests
  permission in context, and links the device to your app's own user.
- Tag usage limited to non-personal attributes only.
- Sign-out handling that actually logs the device out of OneSignal, not just
  your own app.

## Before you start

- Read `docs/setup.md#onesignal` and this project's generated rule/skill
  (`.cursor/rules/onesignal.mdc` or `.claude/skills/onesignal/SKILL.md`).
- Confirm `EXPO_PUBLIC_ONESIGNAL_APP_ID` is set — see `.env.example`.
  `ONESIGNAL_REST_API_KEY` is server-side only.
- **This does not work in a simulator or Expo Go.** Test on a physical device
  with a development build: `npx expo prebuild --clean` then
  `npx expo run:ios` / `run:android`.
- Confirm the plugin `mode` in `app.json` matches your build — a
  `development` APNs entry inside a production build fails to deliver
  **silently**, with nothing in your logs pointing at the cause.

## Steps

1. **Initialize once, at startup**, in
   `src/services/notifications/oneSignalClient.ts` (scaffolded):

   ```ts
   OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);
   ```

2. **Show your own explanation screen before requesting permission.** On iOS
   the system prompt appears once per install; a decline is effectively
   permanent, so the first ask should be the one that lands.

3. **Call `OneSignal.login(userId)` after your app's own sign-in, and
   `OneSignal.logout()` after sign-out.** This is not optional cleanup — skip
   `logout()` and the device stays subscribed as the previous user, so the
   next person to sign in on that device receives someone else's
   notifications.

4. **Use tags for non-personal attributes only** — plan, locale, onboarding
   state. Never an email address, name, phone number, or anything else
   sensitive; OneSignal is a third-party store, and purging data from it
   later is painful.

5. **Register a notification-opened listener once, at startup**, in
   `src/services/notifications/listener.ts` (scaffolded), and route based on
   the payload's data — never trust notification _content_ for anything
   sensitive, since it's visible on the lock screen and passes through
   Apple's and Google's infrastructure. Send an identifier and fetch details
   once the app is open.

6. **On the backend, send with the REST API key** (server-side only — it can
   message your entire audience) and target by tag or by the OneSignal
   external id you set in step 3, not by broadcasting to everyone.

## Validation

Work through `implementation/push-notifications/checklist.md` on a real
device — most of this is untestable in a simulator.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/push-notifications/prompts/implement.md` to your
assistant — it has this plan's context already folded in.
