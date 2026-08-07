# Implement authentication — Supabase Auth

> Read `implementation/authentication/plan.md` first if you haven't — this
> prompt assumes it. Replace the bracketed parts, delete what doesn't apply,
> then send.

Implement authentication in {{projectName}} using Supabase Auth, following
`implementation/authentication/plan.md` step by step.

## Context

- Read `docs/setup.md#supabase-auth` and
  `.cursor/rules/supabase-auth.mdc`/`.claude/skills/supabase-auth/SKILL.md`
  for the conventions this project expects.
- The Supabase client already exists at `src/services/supabase/client.ts` —
  reuse it, don't create another.
- Scaffolded, currently empty: `src/features/auth/authClient.ts`,
  `src/hooks/auth/useAuth.ts`, `src/features/auth/screens/SignInScreen.tsx`,
  `src/features/auth/screens/SignUpScreen.tsx`. Fill these in rather than
  restructuring them, unless there's a concrete reason to.

## Requirements

- Email/password sign-in and sign-up, wired to the Supabase client.
- [Add OAuth providers here if you're using any — name them, and note that
  each needs its own dashboard configuration this prompt doesn't cover.]
- A session that persists across a real app restart, sourced from one
  `onAuthStateChange` subscription at the top of the app — not read fresh
  per screen.
- RLS policies for [name the tables a signed-in user needs to reach], each
  keyed on `auth.uid()`.
- Sign-out clears any cached user-scoped state (queries, profile, whatever
  else this app caches).

## Constraints

- All `supabase.auth` calls go through `authClient.ts`; screens and the hook
  never import `@supabase/supabase-js` directly.
- No access decision is made from a client-held user id — only a policy's own
  `auth.uid()`.
- New environment variables get added to `.env.example` in this change.
- Include the tests described in `docs/testing.md`.

## Before you start

Tell me the files you plan to create or change, and anything above that's
ambiguous — in particular which OAuth providers (if any) and which tables
need policies. Then implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/authentication/checklist.md` and tell me what's
verified versus what still needs a human (dashboard configuration,
cross-account RLS testing).
