# Implement authentication — Auth0

> Read `implementation/authentication/plan.md` first if you haven't — this
> prompt assumes it. Replace the bracketed parts, delete what doesn't apply,
> then send.

Implement authentication in {{projectName}} using Auth0, following
`implementation/authentication/plan.md` step by step.

## Context

- Read `docs/setup.md#auth0` and
  `.cursor/rules/auth0.mdc`/`.claude/skills/auth0/SKILL.md` for the
  conventions this project expects.
- Check `package.json` for which Auth0 SDK is actually installed
  (`@auth0/nextjs-auth0`, `@auth0/auth0-react` or `react-native-auth0`) and
  confirm its current API against
  [Auth0's own docs](https://auth0.com/docs/quickstart/webapp/nextjs) before
  wiring anything up — the integration shape has changed across major
  versions and this prompt intentionally doesn't hardcode it.
- Scaffolded, currently a stub: `src/features/auth/screens/SignInScreen.tsx`.
  Adapt it to whichever integration shape you confirmed above, rather than
  assuming it's already correct.

## Requirements

- Login requests an `audience` (`AUTH0_AUDIENCE`), so the access token is a
  verifiable JWT.
- [If you have an API in this project] token verification against Auth0's
  JWKS, checking both `aud` and `iss`.
- [Add roles/permissions here if this app needs them] delivered via a
  namespaced custom claim, added with an Auth0 Action.
- Logout clears any cached user-scoped state.

## Constraints

- No client secret in a SPA or mobile bundle — those use PKCE.
- No access decision made from an unverified claim or a client-supplied user
  id.
- New environment variables get added to `.env.example` in this change.
- Include the tests described in `docs/testing.md`.

## Before you start

Tell me the files you plan to create or change, which Auth0 SDK is actually
installed, and anything above that's ambiguous — in particular whether roles
are in scope for this change. Then implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/authentication/checklist.md` and tell me what's
verified versus what still needs a human (dashboard configuration, a token
issued for a different API to confirm your API actually rejects it).
