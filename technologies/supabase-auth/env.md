# Supabase Auth environment

Sign-in uses the same project URL and anon key as the rest of Supabase, so no
additional client keys are needed.

The redirect URL must also be registered in the dashboard under
Authentication → URL Configuration. A mismatch makes OAuth hang with no error.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `{{envPrefix}}AUTH_REDIRECT_URL` | No | {{#if has.react-native}}Deep link the OAuth flow returns to.{{/if}}{{#unless has.react-native}}URL the OAuth flow returns to. Point it at the route that exchanges the code for a session.{{/unless}} Must match the dashboard exactly. | {{#if has.react-native}}`{{projectSlug}}://auth/callback`{{/if}}{{#unless has.react-native}}`https://<your-domain>/auth/callback`{{/unless}} |
