# Implementing payments — RevenueCat

{{projectName}} uses RevenueCat for in-app purchases. This plan gets you to a
working paywall, backed by entitlements rather than product ids — the
distinction that keeps a future pricing change from needing an app update.

## What you're building

- A payments service that configures the SDK once and exposes offerings,
  entitlements and a purchase call — nothing else touches
  `react-native-purchases` directly.
- A paywall screen that presents the current offering and handles purchase,
  cancellation and restore.
- An access check, elsewhere in the app, that reads entitlements — never a
  product identifier.

## Before you start

- Read `docs/setup.md#revenuecat` and this project's generated RevenueCat
  rule/skill (`.cursor/rules/revenuecat.mdc` or
  `.claude/skills/revenuecat/SKILL.md`).
- Confirm `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` are set — see `.env.example`. The
  secret key is server-side only and this plan never needs it client-side.
- **This needs a development build, not Expo Go** — `react-native-purchases`
  is a native module. If you haven't already: `npx expo prebuild --clean`
  then `npx expo run:ios` / `run:android`.
- In App Store Connect: the Paid Applications agreement is signed and
  active, and your products exist and are approved. In the Play Console:
  subscriptions are created **and activated**, which needs a build on a
  testing track first. In the RevenueCat dashboard: every product is
  attached to an entitlement, the entitlement is attached to an offering,
  and that offering is marked current.

## Steps

1. **Configure the SDK once, at startup**, in
   `src/services/payments/purchases.ts` (scaffolded):

   ```ts
   import Purchases from 'react-native-purchases';

   Purchases.configure({
     apiKey: Platform.select({
       ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!,
       android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
     })!,
   });
   ```

   Calling `configure()` more than once, or after another SDK call, is a
   common source of confusing bugs — this must run first.

2. **Call `Purchases.logIn(userId)` after your app's own sign-in**, and
   `logOut()` after sign-out, so entitlements follow the account rather than
   the device.

3. **Fill in the offerings and purchase calls** in
   `src/services/payments/purchases.ts`: fetch the current offering, expose a
   `purchase(package)` call, and handle `userCancelled` as a normal outcome —
   not an error to report or log.

4. **Fill in `src/hooks/payments/useEntitlements.ts`** (scaffolded), calling
   `Purchases.getCustomerInfo()` — this, not a cached flag, is the source of
   truth. A locally-cached "is pro" flag goes stale the moment a subscription
   is refunded, cancelled or expires.

5. **Build the paywall** (scaffolded in
   `src/features/subscriptions/screens/PaywallScreen.tsx`) against the
   offering from step 3. Include a visible restore-purchases action — Apple
   rejects submissions without one, and users need it after reinstalling.

6. **Gate access on entitlements everywhere else in the app** — check
   `entitlements.active['<your-entitlement-id>']`, never a product
   identifier. Hardcoding a product id means every pricing or packaging
   change needs an app update.

## Validation

Work through `implementation/payments/checklist.md` — in-app purchases fail
in ways that only show up in production, so this is worth taking seriously
before you ship.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/payments/prompts/implement.md` to your assistant — it
has this plan's context already folded in.
