### Overview

Clerk provides hosted authentication with prebuilt flows — sign-in, sign-up,
MFA, social providers, user profiles — so you implement none of it yourself.

The trade-off to be deliberate about: your users live in Clerk, not in your
database. Anything joining user data to application data needs Clerk's user id
stored on your own rows, and a webhook to keep deletions in sync. Decide that
before you have production users, not after.

### Dashboard configuration

1. Create an application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. **User & Authentication** — enable the sign-in methods you want. Each social
   provider needs credentials from that provider's console.
{{#if has.react-native}}3. **Native Applications** — add your bundle identifier and package name, and
   your deep link scheme. OAuth silently fails to return without this.
{{/if}}{{#unless has.react-native}}3. **Domains** — add the origins this app is served from, including your
   local development origin. OAuth silently fails to return without this.
{{/unless}}4. Copy the **publishable key**. The secret key is server-side only.
5. Create separate applications for development and production — they have
   separate user pools and separate keys.

### Install

{{#if has.react-native}}```bash
npx expo install @clerk/clerk-expo expo-secure-store
```
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}```bash
npm install @clerk/nextjs
```
{{/if}}{{#unless has.nextjs}}```bash
npm install @clerk/clerk-react
```
{{/unless}}{{/unless}}
{{#if has.react-native}}### Provider and token cache

Wrap the app once, and give Clerk secure storage for the session token:

```tsx
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

<ClerkProvider
  publishableKey={process.env.{{envPrefix}}CLERK_PUBLISHABLE_KEY!}
  tokenCache={tokenCache}
>
  <App />
</ClerkProvider>;
```

Without a token cache the user is signed out on every cold start. Use
`expo-secure-store`, not `AsyncStorage` — this is a credential, and it belongs
in the keychain rather than in plaintext app storage.
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}### Provider and middleware

Two pieces, and both are required. Wrap the root layout:

```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

Then add the middleware, without which `auth()` has nothing to read:

```ts
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?)).*)', '/(api|trpc)(.*)'],
};
```

No token cache here: the session lives in a cookie the browser and the server
both see, which is the whole reason a server-rendered app needs the middleware.

Clerk reads `{{envPrefix}}CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from the
environment by name, so `ClerkProvider` needs no props. The middleware matcher
above is the shape Clerk's own docs ship; confirm it against the version you
installed before relying on it, since it has changed across majors.
{{/if}}{{#unless has.nextjs}}### Provider

Wrap the app once, at the root:

```tsx
import { ClerkProvider } from '@clerk/clerk-react';

<ClerkProvider publishableKey={import.meta.env.{{envPrefix}}CLERK_PUBLISHABLE_KEY}>
  <App />
</ClerkProvider>;
```

No token cache is needed — the session lives in a cookie the browser manages.
{{/unless}}{{/unless}}
### Reading auth state

{{#unless has.react-native}}{{#if has.nextjs}}On the server, `auth()` is the only trustworthy source:

```tsx
import { auth } from '@clerk/nextjs/server';

const { userId } = await auth();
if (!userId) redirect('/sign-in');
```

In a client component, `useAuth()` gives you the same thing plus a loading flag:

{{/if}}{{/unless}}```tsx
const { isLoaded, isSignedIn, userId } = useAuth();

if (!isLoaded) return <Splash />;      // do not decide anything yet
if (!isSignedIn) return <SignIn />;
```

`isLoaded` matters: treating "not yet loaded" as "signed out" flashes the
sign-in screen on every launch for users who are already authenticated.

### Calling your own backend

```ts
const { getToken } = useAuth();
const token = await getToken();

await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
```

Your backend verifies that token with Clerk's public keys. Never trust a user id
sent in a request body — only the verified token.

### Linking users to your data

Store `userId` from Clerk on your own rows, and handle the `user.deleted`
webhook so removing a Clerk user removes their application data too. Skipping
that leaves orphaned personal data, which is both a bug and a compliance issue.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
{{#if has.react-native}}| Signed out on every restart | No `tokenCache` passed to `ClerkProvider` |
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}| `auth()` returns no user id | `clerkMiddleware()` missing, or its matcher excludes this route |
{{/if}}{{/unless}}| Sign-in screen flashes at launch | `isLoaded` ignored |
{{#if has.react-native}}| OAuth never returns | Bundle id, package name or scheme missing in the dashboard |
{{/if}}{{#unless has.react-native}}| OAuth never returns | This origin is not registered under the dashboard's domains |
{{/unless}}| Works in dev, fails in production | Development key still in the production build |
| Backend rejects the token | Verifying against the wrong instance's keys |

### Common mistakes

{{#if has.react-native}}- **`AsyncStorage` for the token cache.** Session tokens belong in the keychain.
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}- **Reading `useAuth()` in a Server Component.** It is a client hook; the server
  reads `auth()` instead.
{{/if}}{{/unless}}- **Ignoring `isLoaded`.** Produces a visible flash and can trigger a redirect.
- **Trusting a user id from the client.** Verify the token server-side.
- **One Clerk application for all environments.** Test users end up in production.
- **No deletion webhook.** Orphaned user data accumulates silently.

### Production checklist

- [ ] Production instance created, with its own publishable key.
- [ ] Secret key server-side only, never in the app.
{{#if has.react-native}}- [ ] Token cache backed by secure storage.
- [ ] Bundle identifier, package name and deep link scheme registered.
{{/if}}{{#unless has.react-native}}- [ ] Production origins registered under the dashboard's domains.
{{#if has.nextjs}}- [ ] `clerkMiddleware()` in place, with a matcher covering every protected route.
{{/if}}{{/unless}}- [ ] Backend verifies tokens rather than trusting request bodies.
- [ ] `user.deleted` webhook removes application data.
- [ ] MFA and password policy reviewed.

### Documentation

{{#if has.react-native}}- [Clerk Expo quickstart](https://clerk.com/docs/quickstarts/expo)
- [Token cache](https://clerk.com/docs/references/expo/overview)
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}- [Clerk Next.js quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [clerkMiddleware](https://clerk.com/docs/references/nextjs/clerk-middleware)
{{/if}}{{#unless has.nextjs}}- [Clerk React quickstart](https://clerk.com/docs/quickstarts/react)
{{/unless}}{{/unless}}- [Webhooks](https://clerk.com/docs/integrations/webhooks/overview)
