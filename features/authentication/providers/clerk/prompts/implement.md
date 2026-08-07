# Implement authentication — Clerk

> Read `implementation/authentication/plan.md` first if you haven't — this
> prompt assumes it. Replace the bracketed parts, delete what doesn't apply,
> then send.

Implement authentication in {{projectName}} using Clerk, following
`implementation/authentication/plan.md` step by step.

## Context

- Read `docs/setup.md#clerk` and
  `.cursor/rules/clerk.mdc`/`.claude/skills/clerk/SKILL.md` for the
  conventions this project expects.
- `ClerkProvider` is **not** wired up yet — the app's root layout needs that
  edit directly (plan.md, step 1). Find it before touching anything else.
- Scaffolded, currently empty: `src/features/auth/screens/SignInScreen.tsx`,
  `src/features/auth/screens/SignUpScreen.tsx`,
  `src/hooks/auth/useAuthedFetch.ts`. Fill these in rather than restructuring
  them, unless there's a concrete reason to.

## Requirements

- `ClerkProvider` wrapped around the app with a `expo-secure-store`-backed
  token cache.
- Sign-in and sign-up screens using Clerk's own `useSignIn()`/`useSignUp()`.
- [Add OAuth/social providers here if you're using any.]
- Every screen reading auth state gates on `isLoaded` before `isSignedIn`.
- `useAuthedFetch.ts` attaches `getToken()` as a bearer token when calling
  [name your backend / API routes].
- [If you have a backend in this same project] token verification against
  Clerk's public keys, and a `user.deleted` webhook handler.

## Constraints

- The token cache is `expo-secure-store`, never `AsyncStorage` — this is a
  credential.
- No access decision is made from a client-held user id — only a
  backend-verified token.
- New environment variables get added to `.env.example` in this change.
- Include the tests described in `docs/testing.md`.

## Before you start

Tell me the files you plan to create or change, and anything above that's
ambiguous — in particular which OAuth providers (if any) and whether the
backend verification/webhook piece is in scope for this change. Then
implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/authentication/checklist.md` and tell me what's
verified versus what still needs a human (dashboard configuration, the
production Clerk application).
