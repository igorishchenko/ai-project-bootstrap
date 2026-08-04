### Overview

RevenueCat wraps StoreKit and Google Play Billing behind one API, and keeps
subscription state on its servers. That server-side record is the point: it
survives reinstalls, works across platforms, and gives you one place to ask
"does this user have access?" instead of reconciling two stores' receipt
formats yourself.

The model has four layers, and confusing them causes most integration problems:

| Concept | What it is |
| --- | --- |
| **Product** | An SKU configured in App Store Connect / Play Console |
| **Entitlement** | What access a product grants, e.g. `pro`. Your code checks this |
| **Offering** | A group of packages shown on the paywall |
| **Package** | A product inside an offering, e.g. monthly, annual |

Your app checks **entitlements**. It should never contain a product identifier
in an access check — that is what lets you change pricing and SKUs without
shipping a build.

### Store configuration first

RevenueCat cannot work until the stores are configured. Do this before writing
code.

**App Store Connect**

1. Sign the Paid Applications agreement — purchases silently fail without it.
2. Create your subscription group and products.
3. Create an in-app purchase key (Users and Access → Integrations) and upload it
   to RevenueCat.
4. Add the App Store Server Notifications URL from RevenueCat.
5. Create a sandbox tester account.

**Google Play Console**

1. Upload a build to at least the internal testing track — products cannot be
   created for an app that has never been uploaded.
2. Create your subscriptions and activate them.
3. Link a service account with billing permissions and upload its JSON to
   RevenueCat.
4. Add licence testers.

**RevenueCat dashboard**

1. Create the project and add both apps.
2. Import products, then attach them to an entitlement (`pro`).
3. Build an offering containing the packages the paywall should show.

### Install

```bash
npx expo install react-native-purchases
npx expo prebuild --clean
npx expo run:ios
```

`react-native-purchases` contains native code — it needs a rebuild, not a
reload, and it will not run in Expo Go.

### Configure

Once, at startup, in `src/services/payments/client.ts`:

```ts
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export function configurePurchases() {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);

  Purchases.configure({
    apiKey: Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
    })!,
  });
}
```

Each platform has its own public SDK key. The **secret** API key is for
server-to-server calls only and must never reach the app.

### Checking access

```ts
const info = await Purchases.getCustomerInfo();
const isPro = info.entitlements.active['pro'] !== undefined;
```

### Purchasing

```ts
const offerings = await Purchases.getOfferings();
const pkg = offerings.current?.availablePackages[0];
if (!pkg) return;

try {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  if (customerInfo.entitlements.active['pro']) unlock();
} catch (error) {
  if (!error.userCancelled) report(error);
}
```

A cancelled purchase arrives as an error with `userCancelled: true`. Treating it
as a failure produces an error dialog every time someone changes their mind.

### Restore purchases

```ts
const info = await Purchases.restorePurchases();
```

Both stores **require** a visible restore option. Apple rejects apps without
one, and it is a real user need after a reinstall or a new device.

### Identifying users

```ts
await Purchases.logIn(userId);   // after sign-in
await Purchases.logOut();        // after sign-out
```

Call `logIn` with your own stable user id so entitlements follow the account
rather than the device.

### Testing

- **iOS**: a sandbox tester account, on a physical device. Sandbox subscription
  periods are compressed — a month renews in minutes.
- **Android**: a licence tester account, from a build on a testing track.
- Neither store allows purchase testing in a simulator.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "There is no singleton instance" | `configure` was never called, or ran after the first use |
| Offerings come back empty | Products not attached to an offering, or not approved in the store |
| Purchases fail in sandbox | Paid Applications agreement unsigned, or wrong sandbox account |
| Entitlement not active after purchase | Product not attached to the entitlement in the dashboard |
| Works on iOS, not Android | Play service account not linked, or the build is not on a track |
| Nothing works in Expo Go | Expected — this is a native module. Build a dev client |

### Common mistakes

- **Checking product identifiers instead of entitlements.** Pricing changes then
  require an app update.
- **Trusting local state for access.** Verify with `getCustomerInfo()`.
- **Treating `userCancelled` as an error.** Users see a failure dialog for
  changing their mind.
- **No restore button.** Apple rejects the submission.
- **Shipping the secret key.** It can read and modify subscriber data.
- **Testing only in the simulator.** Purchases cannot work there.

### Production checklist

- [ ] Paid Applications agreement signed and active.
- [ ] Products approved in both stores.
- [ ] Every product attached to an entitlement, and the entitlement to an
      offering.
- [ ] Server notification webhooks configured for both stores.
- [ ] Restore purchases reachable from the UI.
- [ ] Access checks read entitlements, never product ids.
- [ ] Purchase, cancel, restore and expiry all tested on physical devices.
- [ ] Secret API key absent from the app.

### Documentation

- [RevenueCat docs](https://www.revenuecat.com/docs/)
- [React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Entitlements](https://www.revenuecat.com/docs/getting-started/entitlements)
- [Sandbox testing](https://www.revenuecat.com/docs/test-and-launch/sandbox)
