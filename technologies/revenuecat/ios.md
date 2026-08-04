Add the In-App Purchase capability via the config plugin, then rebuild:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.example.{{projectSlug}}",
      "entitlements": {
        "com.apple.developer.in-app-payments": []
      }
    }
  }
}
```

```bash
npx expo prebuild --platform ios --clean
npx expo run:ios
```

**Before anything can work:**

1. The Paid Applications agreement must be signed and active in App Store
   Connect. Until it is, every purchase fails with an error that does not
   mention the agreement.
2. Products must exist and be in a purchasable state.
3. An in-app purchase key must be uploaded to RevenueCat.
4. The App Store Server Notifications v2 URL from RevenueCat must be configured,
   or renewals and cancellations will not reach your backend.

**Testing** requires a sandbox tester account, signed in under Settings →
App Store → Sandbox Account, on a physical device. Sandbox renewal periods are
compressed: a "monthly" subscription renews every few minutes, which is how you
test expiry without waiting a month.
