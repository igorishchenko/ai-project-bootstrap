### Overview

SQLite stores structured data on the device. It is what makes an app usable on a
train: reads come from local storage, writes queue up, and the network becomes
an optimisation rather than a requirement.

It is not a cache. A cache can be thrown away; a local database holds writes the
user believes are saved. That difference drives everything below — especially
migrations, which run on devices you cannot inspect.

### Install

```bash
npx expo install expo-sqlite
```

### Opening the database

Once, in a service:

```ts
import * as SQLite from 'expo-sqlite';

export const db = await SQLite.openDatabaseAsync('{{projectSlug}}.db');
```

Use the async API. The legacy callback API still exists in older examples and
will block the JS thread on large queries.

### Schema and migrations

The device may be running any previous version of your schema, so migrations
must be ordered, idempotent and forward-only:

```ts
await db.execAsync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    body TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);
```

Track the schema version with `PRAGMA user_version` and apply each step in
order. There is no "reset the database" option in production — a user with the
app from six months ago must upgrade cleanly, and a failed migration means data
loss on a device you cannot reach.

`journal_mode = WAL` is worth setting: it allows reads during a write and avoids
most "database is locked" errors.

### Queries

```ts
const rows = await db.getAllAsync<Note>(
  'SELECT id, body FROM notes WHERE updated_at > ? ORDER BY updated_at DESC LIMIT 50',
  [since],
);
```

Always use parameter binding. String-concatenating a value into SQL is an
injection bug even locally — user-entered text with a quote in it corrupts the
query.

### Writes and transactions

```ts
await db.withTransactionAsync(async () => {
  for (const note of notes) {
    await db.runAsync('INSERT OR REPLACE INTO notes VALUES (?, ?, ?)', [
      note.id, note.body, note.updatedAt,
    ]);
  }
});
```

Batch inserts in one transaction. Individually they are orders of magnitude
slower, because each one is its own disk sync.

### Syncing

If the data also lives on a server, decide the conflict rule before writing the
sync code: last-write-wins on a timestamp is simple and usually enough, but it
silently discards one side. Whatever you choose, write it down in
`docs/architecture.md` — it is the thing nobody remembers a year later.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Database is locked" | Concurrent writes without WAL. Set `journal_mode = WAL` |
| Data gone after reinstall | Expected — app storage is removed with the app |
| Migration works on your device only | You had the current schema already. Test upgrading from an old build |
| Slow list rendering | Missing index, or querying on every render instead of once |
| "No such table" | Migration never ran, or ran after the first query |

### Common mistakes

- **Destructive migrations.** `DROP TABLE` in an upgrade path deletes real data.
- **Never testing an upgrade.** Install the old build, then the new one.
- **String-concatenated SQL.** Breaks on an apostrophe; injectable in general.
- **Per-row inserts.** Wrap bulk writes in a transaction.
- **Storing secrets.** The database file is not encrypted; use secure storage.

### Production checklist

- [ ] Migrations are ordered, idempotent and forward-only.
- [ ] Upgrade tested from the oldest supported build, with data present.
- [ ] Every query uses parameter binding.
- [ ] Indexes on the columns you filter and sort by.
- [ ] Bulk writes wrapped in transactions.
- [ ] No credentials or personal data stored unencrypted.
- [ ] Conflict resolution documented if the data also syncs.

### Documentation

- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [SQLite language reference](https://www.sqlite.org/lang.html)
- [Write-Ahead Logging](https://www.sqlite.org/wal.html)
