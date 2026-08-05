Auth0 issues the token; your API decides what it permits.

```mermaid
sequenceDiagram
  participant App
  participant Auth0
  participant API as Your API

  App->>Auth0: authorize (audience = your API)
  Auth0-->>App: access token (JWT for that audience)
  App->>API: Bearer token
  API->>Auth0: fetch JWKS (cached)
  API->>API: verify signature + aud + iss
  API-->>App: response scoped to the verified sub
```

The `audience` is what makes the token a verifiable JWT rather than an opaque
reference. Omit it and every step after it fails, with an error that describes
the symptom rather than the cause.

Verifying `aud` matters as much as the signature: a token minted by the same
tenant for a different API is correctly signed, and accepting it lets any
application in the tenant call yours.

```mermaid
flowchart LR
  tenantdev["Tenant: development"] --> devusers[("Test users")]
  tenantprod["Tenant: production"] --> realusers[("Real users")]
```
