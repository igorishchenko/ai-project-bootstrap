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
   {{#if has.react-native}}the app's deep link scheme{{/if}}{{#unless has.react-native}}every domain you deploy to, preview URLs included{{/unless}}. Sign-in appears to hang forever when this is
   missing, with no error anywhere.
3. **Authentication → Email Templates** — rewrite the defaults before launch and
   send from a verified domain, or the mail lands in spam.

### Install

{{#if has.react-native}}```bash
npx expo install expo-auth-session expo-web-browser
```
{{/if}}{{#unless has.react-native}}```bash
npm install @supabase/ssr
```
{{/unless}}
The Supabase client itself comes from the Supabase module.

### Session persistence

{{#if has.react-native}}React Native has no `localStorage`, so the client needs a storage adapter or the
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
{{/if}}{{#unless has.react-native}}The session lives in a cookie, not in `localStorage`, because the server has to
read it too — a server component rendering signed-in content cannot see browser
storage. That is what `@supabase/ssr` is for, and it means three clients rather
than one:

- **Browser** (`createBrowserClient`) — for client components.
- **Server** (`createServerClient`) — for server components, route handlers and
  server actions. Built per request, reading and writing that request's cookies.
- **Middleware** — the same server client, whose only job is to refresh an
  expiring token and pass the new cookie to both the response and the request.

Without the middleware refresh, a session expires mid-visit and server
components start rendering signed-out. Add a root `middleware.ts` before
shipping; the
[Next.js server-side guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
carries the current version of that file.

Never trust `getSession()` on the server — it reads the cookie without
verifying it. Use `getUser()`, which revalidates against Supabase.
{{/unless}}
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

{{#if has.react-native}}For OAuth, open the provider URL with `expo-web-browser` and hand the returned
code back to the client. The redirect URL must match the dashboard exactly,
including the scheme.
{{/if}}{{#unless has.react-native}}For OAuth, `signInWithOAuth` redirects the browser to the provider, which
returns to a route handler that exchanges the code for a session cookie. The
redirect URL must match the dashboard exactly, including the protocol.
{{/unless}}
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
{{#if has.react-native}}| Signed out on every app restart | No storage adapter configured |
| OAuth never returns | Redirect URL missing from the dashboard, or scheme mismatch |
{{/if}}{{#unless has.react-native}}| Signed out after a while, only on the server | No middleware refreshing the cookie |
| Client sees a session, server does not | Using `createClient` instead of `@supabase/ssr` |
| OAuth never returns | Redirect URL missing from the dashboard, or protocol mismatch |
{{/unless}}
| Queries return `[]` while signed in | RLS policy does not match `auth.uid()` |
| "JWT expired" | `autoRefreshToken` off, or the session is not being observed |
| Confirmation emails never arrive | Default SMTP is rate-limited; configure your own |

### Common mistakes

{{#if has.react-native}}- **No storage adapter.** Sessions vanish on restart and it looks like a bug in
  sign-in.
{{/if}}{{#unless has.react-native}}- **One shared client module.** A server client built once and reused leaks one
  request's session into another's.
- **`getSession()` on the server.** It does not verify the cookie. Use `getUser()`.
{{/unless}}
- **Trusting a client-held user id for authorisation.** Only `auth.uid()` in a
  policy cannot be forged.
- **Reading the session per screen** instead of subscribing once.
- **Launching on the default SMTP.** It is rate-limited and unbranded.

### Production checklist

- [ ] Redirect URLs configured for production, including {{#if has.react-native}}deep links{{/if}}{{#unless has.react-native}}preview deployments{{/unless}}.
- [ ] Custom SMTP configured and the sending domain verified.
- [ ] Email templates rewritten.
{{#if has.react-native}}- [ ] Session persistence verified across a cold start.
{{/if}}{{#unless has.react-native}}- [ ] `middleware.ts` refreshing the session, verified after the token expires.
- [ ] Server-side reads use `getUser()`, never `getSession()`.
{{/unless}}
- [ ] Token refresh verified after the access token expires.
- [ ] Every table reachable by a signed-in user has an RLS policy.

### Documentation

- [Supabase Auth](https://supabase.com/docs/guides/auth)
{{#if has.react-native}}- [React Native quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
{{/if}}{{#unless has.react-native}}- [Server-side auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
{{/unless}}
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
