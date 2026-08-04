# Supabase environment

The `anon` key is public by design — it ships inside the app, and Row Level
Security is what protects the data behind it.

The `service_role` key is the opposite: it **bypasses every RLS policy**. It
belongs on a server or in CI secrets, never in the app, never in a variable with
a client-visible prefix, and never in this repository.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Project URL from Project Settings → API. | `https://abcdefgh.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key. Safe in the client only because RLS is enabled. | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-side only. Bypasses all RLS. Never expose to the client. | `eyJhbGciOi...` |
| `SUPABASE_PROJECT_REF` | No | Project reference used by the CLI for migrations. | `abcdefgh` |
