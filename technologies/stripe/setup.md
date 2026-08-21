### Overview

Stripe handles card payments, subscriptions and invoicing. It is a web payments
product: on iOS and Android, selling digital goods through it violates store
policy, and the app gets rejected. Physical goods and services are fine.

The single most important architectural fact: **payment state arrives by
webhook, not from the browser.** The user's browser can be closed, refreshed, or
lying. What actually happened is whatever Stripe tells your server.

### Dashboard configuration

1. Create an account at [dashboard.stripe.com](https://dashboard.stripe.com).
2. **Developers → API keys** — copy the publishable and secret keys. Test mode
   keys start `pk_test_`/`sk_test_`.
3. **Products** — create products and prices. Prices are immutable; changing a
   price means creating a new one.
4. **Developers → Webhooks** — add your endpoint and copy the signing secret.
5. Enable the **Customer Portal** so users can manage their own subscriptions
   rather than emailing you.

### Install

```bash
npm install stripe @stripe/stripe-js
```

`stripe` is server-side. `@stripe/stripe-js` is the browser half and only ever
handles publishable keys.

### Checkout

The safest integration is a hosted Checkout Session created server-side:

```ts
// server
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${appUrl}/done?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/pricing`,
  client_reference_id: userId,
});
```

**Never take the price or the amount from the client.** A request body saying
`amount: 1` is trivial to forge; look the price up server-side from an id you
control.

### Webhooks are the source of truth

```ts
const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
```

Three things this needs, each of which breaks it silently if missed:

- **The raw body.** Frameworks that parse JSON first break the signature check.
- **Signature verification.** The endpoint is public; without this anyone can
  post a fake "payment succeeded".
- **Idempotency.** Stripe retries, and delivers at-least-once. Record the event
  id and ignore duplicates, or a retry grants access twice or double-credits an
  account.

Handle at minimum `checkout.session.completed`,
`customer.subscription.updated` and `customer.subscription.deleted`. Landing on
the success page is not proof of payment — the user may simply have visited that
URL.

### Testing

`4242 4242 4242 4242` succeeds; `4000 0000 0000 9995` is declined;
`4000 0025 0000 3155` requires 3D Secure. Test the declines and the
authentication flow, not just the happy path.

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI gives you a webhook secret for local development.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "No signatures found matching" | Body was parsed before verification. Use the raw body |
| Webhook works locally, not deployed | Endpoint or signing secret differs per environment |
| Access granted twice | No idempotency on the event id |
| Subscription state drifts | Only handling `checkout.session.completed` |
{{#if has.mobile}}| App Store rejection | Selling digital goods through Stripe on iOS. Use in-app purchase |
{{/if}}

### Common mistakes

- **Trusting the client for amounts.** Look prices up server-side.
- **Treating the success page as payment confirmation.** Wait for the webhook.
- **Unverified webhooks.** A public endpoint anyone can post to.
- **No idempotency.** Retries are normal, not exceptional.
- **Test keys in production**, or the reverse. Both fail confusingly.

### Production checklist

- [ ] Live keys in production only; secret key server-side.
- [ ] Webhook signature verified against the raw body.
- [ ] Event ids recorded; duplicates ignored.
- [ ] Subscription lifecycle events handled, not just checkout completion.
- [ ] Prices resolved server-side from ids.
- [ ] Customer Portal enabled for self-service.
- [ ] Declines and 3D Secure tested.
- [ ] Not used for digital goods in a mobile app.

### Documentation

- [Stripe docs](https://docs.stripe.com)
- [Checkout](https://docs.stripe.com/payments/checkout)
- [Webhooks](https://docs.stripe.com/webhooks)
- [Testing](https://docs.stripe.com/testing)
