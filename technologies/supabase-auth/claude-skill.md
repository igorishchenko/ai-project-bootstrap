# Supabase Auth

How sign-in works in {{projectName}}.

## The one thing to internalise

Signing a user in **grants them nothing**. The JWT travels with every query and
Postgres evaluates the RLS policy itself. If a table has no policy, an
authenticated user still sees nothing; if a table has no RLS at all, everyone
sees everything.

So when a task says "only the owner should see this", the answer is a policy —
not a filter in the query, and not a check in the component. A client-side
filter is a display preference that anyone can bypass.

## Session state

Subscribe once, at startup:

```ts
supabase.auth.onAuthStateChange((_event, session) => setSession(session));
```

Do not call `getSession()` inside individual screens. The token refreshes in the
background, and a screen holding a stale session starts failing queries in a way
that looks like a server problem.

## Persistence

{{#if has.react-native}}React Native has no `localStorage`. Without a storage adapter the user is signed
out on every cold start — which reliably gets reported as "sign-in is broken":

```ts
auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true }
```
{{/if}}{{#unless has.react-native}}The session is a cookie, not `localStorage`, because server components have to
read it too. Build every client through `@supabase/ssr` — `createBrowserClient`
in client components, `createServerClient` **per request** everywhere else. A
server client built once at module scope leaks one visitor's session into
another's render.

`middleware.ts` refreshes the expiring cookie. Without it the session dies
mid-visit and the server quietly starts rendering signed-out, which reliably
gets reported as "it signs me out at random".

On the server use `getUser()`, never `getSession()`: only `getUser()` verifies
the cookie against Supabase rather than trusting what the browser sent.
{{/unless}}
## Sign-out

Clear cached user-scoped state — queries, profile, entitlements — alongside
`signOut()`. On a shared device, anything you leave behind belongs to the next
person who signs in.

## Never

- Never authorise from a client-held user id; use `auth.uid()` in a policy.
- Never log a JWT, refresh token or password.
- Never reach for the service-role key because a policy is blocking you. That
  key bypasses every policy and must not exist in the app at all.
