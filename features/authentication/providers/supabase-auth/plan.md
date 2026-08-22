# Implementing authentication — Supabase Auth

{{projectName}} uses Supabase Auth. This plan takes you from nothing to a
working sign-in flow with a session that survives a cold start — and, just as
importantly, to the Row Level Security policies that actually gate access,
since signing a user in changes nothing on its own.

## What you're building

- A single Supabase client, shared by the auth flow and every other query.
- Email/password sign-in and sign-up screens, wired to that client.
- A session that persists across app restarts and updates the rest of the app
  the moment it changes — not read fresh on every screen.
- RLS policies on every table a signed-in user can reach, without which the
  auth flow above is theatre.

## Before you start

- Read `docs/setup.md#supabase-auth` and the rule/skill this project generated
  for Supabase Auth (`.cursor/rules/supabase-auth.mdc` or
  `.claude/skills/supabase-auth/SKILL.md`) — this plan assumes those
  conventions and doesn't repeat them.
- Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are
  set (from the Supabase module) and, if you're using OAuth,
  `EXPO_PUBLIC_AUTH_REDIRECT_URL` — see `.env.example`.
- In the Supabase dashboard: **Authentication → Providers** has the sign-in
  methods you want enabled, and **Authentication → URL Configuration** has
  your redirect URLs registered. Both are silent failures if missed — sign-in
  just hangs, with nothing in the logs.

## Steps

{{#if has.react-native}}1. **Install the session-persistence dependency**, if `npm run setup` hasn't
   already: `npx expo install @react-native-async-storage/async-storage`. React
   Native has no `localStorage`; without a storage adapter the user is signed
   out on every cold start.

2. **Check the scaffolded Supabase client.** `src/services/supabase/client.ts`
   is written for you (see below) with the `auth` options session persistence
   needs:

   ```ts
   import AsyncStorage from '@react-native-async-storage/async-storage';

   createClient(url, anonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false, // no URL to inspect outside a browser
     },
   });
   ```

   If your project already had a client at that path, this scaffold replaced
   it — reconcile the two before going further.

{{/if}}{{#unless has.react-native}}1. **Install the SSR helper**, if `npm run setup` hasn't already:
   `npm install @supabase/ssr`. The browser keeps the session in a cookie the
   server has to be able to read, which is the whole reason a server-rendered
   app needs more than the one browser client.

2. **Check the scaffolded Supabase client.** `src/services/supabase/client.ts`
   is written for you (see below). It is the **browser** client, and it is the
   only one safe to import from a component.

   Anything rendering on the server — a Server Component, a route handler,
   middleware — needs a *per-request* client built from that request's cookies,
   not this shared module-level one. A single client reused across requests
   leaks one visitor's session into another visitor's render. Build that second
   client with `createServerClient` from `@supabase/ssr`, and check the current
   Supabase docs for the cookie adapter your installed version expects.

{{/unless}}3. **Fill in `src/features/auth/authClient.ts`** (scaffolded — see below) with
   `signInWithPassword`, `signUp` and `signOut`, plus a `subscribe` helper
   around `supabase.auth.onAuthStateChange`. This is the one place that talks
   to `supabase.auth` — screens and the hook never call it directly.

4. **Fill in `src/hooks/auth/useAuth.ts`.** Subscribe to `onAuthStateChange`
   **once**, at the top of the app (not per screen), and expose
   `{ session, user, loading, signIn, signUp, signOut }` from there. A screen
   that calls `getSession()` itself ends up holding a stale copy after a
   background token refresh.

5. **Build the sign-in and sign-up screens** (scaffolded in
   `src/features/auth/screens/`) against the hook from step 4. Cover the
   states a real screen needs: submitting, invalid credentials, and network
   failure — not just the happy path.

6. **If you're using OAuth**, open the provider URL with `expo-web-browser`
   and hand the returned code back to `supabase.auth`. The redirect URL must
   match the dashboard **exactly**, scheme included — this is the single most
   common reason OAuth "does nothing."

7. **Write the RLS policies.** For every table a signed-in user can read or
   write:

   ```sql
   create policy "Users read their own rows"
     on profiles for select
     using (auth.uid() = user_id);
   ```

   Only `auth.uid()` evaluated inside a policy cannot be forged. Never gate
   access on a client-held user id instead.

8. **Handle sign-out cleanup.** Clear any cached user-scoped state (queries,
   profile, entitlements) on sign-out — on a shared device the next person to
   sign in otherwise inherits whatever you left behind.

## Validation

Work through `implementation/authentication/checklist.md` before you consider
this done — RLS gaps in particular don't show up until someone goes looking
for them.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/authentication/prompts/implement.md` to your assistant —
it has this plan's context already folded in.
