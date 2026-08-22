### Overview

Auth0 is hosted identity built around OpenID Connect. It is the option to pick
when you need enterprise SSO, SAML, or per-tenant connections — things most
alternatives do not do at all.

The concept that causes the most confusion is the **audience**. Without it, Auth0
returns an opaque token that your API cannot verify. Requesting an audience
returns a JWT signed for that API. Almost every "my backend rejects the token"
question is a missing audience.

### Configure the tenant

1. Create a tenant at [manage.auth0.com](https://manage.auth0.com).
2. **Applications** — create one. Single Page Application for a browser app,
   Native for mobile, Regular Web App when you have a server.
3. Set **Allowed Callback URLs**, **Logout URLs** and **Web Origins**. Login
   silently fails to return without these, and the error is not shown to you.
4. **APIs** — create an API with an identifier. That identifier is your
   `audience`.
5. **Authentication → Database / Social** — enable the connections you want.

Use a separate tenant per environment. Auth0 has no environment concept inside
one, so sharing means test users in your production directory.

### Install

```bash
{{#if has.react-native}}npx expo install react-native-auth0
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}npm install @auth0/nextjs-auth0
{{/if}}{{#unless has.nextjs}}npm install @auth0/auth0-react
{{/unless}}{{/unless}}```

### Getting a usable token

```ts
const token = await getAccessTokenSilently({
  authorizationParams: { audience: process.env.AUTH0_AUDIENCE },
});
```

Send it as a bearer token. Your API verifies it against Auth0's JWKS — and must
check the `audience` and `issuer` claims, not just the signature. A valid token
for a *different* API is still a valid signature.

### Roles and permissions

Auth0 does not put roles in the token by default. Add them with an Action, under
a namespaced claim:

```js
api.accessToken.setCustomClaim('https://yourapp.com/roles', event.authorization.roles);
```

Namespacing is required — unnamespaced custom claims are silently dropped.

### Sessions

Refresh tokens need `offline_access` in the scope. Without it, sessions end when
the access token expires, which users experience as being logged out at random.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| API rejects a valid-looking token | No `audience` requested; the token is opaque |
| Login never returns | Callback URL not in the allowed list |
| Custom claims missing | Not namespaced with a URL |
| Logged out unexpectedly | `offline_access` scope missing |
| Works locally, fails deployed | Different tenant, or URLs not registered for that origin |

### Common mistakes

- **Omitting the audience.** The most common integration failure by far.
- **Verifying only the signature.** Check `aud` and `iss` too.
- **Unnamespaced custom claims.** Dropped without warning.
- **One tenant for all environments.** Test users in the production directory.
- **Client secret in a browser app.** SPAs use PKCE and hold no secret.

### Production checklist

- [ ] Separate tenant per environment.
- [ ] Callback, logout and web origin URLs registered for production.
- [ ] API audience configured; tokens verified for `aud` and `iss`.
- [ ] Client secret server-side only — never in a SPA or mobile app.
- [ ] Refresh tokens enabled with rotation.
- [ ] MFA policy decided.
- [ ] Custom claims namespaced.
- [ ] Account deletion removes application data too.

### Documentation

- [Auth0 docs](https://auth0.com/docs)
- [Audience and APIs](https://auth0.com/docs/get-started/apis)
- [Actions](https://auth0.com/docs/customize/actions)
- [Token best practices](https://auth0.com/docs/secure/tokens/token-best-practices)
