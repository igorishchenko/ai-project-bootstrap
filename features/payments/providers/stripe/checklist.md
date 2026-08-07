# Payments checklist — Stripe (this implementation)

## Trust boundary

- [ ] The price charged always comes from a server-side lookup by id — the
      endpoint never accepts an amount, price or currency from the client.
- [ ] The secret key is used only server-side; only the publishable key
      reaches the browser.

## Webhook

- [ ] Signature verified against the **raw** request body, not a
      parsed/re-serialized one.
- [ ] Access is granted from `checkout.session.completed`, not from the
      client reaching `success_url`.
- [ ] Event ids are recorded and duplicates are skipped — handling is
      idempotent against Stripe's at-least-once delivery.
- [ ] `customer.subscription.updated` and `.deleted` are both handled, if
      you're selling a subscription rather than a one-off.

## Money

- [ ] Amounts are integers in the smallest currency unit throughout — no
      floats.
- [ ] The Stripe customer and subscription id are stored against your own
      user record.

## Never

- [ ] No full card number, secret key, or webhook payload containing
      personal data ever logged.
- [ ] Not used for digital goods inside a mobile app — the platforms reject
      it; that needs their own in-app purchase system instead.

## Tested (use `stripe listen` and Stripe's test cards)

- [ ] A completed checkout actually grants access, driven by the webhook.
- [ ] A retried/duplicate webhook event does not grant access twice.
- [ ] A cancelled subscription revokes access.
