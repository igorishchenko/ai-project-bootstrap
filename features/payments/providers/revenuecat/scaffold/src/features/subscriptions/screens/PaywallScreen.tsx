// Scaffolded by `ai-project-bootstrap implement payments` (RevenueCat).
// See implementation/payments/plan.md, step 5.

import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { PurchasesOffering } from 'react-native-purchases';
import {
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
} from '../../../services/payments/purchases';

export function PaywallScreen(): React.JSX.Element {
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentOffering().then(setOffering);
  }, []);

  if (!offering) return <Text>Loading…</Text>;

  return (
    <View>
      {offering.availablePackages.map((pkg) => (
        // TODO (plan.md, step 5): render real pricing/period from `pkg.product`,
        // and swap this for a real button component.
        <Text
          key={pkg.identifier}
          onPress={
            busy
              ? undefined
              : async () => {
                  setBusy(true);
                  try {
                    await purchasePackage(pkg);
                  } finally {
                    setBusy(false);
                  }
                }
          }
        >
          {pkg.product.title} — {pkg.product.priceString}
        </Text>
      ))}
      {/* Required by Apple, and needed after a reinstall — do not omit this. */}
      <Text onPress={() => restorePurchases()}>Restore purchases</Text>
    </View>
  );
}
