# Authentication checklist — Supabase Auth

## Dashboard

- [ ] Sign-in methods enabled under Authentication → Providers.
- [ ] Redirect URLs (including the app's deep link scheme) registered under
      Authentication → URL Configuration.
- [ ] Email templates rewritten and sent from a verified domain — the default
      sender is rate-limited and unbranded.
- [ ] A separate Supabase project used for production, with its own keys.

## Session handling

- [ ] `onAuthStateChange` subscribed exactly once, at app startup.
- [ ] Storage adapter (`AsyncStorage`) configured with `persistSession: true`.
- [ ] `detectSessionInUrl: false` set (no URL to inspect outside a browser).
- [ ] Session survives a real cold start, not just a hot reload.
- [ ] Token refresh verified after the access token actually expires, not
      just assumed.

## Row Level Security

- [ ] RLS **enabled** on every table reachable by a signed-in user — enabling
      RLS and writing zero policies makes a table unreadable by everyone,
      which looks like a bug elsewhere and is easy to misdiagnose.
- [ ] Every policy reads `auth.uid()`, never a client-supplied id.
- [ ] Policies tested as a signed-in _other_ user, not just as yourself.
- [ ] Service-role key never used from the app, or to route around a failing
      policy during development.

## Code

- [ ] All `supabase.auth` calls go through one client module — no screen
      calls the SDK directly.
- [ ] Sign-in, sign-up and sign-out all handle the network-failure case
      visibly, not just the happy path.
- [ ] Cached user-scoped state cleared on sign-out.

## Never

- [ ] No session or token held in plain component state that outlives
      sign-out.
- [ ] No JWT, refresh token or password ever logged.
