# Stripe environment

The publishable key is designed to reach the browser. The secret key can charge
cards, issue refunds and read every customer — server-side only.

The webhook secret is what proves an incoming event actually came from Stripe.
Without it the endpoint accepts anything.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes | Server-side API key. Never ship in a client bundle. | `sk_test_xxxxxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Verifies webhook signatures. The endpoint is public without it. | `whsec_xxxxxxxx` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Browser-side key for Stripe.js. Safe to expose. | `pk_test_xxxxxxxx` |
