# Authentication checklist — Clerk

## Dashboard

- [ ] Sign-in methods enabled under User & Authentication.
- [ ] Bundle identifier, package name and deep link scheme registered under
      Native Applications.
- [ ] Separate Clerk applications (and keys) for development and production.

## App wiring

- [ ] `ClerkProvider` wraps the app with a `tokenCache` backed by
      `expo-secure-store` — not `AsyncStorage`.
- [ ] Every screen that reads auth state checks `isLoaded` before deciding
      anything, including whether to show the sign-in screen.
- [ ] Session survives a real cold start, not just a hot reload.

## Backend

- [ ] Your backend verifies Clerk tokens against Clerk's public keys — it
      never trusts a user id sent in a request body or query string.
- [ ] `CLERK_SECRET_KEY` present only where the backend runs, never in the
      app bundle.
- [ ] `user.deleted` webhook wired up and removes the user's application
      data, not just their Clerk account.

## Code

- [ ] Clerk's `userId` stored on your own rows wherever you join user data.
- [ ] No screen renders user-specific UI before `isLoaded` is true.

## Never

- [ ] No session token or JWT ever logged.
- [ ] No access decision made purely from client state — the backend
      re-verifies.
