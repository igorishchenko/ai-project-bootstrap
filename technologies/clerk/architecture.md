Clerk owns the user record. Your database owns everything else, joined by
Clerk's user id.

```mermaid
sequenceDiagram
  participant App
  participant Clerk
  participant API as Your backend

  App->>Clerk: sign in (hosted flow)
  Clerk-->>App: session, cached in secure storage
  App->>Clerk: getToken()
  Clerk-->>App: short-lived JWT
  App->>API: request with Bearer token
  API->>Clerk: verify against public keys
  API-->>App: response scoped to the verified user
```

The verification step is the security boundary. A user id in a request body is
attacker-controlled; only the verified token identifies the caller.

### Keeping the two sides in sync

```mermaid
flowchart LR
  clerk["Clerk user.deleted"] --> hook["Webhook endpoint"]
  hook --> purge["Delete application rows for that userId"]
```

Without that webhook, deleting a user in Clerk leaves their application data
behind indefinitely.
