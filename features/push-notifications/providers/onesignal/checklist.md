# Push notifications checklist — OneSignal

## Configuration

- [ ] `OneSignal.initialize()` called exactly once, at startup.
- [ ] Plugin `mode` in `app.json` matches the build (`development` vs.
      `production` APNs) — a mismatch fails silently.
- [ ] Development and production use separate OneSignal apps.

## Identity

- [ ] `OneSignal.login(userId)` called after sign-in.
- [ ] `OneSignal.logout()` called after sign-out — verify a second user
      signing in on the same device does not receive the first user's
      notifications.

## Permission

- [ ] Your own explanation screen shown before the system prompt.
- [ ] Denied treated as a normal state — nothing in the app is blocked on
      it.

## Tags

- [ ] Only non-personal attributes tagged (plan, locale, onboarding state).
- [ ] No email, name, phone number or other sensitive value ever sent as a
      tag.

## Sending

- [ ] Sends target by tag or external id, never a blanket broadcast for
      user-specific content.
- [ ] Notification payloads carry an identifier, not sensitive content —
      the app fetches details once open.
- [ ] `ONESIGNAL_REST_API_KEY` present only server-side.

## Tested on a physical device (a simulator/Expo Go cannot do this)

- [ ] Permission prompt appears once, after the explanation screen.
- [ ] A notification tap opens the right screen, both from background and
      from a fully cold start.
- [ ] Signing out and a different user signing in on the same device stops
      the first user's notifications from arriving.
