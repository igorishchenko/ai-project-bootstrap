# Implement payments — RevenueCat

> Read `implementation/payments/plan.md` first if you haven't — this prompt
> assumes it. Replace the bracketed parts, delete what doesn't apply, then
> send.

Implement in-app purchases in {{projectName}} using RevenueCat, following
`implementation/payments/plan.md` step by step.

## Context

- Read `docs/setup.md#revenuecat` and
  `.cursor/rules/revenuecat.mdc`/`.claude/skills/revenuecat/SKILL.md` for the
  conventions this project expects.
- This needs a development build, not Expo Go — confirm one exists before
  testing anything (plan.md's "Before you start").
- Scaffolded, currently empty: `src/services/payments/purchases.ts`,
  `src/hooks/payments/useEntitlements.ts`,
  `src/features/subscriptions/screens/PaywallScreen.tsx`. Fill these in
  rather than restructuring them, unless there's a concrete reason to.

## Requirements

- [Name your entitlement id(s) and what each unlocks.]
- A paywall presenting the current offering, with a working restore-purchases
  action.
- An entitlements hook other screens can use to gate access, backed by
  `getCustomerInfo()` rather than a cached flag.
- `Purchases.logIn`/`logOut` tied to your app's own sign-in/sign-out.

## Constraints

- Every access check reads an entitlement, never a product identifier.
- No purchase logic inside a component — it goes through the service this
  plan scaffolded.
- `userCancelled` is a normal outcome, not an error to surface or log.
- Include the tests described in `docs/testing.md` (for what's actually
  testable outside a real purchase — mock the SDK boundary, don't try to
  simulate App Store/Play behaviour).

## Before you start

Tell me the files you plan to create or change, your entitlement id(s), and
anything above that's ambiguous. Then implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/payments/checklist.md` and
`checklists/revenuecat-*.md`, and tell me what's verified versus what still
needs a physical device and a sandbox purchase.
