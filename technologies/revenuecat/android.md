The billing permission is added automatically by the library's autolinking —
no manifest edit needed. Rebuild after installing:

```bash
npx expo prebuild --platform android --clean
npx expo run:android
```

**Before anything can work:**

1. A build must be uploaded to at least the internal testing track. Google Play
   will not let you create products for an app that has never been uploaded —
   this catches most people on day one.
2. Subscriptions must be created **and activated**. A created-but-inactive
   product returns empty offerings.
3. A service account with billing permissions must be linked, and its JSON
   credentials uploaded to RevenueCat. This is what lets RevenueCat validate
   purchases and receive renewal notifications.
4. Real-time developer notifications must be configured via Pub/Sub.

**Testing** requires a licence tester account added in the Play Console, using a
build installed from a testing track — not a local debug build. Test purchases
are free and renew on a compressed schedule.

**Common Android-only failure:** purchases work on iOS but return "item
unavailable" on Android. This is almost always the service account link or an
inactive product, not the client code.
