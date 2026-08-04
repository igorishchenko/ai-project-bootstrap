### Overview

A Postgres database you run yourself, reached from **server-side code only** —
an API, a job, or an edge function.

Be clear about that boundary before anything else: a mobile or browser client
must never hold database credentials or open a connection directly. Anything
shipped to a device can be extracted from it, and a database connection string
grants full read and write access to everything. Supabase exists precisely
because it puts an authenticated, policy-enforcing layer in front of Postgres.
Without that layer, you need your own API.

### Install

```bash
npm install pg
npm install -D @types/pg
```

### Connecting

```ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30_000,
});
```

Use a **pool**, not a connection per request. And keep `max` low on serverless:
every instance opens its own pool, so a modest `max` multiplied by many
instances will exhaust the server's connection limit. Use a pooler such as
PgBouncer in front when running serverless.

### Queries

```ts
const { rows } = await pool.query<Profile>(
  'SELECT id, name FROM profiles WHERE user_id = $1 LIMIT 50',
  [userId],
);
```

Parameterised queries only. String interpolation into SQL is the classic
injection vulnerability, and no amount of input sanitising elsewhere makes it
safe.

### Migrations

Schema changes are files in `db/migrations/`, applied in order, committed to
git. Each one must be compatible with the currently deployed application
version, so a rollback does not corrupt data:

- Add a column as nullable, backfill, then enforce `NOT NULL` in a later release.
- Add the new column before removing the old one; delete the old in a follow-up.
- Create indexes `CONCURRENTLY` on a live table — a plain `CREATE INDEX` takes a
  write lock and stalls the application.

### Indexes and performance

```sql
EXPLAIN ANALYZE SELECT ... ;
```

Add an index for every column used in a `WHERE`, `JOIN` or `ORDER BY` on a table
of any size. Verify with `EXPLAIN ANALYZE` rather than assuming — an index the
planner does not use costs write performance for nothing.

### Backups

Automated backups, and a **restore you have actually performed**. An untested
backup is a belief, not a recovery plan.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "too many connections" | Connection per request, or too many serverless pools. Add a pooler |
| Query fast alone, slow under load | Missing index, or a lock from a long transaction |
| "SSL connection required" | Managed providers require SSL. Configure it rather than disabling it |
| Migration hangs | `CREATE INDEX` without `CONCURRENTLY` waiting on a write lock |
| Data missing after a rollback | A migration was not backward-compatible |

### Common mistakes

- **Connecting from a client app.** Ships full database credentials to users.
- **Disabling SSL verification to make a connection work.** That is the check
  that stops interception.
- **A connection per request.** Exhausts the server under trivial load.
- **`SELECT *`** everywhere — breaks when a large column is added.
- **Migrations that only work forward.** A rollback then corrupts data.

### Production checklist

- [ ] No client application holds a connection string.
- [ ] SSL enforced with certificate verification.
- [ ] Pooling configured, sized for the number of running instances.
- [ ] Application user has only the privileges it needs — not superuser.
- [ ] Migrations in git, ordered, backward-compatible with the deployed release.
- [ ] Indexes verified with `EXPLAIN ANALYZE`.
- [ ] Automated backups enabled **and a restore rehearsed**.
- [ ] Slow query logging on.

### Documentation

- [PostgreSQL](https://www.postgresql.org/docs/current/)
- [node-postgres](https://node-postgres.com/)
- [Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [PgBouncer](https://www.pgbouncer.org/)
