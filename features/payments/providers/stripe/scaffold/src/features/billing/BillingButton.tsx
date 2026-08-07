// Scaffolded by `ai-project-bootstrap implement payments` (Stripe).
// See implementation/payments/plan.md, step 7.
//
// Calls your own checkout endpoint (wired to createCheckoutSession.ts — see
// server/payments/) and redirects to the returned Checkout Session URL.
// Never calls the Stripe API directly from the client.

import { useState } from 'react';

export interface BillingButtonProps {
  /** The endpoint you wired createCheckoutSession.ts into, e.g. "/api/billing/checkout". */
  checkoutEndpoint: string;
  children: React.ReactNode;
}

export function BillingButton({
  checkoutEndpoint,
  children,
}: BillingButtonProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(checkoutEndpoint, { method: 'POST' });
      if (!response.ok) throw new Error(`Checkout request failed: ${response.status}`);
      const { url } = (await response.json()) as { url: string };
      window.location.href = url;
    } catch {
      // TODO (plan.md, step 7): show this to the user instead of swallowing it.
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading}>
      {loading ? 'Redirecting…' : children}
    </button>
  );
}
