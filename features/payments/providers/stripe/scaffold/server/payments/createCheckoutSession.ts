// Scaffolded by `ai-project-bootstrap implement payments` (Stripe).
// See implementation/payments/plan.md, steps 1-2.

import { stripe } from './stripeClient';

export interface CreateCheckoutSessionInput {
  /** A Stripe price id looked up server-side — never an amount from the client. */
  priceId: string;
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
  /** Your own user id, if you have one at checkout time — lets the webhook find them again. */
  clientReferenceId?: string;
}

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<string> {
  // TODO (plan.md, step 1): validate `input.priceId` against the price(s)
  // you actually created in the Stripe dashboard, rather than trusting
  // whatever the caller passed — this function alone doesn't do that check.
  const session = await stripe.checkout.sessions.create({
    mode: input.mode,
    line_items: [{ price: input.priceId, quantity: 1 }],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.clientReferenceId,
  });

  if (!session.url) throw new Error('Stripe did not return a Checkout Session URL.');
  return session.url;
}
