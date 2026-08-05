# Stripe

Payments in {{projectName}}.

## The client cannot be trusted with money

Never accept an amount, price or currency from a request body:

```ts
// No — anyone can post { amount: 1 }
stripe.checkout.sessions.create({ line_items: [{ price_data: { unit_amount: body.amount } }] });

// Yes — the client names a product, the server knows what it costs
const price = await lookupPrice(body.priceId);
```

If a task asks you to pass the total from the frontend "because it is already
calculated there", say why that cannot be done. This is the single most
exploitable mistake in a payments integration.

## Webhooks decide what happened

The browser can be closed, refreshed, or simply pointed at your success URL.
Payment state comes from Stripe, to your server, by webhook.

Three requirements, each of which fails silently when missed:

1. **Verify the signature against the raw body.** A framework that parses JSON
   first breaks it — and an unverified endpoint lets anyone post a forged
   "payment succeeded".
2. **Be idempotent.** Stripe retries and delivers at-least-once. Record the event
   id; a duplicate must not grant access twice or credit an account twice.
3. **Handle the lifecycle** — `customer.subscription.updated` and `.deleted`,
   not just `checkout.session.completed`. Otherwise a cancelled subscription
   keeps its access forever.

## Amounts are integers

`unit_amount: 1999` is £19.99. Never use floating point for money.

## Mobile

Stripe cannot be used for digital goods in an iOS or Android app — the stores
require their own in-app purchase and will reject the build. If this project has
a mobile app selling subscriptions, that belongs to the in-app purchase module,
and Stripe covers web only.

## Verifying

`stripe listen --forward-to …` gives a local webhook secret. Test the declines
and 3D Secure cards, not only `4242…`. If you could not exercise the webhook,
say so rather than implying the flow works end to end.
