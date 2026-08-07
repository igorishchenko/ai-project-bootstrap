// Scaffolded by `ai-project-bootstrap implement payments` (Stripe).
// See implementation/payments/plan.md, steps 3-6.
//
// Wire this into a route that gives you the RAW request body — most
// frameworks parse JSON by default, which breaks the signature check below.
// In a Next.js App Router route handler, that means reading `req.text()`
// rather than `req.json()`.

import { stripe } from './stripeClient';

/** Skipping already-processed event ids is what makes this idempotent — see plan.md, step 5. */
export interface ProcessedEventStore {
  has(eventId: string): Promise<boolean>;
  add(eventId: string): Promise<void>;
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  processedEvents: ProcessedEventStore,
): Promise<void> {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET as string,
  );

  if (await processedEvents.has(event.id)) return; // already handled — Stripe retries and delivers at-least-once

  switch (event.type) {
    case 'checkout.session.completed': {
      // TODO (plan.md, step 4): this — not the client reaching success_url —
      // is what actually proves payment. Grant access using
      // event.data.object.client_reference_id or .customer to find your user.
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // TODO (plan.md, step 6): update or revoke access for the subscription
      // in event.data.object. Store the Stripe customer/subscription id
      // against your own user record so you can look them up here.
      break;
    }
    default:
      // Unhandled event types are normal — Stripe sends many you don't need.
      break;
  }

  await processedEvents.add(event.id);
}
