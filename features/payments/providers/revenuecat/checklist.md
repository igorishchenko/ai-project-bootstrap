# Payments checklist — RevenueCat (this implementation)

This project already ships a full pre-launch checklist at
`checklists/revenuecat-*.md` — store configuration, entitlements, tested
device behaviour. Run through that before shipping. This one is narrower: did
the implementation this plan asked for actually come together correctly.

## Configuration

- [ ] `Purchases.configure()` runs exactly once, at startup, before any other
      SDK call.
- [ ] `logIn(userId)` called after your app's sign-in, `logOut()` after
      sign-out.

## Code

- [ ] Every access check reads `entitlements.active[...]`, not a product
      identifier.
- [ ] Access checks live in one place (the hook/service this plan scaffolded)
      — no component calls `react-native-purchases` directly.
- [ ] `userCancelled` handled as a normal outcome, not logged as an error.
- [ ] `getCustomerInfo()` is what the entitlements hook actually calls — not
      a value cached from an earlier purchase.

## Paywall

- [ ] Restore purchases is reachable from the UI, not just implemented
      somewhere unreachable.
- [ ] The offering displayed is the one marked current in the RevenueCat
      dashboard, fetched live — not hardcoded pricing text.

## Tested on a physical device (a simulator/Expo Go cannot do this)

- [ ] A sandbox purchase completes and the entitlement check unlocks access.
- [ ] Cancelling the purchase sheet leaves no error dialog and no partial
      state.
- [ ] Restore works on a fresh install signed into the same account.
