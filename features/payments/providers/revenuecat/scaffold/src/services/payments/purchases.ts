// Scaffolded by `ai-project-bootstrap implement payments` (RevenueCat).
// See implementation/payments/plan.md, steps 1-3.
//
// The one place that talks to `react-native-purchases` — the hook and screens
// call this, never the SDK directly.

import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

let configured = false;

/** Call once, at startup, before any other function in this module. */
export function configurePurchases(): void {
  if (configured) return;
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey)
    throw new Error('Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY/ANDROID_KEY — see .env.example.');
  Purchases.configure({ apiKey });
  configured = true;
}

/** Call after your app's own sign-in, so entitlements follow the account. */
export async function linkPurchasesToUser(userId: string): Promise<void> {
  await Purchases.logIn(userId);
}

/** Call after your app's own sign-out. */
export async function unlinkPurchases(): Promise<void> {
  await Purchases.logOut();
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    // TODO (plan.md, step 3): `userCancelled` is a normal outcome, not an
    // error — check `(error as PurchasesError).userCancelled` and return
    // null instead of rethrowing when it's set.
    throw error;
  }
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}
