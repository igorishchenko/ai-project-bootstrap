The database is never reachable from a client. An API layer sits in front and is
the only holder of credentials.

```mermaid
flowchart LR
  app["Client app"] -->|HTTPS + auth token| api["API / edge function"]
  api --> pool["Connection pool"]
  pool --> pg[("PostgreSQL")]
  app -.->|never| pg
```

The dotted line is the rule: a connection string in a shipped app grants every
user full read and write access to every row, and no amount of obfuscation
changes that.

### Deploying a schema change safely

```mermaid
flowchart TD
  r1["Release 1: add column, nullable"] --> backfill["Backfill existing rows"]
  backfill --> r2["Release 2: write to both, read new"]
  r2 --> r3["Release 3: enforce NOT NULL, drop old"]
```

Each release must work against the schema on either side of it, because a
rollback deploys the previous code against the current database.

### Starter data model

Nothing here scaffolds real tables — this is a starting point to replace, not
a reflection of your actual schema. `users` owning many rows of some other
entity is the shape most schemas begin from:

```mermaid
erDiagram
  USERS ||--o{ RECORDS : owns
  USERS {
    uuid id PK
    text email
    timestamptz created_at
  }
  RECORDS {
    uuid id PK
    uuid user_id FK
    text data
    timestamptz created_at
  }
```
