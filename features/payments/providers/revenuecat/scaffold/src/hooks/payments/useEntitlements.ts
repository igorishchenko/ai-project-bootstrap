// Scaffolded by `ai-project-bootstrap implement payments` (RevenueCat).
// See implementation/payments/plan.md, step 4.
//
// The source of truth is `getCustomerInfo()`, not a cached flag — a locally
// cached "is pro" flag goes stale the moment a subscription is refunded,
// cancelled or expires.

import { useEffect, useState } from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

export interface UseEntitlementsResult {
  loading: boolean;
  /** Check e.g. `entitlements['pro']` — never gate on a product identifier instead. */
  entitlements: Record<string, boolean>;
}

export function useEntitlements(): UseEntitlementsResult {
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Purchases.getCustomerInfo()
      .then((customerInfo) => {
        if (!cancelled) setInfo(customerInfo);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // The SDK identifies a listener by function reference, so the same
    // reference has to be passed to both add and remove — an inline arrow
    // passed to each separately would not be recognised as "the same" one.
    const listener = (customerInfo: CustomerInfo): void => setInfo(customerInfo);
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  const entitlements = Object.fromEntries(
    Object.entries(info?.entitlements.active ?? {}).map(([id]) => [id, true]),
  );

  return { loading, entitlements };
}
