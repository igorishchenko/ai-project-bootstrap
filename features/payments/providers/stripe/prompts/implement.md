# Implement payments — Stripe

> Read `implementation/payments/plan.md` first if you haven't — this prompt
> assumes it. Replace the bracketed parts, delete what doesn't apply, then
> send.

Implement payments in {{projectName}} using Stripe, following
`implementation/payments/plan.md` step by step.

## Context

- Read `docs/setup.md#stripe` and
  `.cursor/rules/stripe.mdc`/`.claude/skills/stripe/SKILL.md` for the
  conventions this project expects.
- Scaffolded, currently stubs: `server/payments/createCheckoutSession.ts`,
  `server/payments/webhook.ts`. Fill these in rather than restructuring them,
  unless there's a concrete reason to.
- [Name the price/product id(s) you created in the Stripe dashboard, and
  whether this is a subscription or a one-off purchase.]

## Requirements

- A checkout endpoint that looks the price up server-side by id — never
  trusts a client-supplied amount.
- A webhook endpoint verifying the signature against the raw body, granting
  access from `checkout.session.completed`.
- [If selling a subscription] handling for `customer.subscription.updated`
  and `.deleted`.
- Idempotent webhook handling — record processed event ids.
- Billing UI (in `src/features/billing/`) that starts checkout and handles
  the redirect back.

## Constraints

- The client never determines what gets charged.
- No card numbers, secret keys or webhook payloads containing personal data
  are ever logged.
- New environment variables get added to `.env.example` in this change.
- Include the tests described in `docs/testing.md` — mock the Stripe SDK
  boundary and construct signed test events with `stripe.webhooks.generateTestHeaderString`
  rather than hitting the real API.

## Before you start

Tell me the files you plan to create or change, your price/product id(s),
and anything above that's ambiguous — in particular subscription vs. one-off.
Then implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/payments/checklist.md` and tell me what's verified
versus what still needs `stripe listen` and a real test-mode checkout.
