The signed-in session is a JWT that travels with every database call. Postgres
evaluates the policy; the app never decides what a user may read.

```mermaid
sequenceDiagram
  participant App
  participant Auth as Supabase Auth
  participant DB as Postgres

  App->>Auth: signInWithPassword / OAuth
  Auth-->>App: session (access + refresh token)
  App->>App: persist via storage adapter
  App->>DB: query carrying the JWT
  DB->>DB: policy evaluates auth.uid()
  DB-->>App: only the permitted rows
```

The refresh token is what keeps this working past the access token's lifetime.
Subscribing to `onAuthStateChange` once means the whole app sees the refreshed
session; polling `getSession()` per screen does not.

```mermaid
flowchart LR
  start["App start"] --> restore["Restore session from storage"]
  restore --> subscribe["onAuthStateChange"]
  subscribe --> state["Single session state"]
  state --> screens["Every screen"]
```
