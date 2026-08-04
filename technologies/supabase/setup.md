### Overview

Supabase is a hosted Postgres with authentication, object storage, realtime
subscriptions and edge functions built around it. The client library talks to
Postgres over HTTP, so the database schema *is* the API.

That last point drives everything else: because the client can query tables
directly, **Row Level Security is the entire authorisation model**. A table
without RLS enabled is readable by anyone holding the anon key — which ships
inside your app.

### Create the project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Choose the region closest to your users; it cannot be changed later.
3. Store the database password in your password manager immediately — the
   dashboard shows it once.
4. From **Project Settings → API**, copy the project URL and the `anon` key.

Create a second project for production, with separate keys. One project serving
both environments means a bad migration in development takes down production.

### Install

```bash
npm install @supabase/supabase-js
npm install -D supabase
```

### The client

One client for the whole app, in `src/services/supabase/client.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
);
```

Components never import `@supabase/supabase-js` directly — they call a service
that wraps it. That is what makes queries mockable and keeps SQL out of the UI.

### Keys, and which is which

| Key | Where it may live | Notes |
| --- | --- | --- |
| `anon` | The app | Public by design. RLS is what protects the data behind it |
| `service_role` | A server, or CI | **Bypasses every RLS policy.** Never in client code, never in an `EXPO_PUBLIC_*` variable |

If a task asks you to put the service-role key in the app to "make a query
work", the real fix is an RLS policy or an edge function.

### Row Level Security

Enable RLS on every table, then write policies:

```sql
alter table profiles enable row level security;

create policy "Users read their own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users update their own profile"
  on profiles for update
  using (auth.uid() = user_id);
```

A table with RLS enabled and no policy denies everything — that is the safe
failure. A table without RLS at all allows everything.

### Migrations

```bash
npx supabase init
npx supabase link --project-ref <project-ref>
npx supabase migration new add_profiles
npx supabase db push
```

Schema changes go through migration files in git. Editing the schema in the
dashboard leaves environments silently divergent, and the difference only
surfaces during a release.

### Local development

```bash
npx supabase start     # local stack in Docker
npx supabase db reset  # rebuild from migrations + seed
npx supabase stop
```

`db reset` replays every migration from scratch, which is the fastest way to
catch a migration that only works against your current data.

### Types

```bash
npx supabase gen types typescript --linked > src/services/supabase/database.types.ts
```

Regenerate after every schema change and commit the result — it is what makes
a wrong column name a compile error instead of a runtime one.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Query returns `[]` for data that exists | RLS is filtering it. Check the policy against `auth.uid()` |
| "new row violates row-level security policy" | No `insert` policy, or the row does not satisfy it |
| "JWT expired" | Session not refreshed. Ensure auth state is initialised at startup |
| Works locally, fails in production | Migrations not pushed, or different keys |
| Realtime never fires | Replication not enabled for that table in the dashboard |

### Common mistakes

- **Shipping the service-role key.** It bypasses all security.
- **Forgetting to enable RLS.** The anon key is public; the table is then open.
- **Changing the schema in the dashboard.** Environments drift apart.
- **`select('*')` everywhere.** Fetches columns you do not need and breaks the
  moment someone adds a large column.
- **Ignoring the `error` in a response.** Supabase returns `{ data, error }` and
  does not throw. An unchecked `error` reads as an empty result.

### Production checklist

- [ ] RLS enabled on every table, with policies tested as a non-owner user.
- [ ] Service-role key absent from the client and from any `EXPO_PUBLIC_*`.
- [ ] Separate projects for development and production.
- [ ] Migrations applied from git, not from the dashboard.
- [ ] Automatic backups enabled and a restore rehearsed at least once.
- [ ] Indexes on every column used in a filter or join.
- [ ] Auth redirect URLs configured for production, including deep links.

### Documentation

- [Supabase docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [JavaScript client](https://supabase.com/docs/reference/javascript/introduction)
- [CLI and migrations](https://supabase.com/docs/guides/cli)
