# Implementing payments — Stripe

{{projectName}} uses Stripe. This plan gets you to a working checkout with a
webhook you can actually trust — the webhook, not the success page, is what
should grant access.

## What you're building

- A server-side endpoint that creates a Checkout Session for a price you
  control — never a price the client sends you.
- A webhook endpoint that verifies Stripe's signature against the **raw**
  request body and grants access from `checkout.session.completed`, handling
  the subscription lifecycle (`updated`, `deleted`) if you're selling a
  subscription rather than a one-off.
- Idempotent event handling, since Stripe delivers webhooks at-least-once.

## Before you start

- Read `docs/setup.md#stripe` and this project's generated Stripe rule/skill
  (`.cursor/rules/stripe.mdc` or `.claude/skills/stripe/SKILL.md`).
- Confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set server-side
  — see `.env.example`. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the only one
  that may reach the browser.
- For local development: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
  (from this project's `dependencies.json`) forwards real webhook events to
  your machine and prints the signing secret to use locally.
- **If this is a mobile app**: Stripe cannot be used for digital goods
  purchased inside an iOS or Android app — the platforms require their own
  in-app purchase system for that (see the `payments` RevenueCat plan
  instead). Stripe here is for web checkout, or for physical goods/services
  regardless of platform.

## Steps

1. **Create the price in the Stripe dashboard first** (Products → your
   product → pricing), and reference its id from your server — never let the
   client tell you an amount, price or currency. A forged request body is
   trivial to send.

2. **Fill in the Checkout Session endpoint** (scaffolded in
   `server/payments/createCheckoutSession.ts`), looking the price up
   server-side by the id from step 1:

   ```ts
   const session = await stripe.checkout.sessions.create({
     mode: 'subscription', // or 'payment' for a one-off
     line_items: [{ price: priceId, quantity: 1 }],
     success_url: `${origin}/billing/success`,
     cancel_url: `${origin}/billing`,
   });
   ```

3. **Fill in the webhook handler** (scaffolded in
   `server/payments/webhook.ts`). Verify the signature against the **raw**
   body — a parsed/re-serialized body breaks the signature check and an
   unverified endpoint accepts forged "payment succeeded" events from
   anyone:

   ```ts
   const event = stripe.webhooks.constructEvent(
     rawBody,
     signature,
     process.env.STRIPE_WEBHOOK_SECRET!,
   );
   ```

4. **Grant access from the webhook, not the success page.** Landing on
   `success_url` only means the browser redirected there — it is not proof
   payment succeeded. `checkout.session.completed` is.

5. **Make handling idempotent.** Stripe retries and delivers at-least-once:
   record the event id you've already processed and skip duplicates, or a
   retried webhook grants access twice.

6. **Handle the subscription lifecycle**, not just checkout completion — if
   you're selling a subscription, also handle
   `customer.subscription.updated` and `customer.subscription.deleted`, and
   store the Stripe customer/subscription id against your own user so you
   can look them up later.

7. **Build the billing UI** (scaffolded in `src/features/billing/`) that
   calls the endpoint from step 2 and redirects to the returned session URL.

## Validation

Work through `implementation/payments/checklist.md`.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/payments/prompts/implement.md` to your assistant — it
has this plan's context already folded in.
