### Overview

Supabase Auth issues the JWT that every database query carries. That is the
whole reason to prefer it when you are already on Supabase: `auth.uid()` inside
a Row Level Security policy *is* the signed-in user, with nothing to synchronise
between your identity provider and your database.

### Dashboard configuration

1. **Authentication → Providers** — enable the methods you want. Email is on by
   default; each OAuth provider needs its client id and secret from that
   provider's console.
2. **Authentication → URL Configuration** — add your redirect URLs, including
   the app's deep link scheme. Sign-in appears to hang forever when this is
   missing, with no error anywhere.
3. **Authentication → Email Templates** — rewrite the defaults before launch and
   send from a verified domain, or the mail lands in spam.

### Install

```bash
npx expo install expo-auth-session expo-web-browser
```

The Supabase client itself comes from the Supabase module.

### Session persistence

React Native has no `localStorage`, so the client needs a storage adapter or the
user is signed out on every cold start:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,   // no URL to inspect outside a browser
  },
});
```

### Reacting to auth state

Subscribe once, at startup, and let the rest of the app read from that state:

```ts
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
});
```

Do not check `getSession()` ad hoc in each screen — the token refreshes in the
background, and screens holding a stale copy silently start failing queries.

### Sign in and out

```ts
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();
```

For OAuth, open the provider URL with `expo-web-browser` and hand the returned
code back to the client. The redirect URL must match the dashboard exactly,
including the scheme.

### The relationship with RLS

A signed-in user changes nothing on its own. The policies are what grant access:

```sql
create policy "Users read their own rows"
  on profiles for select
  using (auth.uid() = user_id);
```

Authentication proves who someone is. Authorisation is the policy. Shipping the
first without the second leaves every row readable.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Signed out on every app restart | No storage adapter configured |
| OAuth never returns | Redirect URL missing from the dashboard, or scheme mismatch |
| Queries return `[]` while signed in | RLS policy does not match `auth.uid()` |
| "JWT expired" | `autoRefreshToken` off, or the session is not being observed |
| Confirmation emails never arrive | Default SMTP is rate-limited; configure your own |

### Common mistakes

- **No storage adapter.** Sessions vanish on restart and it looks like a bug in
  sign-in.
- **Trusting a client-held user id for authorisation.** Only `auth.uid()` in a
  policy cannot be forged.
- **Reading the session per screen** instead of subscribing once.
- **Launching on the default SMTP.** It is rate-limited and unbranded.

### Production checklist

- [ ] Redirect URLs configured for production, including deep links.
- [ ] Custom SMTP configured and the sending domain verified.
- [ ] Email templates rewritten.
- [ ] Session persistence verified across a cold start.
- [ ] Token refresh verified after the access token expires.
- [ ] Every table reachable by a signed-in user has an RLS policy.

### Documentation

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [React Native quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
