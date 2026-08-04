# SQLite

Local data in {{projectName}}.

## This is not a cache

A cache can be discarded. This database holds writes the user believes are
saved. That distinction is why the rules below are strict — particularly around
migrations, which run on devices you will never see and cannot restore.

## Migrations are the dangerous part

Forward-only, ordered, idempotent, tracked with `PRAGMA user_version`.

Never `DROP TABLE`, drop a column, or rewrite data destructively in an upgrade
path. On your machine the schema is already current so it looks fine; on a user's
phone running a build from six months ago it deletes their data.

When asked for a schema change, write the additive migration and say explicitly
what the upgrade path from the previous version is.

## Bind parameters, always

```ts
await db.getAllAsync<Note>('SELECT id, body FROM notes WHERE id = ?', [id]);
```

Never build SQL by concatenation. Locally it still breaks on any text
containing an apostrophe, and it is a genuine injection vector wherever the
value crosses a boundary.

## Transactions for bulk writes

```ts
await db.withTransactionAsync(async () => {
  for (const note of notes) await db.runAsync('INSERT OR REPLACE INTO notes VALUES (?, ?, ?)', [...]);
});
```

Each write outside a transaction is its own disk sync. A few hundred rows is the
difference between instant and several seconds.

## Where the code goes

All SQL lives in `src/services/database/`. Screens and hooks call that service;
they never contain queries. Open the database once and reuse the handle.

## Never store secrets here

The file is unencrypted and readable on a compromised or rooted device. Tokens,
keys and credentials go to secure storage. If asked to persist a session token
in SQLite, say why that is the wrong place.
