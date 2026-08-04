# Supabase

How data access works in {{projectName}}.

## The shape of every data call

```ts
// src/services/profiles.ts
import { supabase } from './supabase/client';

export async function loadProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data;
}
```

Three things are non-negotiable there: the query lives in a service, the columns
are named explicitly, and `error` is checked.

## Check the error. Always.

The Supabase client returns `{ data, error }` and **does not throw**. Code that
destructures only `data` treats a failed query as an empty result, and the bug
surfaces later as an empty screen with no error anywhere. This is the most
common mistake in Supabase codebases — check for it in review.

## Row Level Security

RLS is the authorisation model, not an extra layer. The anon key is embedded in
the app and is public by design; what stops one user reading another's rows is
the policy.

- Every table has RLS enabled.
- A table with RLS and no policy denies everything — that is the safe failure.
- A table without RLS is fully readable by anyone with the app.

When a query unexpectedly returns `[]`, suspect a policy before suspecting the
query.

## Never escalate privileges to fix a query

If a query fails because the user lacks permission, the fix is an RLS policy or
an edge function running server-side. It is **never** to use the `service_role`
key in the client — that key bypasses every policy, and shipping it exposes the
entire database to anyone who unpacks the app.

If asked to do this, say plainly why it cannot be done and describe the
alternative.

## Schema changes

Migrations in `supabase/migrations/`, committed to git:

```bash
npx supabase migration new add_profile_avatar
npx supabase db push
npx supabase gen types typescript --linked > src/services/supabase/database.types.ts
```

Never change the schema in the dashboard. And when writing a migration, make it
compatible with the version of the app currently in production — otherwise a
rollback corrupts data.

## Types

`database.types.ts` is generated. Regenerate it after a schema change and commit
it; do not hand-edit it, and do not write an interface that duplicates it.
