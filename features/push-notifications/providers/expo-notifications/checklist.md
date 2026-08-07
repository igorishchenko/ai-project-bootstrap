# Push notifications checklist — Expo Push

## Permission

- [ ] Your own explanation screen shown before the system prompt — never
      requested cold on first launch.
- [ ] Denied treated as a normal state: the app works fully without push,
      nothing breaks or blocks on it.

## Tokens

- [ ] Token refreshed and re-sent to the backend on every launch, not just
      once at install.
- [ ] Token deleted from the backend on sign-out.
- [ ] Backend purges tokens that come back `DeviceNotRegistered` on a
      delivery receipt.

## Handling

- [ ] Response listener registered exactly once, at startup.
- [ ] Cold start handled with `getLastNotificationResponseAsync()` — a tap
      that launches the app from scratch still opens the right screen.
- [ ] Android notification channel created explicitly.

## Sending

- [ ] Delivery receipts checked after sending — a 200 is treated as
      "accepted," not "delivered."
- [ ] No personal data or token inside the notification payload.

## Tested on a physical device (a simulator/Expo Go cannot do this)

- [ ] Permission prompt appears once, after the explanation screen.
- [ ] A notification received while the app is backgrounded opens the right
      screen on tap.
- [ ] A notification received while the app is fully closed (cold start)
      also opens the right screen on tap.
