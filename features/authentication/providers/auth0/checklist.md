# Authentication checklist — Auth0

## Dashboard

- [ ] Allowed Callback URLs, Logout URLs and Web Origins registered for every
      environment you actually use (including local dev).
- [ ] An API created with an identifier, and that identifier set as
      `AUTH0_AUDIENCE`.
- [ ] Separate tenant per environment — Auth0 has no environment concept
      inside a single tenant.

## Tokens

- [ ] Every login request includes the `audience` parameter.
- [ ] The API verifies the token's signature **and** `aud` **and** `iss` —
      not signature alone.
- [ ] `offline_access` included in the requested scope if sessions need to
      outlive the access token.
- [ ] ID tokens are never sent to an API as authorization — only access
      tokens are.

## Roles and claims

- [ ] Custom claims (roles included) are namespaced with a URL. An
      unnamespaced claim is silently dropped, not rejected — verify it's
      actually present in a decoded token, don't just assume the Action ran.

## Secrets

- [ ] `AUTH0_CLIENT_SECRET` / `AUTH0_SECRET` present only where the
      server/backend runs — never in a SPA or mobile bundle.
- [ ] No token or client secret ever logged.

## Code

- [ ] Cached user-scoped state cleared on logout.
- [ ] Authorization decisions read the verified `sub`/role claims, never a
      client-supplied user id.

## Tested

- [ ] Login and logout work against the actual registered callback URLs, not
      just `localhost` with relaxed settings.
- [ ] A request with a token issued for a different Auth0 API is rejected by
      your API.
