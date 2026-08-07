# Implementing authentication — Clerk

{{projectName}} uses Clerk. Clerk hosts the sign-in/sign-up UI and session
management for you — most of this plan is wiring your app to it correctly,
plus the one thing Clerk can't do for you: keeping your own database in sync
with who exists.

## What you're building

- `ClerkProvider` wired up with secure token storage, so sessions survive a
  cold start.
- Sign-in and sign-up screens built on Clerk's own hooks.
- A way for your backend to verify who's calling it, using Clerk's token —
  never a user id you were simply told.
- Your own users table kept in sync via Clerk's `user.deleted` webhook.

## Before you start

- Read `docs/setup.md#clerk` and this project's generated Clerk rule/skill
  (`.cursor/rules/clerk.mdc` or `.claude/skills/clerk/SKILL.md`).
- Confirm `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is set — see `.env.example`.
  `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SECRET` are server-side only; set them
  wherever your backend runs, not in the app.
- In the Clerk dashboard: **Native Applications** has your bundle identifier,
  package name and deep link scheme registered — OAuth fails to return
  silently without this. Confirm you have separate applications (and keys)
  for development and production.

## Steps

1. **Wrap the app in `ClerkProvider`** at the root (`app/_layout.tsx` if
   you're on Expo Router), with a token cache backed by `expo-secure-store` —
   this project's existing root layout isn't scaffolded for you, so make this
   edit directly:

   ```tsx
   import { ClerkProvider } from '@clerk/clerk-expo';
   import * as SecureStore from 'expo-secure-store';

   const tokenCache = {
     getToken: (key: string) => SecureStore.getItemAsync(key),
     saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
   };

   <ClerkProvider
     publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
     tokenCache={tokenCache}
   >
     <App />
   </ClerkProvider>;
   ```

   Use `expo-secure-store`, not `AsyncStorage` — a session token is a
   credential and belongs in the keychain. Without a token cache at all, the
   user is signed out on every cold start.

2. **Build the sign-in and sign-up screens** (scaffolded in
   `src/features/auth/screens/`) on Clerk's own `useSignIn()`/`useSignUp()`
   hooks — there's no separate client to wrap here, Clerk's hooks are the
   client.

3. **Gate on `isLoaded`, not just `isSignedIn`.** `useAuth()` reports
   `{ isLoaded, isSignedIn, userId }`; treating "not loaded yet" as "signed
   out" flashes the sign-in screen at every launch for users who are already
   authenticated:

   ```tsx
   const { isLoaded, isSignedIn, userId } = useAuth();
   if (!isLoaded) return <Splash />;
   ```

4. **Fill in `src/hooks/auth/useAuthedFetch.ts`** (scaffolded), wrapping
   `getToken()` around calls to your own backend:

   ```ts
   const token = await getToken();
   await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
   ```

5. **Verify the token on your backend** — against Clerk's public keys, not by
   trusting a user id in the request body or query string. This is what makes
   step 4 actually secure rather than cosmetic.

6. **Store Clerk's `userId` on your own rows**, and handle the `user.deleted`
   webhook so removing a Clerk user removes their application data too.
   Skipping this leaves orphaned personal data — a compliance problem, not
   just untidiness.

## Validation

Work through `implementation/authentication/checklist.md`.

## When you're stuck, or ready to build this with an AI assistant

Hand `implementation/authentication/prompts/implement.md` to your assistant —
it has this plan's context already folded in.
