# Auth0

Authentication in {{projectName}}.

## Request an audience, or the token is useless

```ts
await getAccessTokenSilently({
  authorizationParams: { audience: process.env.AUTH0_AUDIENCE },
});
```

Without `audience`, Auth0 returns an **opaque** token — a reference string, not a
JWT. It looks like a token, the login succeeded, and the API rejects it with a
message that points nowhere useful.

If someone reports "the backend says my token is invalid", check this first.

## Verify three things, not one

The API must check the signature, the `aud` claim and the `iss` claim. A token
signed by the same Auth0 tenant for a *different* API has a perfectly valid
signature — accepting it means any application in the tenant can call yours.

## Access tokens, not ID tokens

ID tokens describe the user to the client. Access tokens authorise API calls.
Sending an ID token to an API is a common shortcut that works until someone
tightens verification, then breaks confusingly.

## Custom claims need a namespace

```js
api.accessToken.setCustomClaim('https://yourapp.com/roles', roles);
```

An unnamespaced claim is dropped silently — no error, the claim just is not
there. Roles are also not included by default; an Action has to add them.

## Sessions need offline_access

Without that scope there is no refresh token, so the session ends when the
access token expires. Users experience it as being logged out at random, and it
does not reproduce in a short testing session.

## Never

The client secret is server-side only — SPAs and mobile apps use PKCE and hold
no secret. If a task asks you to put one in a browser app, say why it cannot be
there.

Never authorise from a user id the client supplied; use the verified `sub`.
