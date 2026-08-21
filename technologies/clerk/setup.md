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
3. **Native Applications** — add your bundle identifier and package name, and
   your deep link scheme. OAuth silently fails to return without this.
4. Copy the **publishable key**. The secret key is server-side only.
5. Create separate applications for development and production — they have
   separate user pools and separate keys.

### Install

```bash
npx expo install @clerk/clerk-expo expo-secure-store
```

### Provider and token cache

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

### Reading auth state

```tsx
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
| Signed out on every restart | No `tokenCache` passed to `ClerkProvider` |
| Sign-in screen flashes at launch | `isLoaded` ignored |
| OAuth never returns | Bundle id, package name or scheme missing in the dashboard |
| Works in dev, fails in production | Development key still in the production build |
| Backend rejects the token | Verifying against the wrong instance's keys |

### Common mistakes

- **`AsyncStorage` for the token cache.** Session tokens belong in the keychain.
- **Ignoring `isLoaded`.** Produces a visible flash and can trigger a redirect.
- **Trusting a user id from the client.** Verify the token server-side.
- **One Clerk application for all environments.** Test users end up in production.
- **No deletion webhook.** Orphaned user data accumulates silently.

### Production checklist

- [ ] Production instance created, with its own publishable key.
- [ ] Secret key server-side only, never in the app.
- [ ] Token cache backed by secure storage.
- [ ] Bundle identifier, package name and deep link scheme registered.
- [ ] Backend verifies tokens rather than trusting request bodies.
- [ ] `user.deleted` webhook removes application data.
- [ ] MFA and password policy reviewed.

### Documentation

- [Clerk Expo quickstart](https://clerk.com/docs/quickstarts/expo)
- [Token cache](https://clerk.com/docs/references/expo/overview)
- [Webhooks](https://clerk.com/docs/integrations/webhooks/overview)
