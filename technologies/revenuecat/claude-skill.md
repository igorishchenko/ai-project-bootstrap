# RevenueCat

How subscriptions work in {{projectName}}.

## The one rule

**Check entitlements, never product identifiers.**

```ts
// Yes — survives every pricing and SKU change
const isPro = info.entitlements.active['pro'] !== undefined;

// No — breaks the moment marketing changes the plan
const isPro = info.activeSubscriptions.includes('monthly_9_99');
```

An entitlement is what access the user has. A product is how they bought it.
Application code only ever cares about the former.

## Where the code goes

All purchase logic lives in `src/services/payments/`. Components ask that
service whether the user has access; they never import
`react-native-purchases`. This is what makes the paywall testable without a
store connection.

## Source of truth

`getCustomerInfo()` is authoritative. A locally cached "isPro" flag goes stale
after a refund, a cancellation, an expiry, or a purchase made on another device.
Cache it for the render, refresh it on app foreground, and never let it be the
only thing gating access.

## Handling a purchase

```ts
try {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  if (customerInfo.entitlements.active['pro']) unlock();
} catch (error) {
  if (error.userCancelled) return;   // not a failure
  report(error);
}
```

A user changing their mind arrives as an error with `userCancelled: true`.
Showing them an error dialog for that is a bug, and a common one.

## Restore

There must be a visible restore option. Apple rejects submissions without one,
and it is the only recovery path after a reinstall or a device change.

```ts
const info = await Purchases.restorePurchases();
```

## Identity

Call `Purchases.logIn(userId)` after sign-in and `logOut()` after sign-out, so
entitlements follow the account rather than the device.

## Testing

Purchases cannot be tested in a simulator, and cannot run in Expo Go — this is a
native module requiring a development build. If you have not tested a purchase
flow on a physical device with a sandbox account, say so rather than describing
it as verified.

## Never

- Never put the secret API key in the app. It can read and modify subscriber
  data for every user.
- Never gate access on a local flag alone.
- Never assume a purchase succeeded without checking the returned
  `customerInfo`.
