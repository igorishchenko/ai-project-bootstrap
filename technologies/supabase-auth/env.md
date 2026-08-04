# Supabase Auth environment

Sign-in uses the same project URL and anon key as the rest of Supabase, so no
additional client keys are needed.

The redirect URL must also be registered in the dashboard under
Authentication → URL Configuration. A mismatch makes OAuth hang with no error.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_AUTH_REDIRECT_URL` | No | Deep link the OAuth flow returns to. Must match the dashboard exactly. | `{{projectSlug}}://auth/callback` |
