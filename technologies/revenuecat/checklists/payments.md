# Payments checklist

In-app purchases fail in ways that only appear in production, so verify all of
this before shipping.

## Store configuration

- [ ] Paid Applications agreement signed and **active** in App Store Connect.
- [ ] Products created and approved in App Store Connect.
- [ ] Subscriptions created **and activated** in the Play Console.
- [ ] A build exists on a Play testing track (products cannot exist without one).
- [ ] In-app purchase key uploaded to RevenueCat (iOS).
- [ ] Play service account linked with billing permissions (Android).

## RevenueCat

- [ ] Every product attached to an entitlement.
- [ ] Entitlement attached to an offering, and the offering marked current.
- [ ] App Store Server Notifications configured.
- [ ] Play real-time developer notifications configured.

## Code

- [ ] Access checks read entitlements, never product identifiers.
- [ ] `configure()` runs once at startup, before any other SDK call.
- [ ] `logIn(userId)` after sign-in, `logOut()` after sign-out.
- [ ] `userCancelled` handled as a normal outcome, not an error.
- [ ] Restore purchases reachable from the UI.
- [ ] Secret API key absent from the app.

## Tested on physical devices

- [ ] Purchase completes and unlocks access.
- [ ] Cancelling the sheet leaves no error dialog and no partial state.
- [ ] Restore works on a fresh install with the same account.
- [ ] Expiry revokes access (sandbox periods are compressed — wait it out).
- [ ] Refund revokes access.
- [ ] Purchase on one platform is recognised on the other for the same user.
- [ ] The app behaves sensibly with no network during a purchase.
