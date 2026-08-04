# PostgreSQL environment

`DATABASE_URL` is full read and write access to the database. It belongs on a
server or in CI secrets — never in the client app, and never in a variable with
a client-visible prefix, because anything bundled into an app can be extracted
from it.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Connection string. Server-side only. | `postgresql://user:pass@host:5432/{{projectSlug}}` |
| `PGSSLMODE` | No | SSL mode. Use `require` or stricter in production; never disable verification to make a connection work. | `require` |
| `PGPOOL_MAX` | No | Maximum pool size per instance. Keep low on serverless — every instance opens its own pool. | `10` |
