# Auth0 environment

The domain, client id and audience are public — they identify the tenant and the
API. The client secret is not: it can act as your application, and browser and
mobile apps must not have one at all (they use PKCE).

Use a separate tenant per environment; Auth0 has no environment concept inside
one, so sharing puts test users in your production directory.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `AUTH0_DOMAIN` | Yes | Tenant domain. | `<tenant>.eu.auth0.com` |
| `AUTH0_CLIENT_ID` | Yes | Application client id. Public. | `xxxxxxxx` |
| `AUTH0_AUDIENCE` | Yes | API identifier. Omitting it returns an opaque token your API cannot verify. | `https://api.<your-domain>` |
| `AUTH0_CLIENT_SECRET` | No | Server-rendered apps only. Never in a SPA or mobile bundle. | `xxxxxxxx` |
| `AUTH0_SECRET` | No | Encrypts the session cookie in server-rendered apps. | `<generate-with-openssl-rand-hex-32>` |
