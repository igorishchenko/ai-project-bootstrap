# PostgreSQL

Database access in {{projectName}}.

## Server-side only — this is the important one

The client app must never open a database connection or hold `DATABASE_URL`.
A connection string is full read/write access to everything, and anything
bundled into an app can be extracted from it.

If a task asks you to query Postgres directly from a screen or to put
`DATABASE_URL` in a client-visible variable, stop and say why: the data needs an
API endpoint or an edge function in front of it. This is not a preference, and
there is no configuration that makes it safe.

## Parameterise

```ts
const { rows } = await pool.query('SELECT id, name FROM profiles WHERE user_id = $1', [userId]);
```

Never build SQL with template literals or concatenation, even from a value that
"can only be a number". That is the injection vulnerability, and validating the
input somewhere else does not fix it.

## Pool, do not connect per request

One shared `Pool`. On serverless keep `max` small — every warm instance holds
its own pool against a shared connection limit, so a generous `max` looks fine
in testing and exhausts the server under real traffic. Put PgBouncer in front
when instances are numerous.

Always release a checked-out client in a `finally`.

## Migrations must survive a rollback

A migration ships before, or alongside, the code that needs it — and the
previously deployed version must still work against it. So:

- Add a column nullable, backfill, enforce `NOT NULL` in a **later** release.
- Add the new column, migrate reads, drop the old one in a **later** release.
- `CREATE INDEX CONCURRENTLY` on a live table; a plain create locks writes.

When asked for a schema change, say which release each step belongs to rather
than writing one migration that breaks the running app.

## Performance

Add the index, then confirm the planner uses it with `EXPLAIN ANALYZE`. An
unused index still costs write throughput.
