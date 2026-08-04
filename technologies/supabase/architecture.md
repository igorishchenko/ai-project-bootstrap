The client talks to Postgres over HTTP. There is no application server in the
middle, so the database's own Row Level Security policies are the authorisation
layer.

```mermaid
flowchart TD
  ui["Screens"] --> services["src/services/*"]
  services --> client["supabase client (single instance)"]
  client --> auth["Auth"]
  client --> db["Postgres + RLS"]
  client --> storage["Storage"]
  edge["Edge functions"] --> db
  services --> edge
```

### Authentication flow

```mermaid
sequenceDiagram
  participant App
  participant Auth as Supabase Auth
  participant DB as Postgres

  App->>Auth: signInWithPassword / OAuth
  Auth-->>App: session (JWT)
  App->>DB: query with JWT
  DB->>DB: evaluate RLS using auth.uid()
  DB-->>App: only the rows this user may see
```

The JWT travels with every query, and Postgres evaluates the policy itself. The
client cannot forge `auth.uid()` — which is exactly why authorisation decisions
belong in policies rather than in application code.

### Privileged work

Anything requiring more than the signed-in user's own permissions runs in an
edge function with the service-role key, server-side. That key never reaches the
app; putting it there would bypass every policy above.
