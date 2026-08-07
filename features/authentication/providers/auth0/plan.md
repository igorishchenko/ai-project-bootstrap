# Implementing authentication — Auth0

{{projectName}} uses Auth0. This plan assumes the server-rendered
(`@auth0/nextjs-auth0`) setup this project installed — if you're actually
building a single-page app or a native client instead, see the aside at the
end before you start.

## What you're building

- Login/logout routes wired to Auth0, and a way to read the current session
  in your app.
- An **audience** requested on every login, so the access token your API
  receives is a verifiable JWT rather than an opaque string.
- An API that verifies tokens for signature, `audience` **and** `issuer` —
  not just "is this a valid Auth0 token from _some_ application."
- Roles delivered as a namespaced custom claim, since Auth0 doesn't put them
  in the token by default.

## Before you start

- Read `docs/setup.md#auth0` and this project's generated Auth0 rule/skill
  (`.cursor/rules/auth0.mdc` or `.claude/skills/auth0/SKILL.md`) — the
  **audience** concept in particular; almost every "my backend rejects a
  valid-looking token" bug traces back to a missing audience.
- Confirm `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` and `AUTH0_AUDIENCE` are set —
  see `.env.example`. `AUTH0_CLIENT_SECRET` and `AUTH0_SECRET` are
  server-side only.
- In the Auth0 dashboard: **Applications** has your Allowed Callback URLs,
  Logout URLs and Web Origins registered, and **APIs** has an API created
  with an identifier — that identifier is your `AUTH0_AUDIENCE`. Both are
  silent failures if missed: login just doesn't return, with no error shown
  to you.

## Steps

1. **Confirm the exact SDK API for the installed version** —
   `@auth0/nextjs-auth0`'s integration surface (middleware vs. route
   handlers) has changed across major versions. Check
   [the current Auth0 Next.js SDK docs](https://auth0.com/docs/quickstart/webapp/nextjs)
   against what's actually in `package.json` before wiring anything up; don't
   assume this plan's wording matches your installed version exactly.

2. **Wire up login and logout**, requesting the audience on login so the
   returned access token is a JWT your API can verify:

   ```ts
   const token = await getAccessTokenSilently({
     authorizationParams: { audience: process.env.AUTH0_AUDIENCE },
   });
   ```

   Omitting the audience is the single most common integration mistake with
   Auth0 — without it you get an opaque token, and every downstream
   verification step fails in a way that looks unrelated.

3. **Build the sign-in screen** (scaffolded in
   `src/features/auth/screens/SignInScreen.tsx`) — for a server-rendered app
   this is typically just a link to the login route rather than a form; adapt
   the scaffold to whichever integration shape step 1 confirmed.

4. **Verify tokens on your API** against Auth0's JWKS, checking **both**
   `aud` and `iss` — a validly-signed token issued for a _different_ API is
   still not a token for yours, and checking the signature alone doesn't
   catch that.

5. **Add roles via a namespaced custom claim.** Auth0 doesn't put roles in
   the token by default; add one with an Action:

   ```js
   api.accessToken.setCustomClaim(
     'https://{{projectSlug}}.example.com/roles',
     event.authorization.roles,
   );
   ```

   An unnamespaced claim (just `"roles"`) is silently dropped — always use a
   URL-shaped claim name.

6. **Add `offline_access` to the requested scope** if sessions need to
   outlive the access token's lifetime. Without it, users are signed out the
   moment the access token expires, which reads as a random, unexplained
   logout.

7. **Clear cached user-scoped state on logout** — anything fetched while
   signed in as one user must not leak into the next session on a shared
   device or browser.

### If you're actually building a single-page app or native client

This project installed the server-rendered SDK. A SPA uses
`@auth0/auth0-react` instead (no client secret — SPAs use PKCE and hold no
secret at all), and a native/Expo client uses `react-native-auth0`. Swap the
dependency before following the rest of this plan; the audience, token
verification and namespaced-claims guidance above still applies regardless of
which client library you're using.

## Validation

Work through `implementation/authentication/checklist.md`.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/authentication/prompts/implement.md` to your assistant —
it has this plan's context already folded in.
