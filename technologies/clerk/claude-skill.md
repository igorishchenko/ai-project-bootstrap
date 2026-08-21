# Clerk

Authentication in {{projectName}}.

## Three states, not two

```tsx
const { isLoaded, isSignedIn, userId } = useAuth();

if (!isLoaded) return <Splash />;
if (!isSignedIn) return <SignIn />;
```

`isLoaded` is the one people miss. Collapsing it into "signed out" makes the
sign-in screen flash on every launch for authenticated users, and can bounce
them out of a deep link before the session resolves.

## The token cache is a credential store

`tokenCache` must use `expo-secure-store`, which is the keychain.
`AsyncStorage` is unencrypted — a session token there is readable on a
compromised device. And omitting the cache entirely signs users out on every
cold start, which invariably gets reported as "sign-in is broken".

## Client state is not authorisation

The client tells you who someone claims to be. The backend decides what they may
do, by verifying `await getToken()` against Clerk's public keys.

Never trust a user id sent in a request body or query string — that is
attacker-controlled. If a task asks you to pass `userId` to an endpoint so it
can "know who is calling", say why the token is the right mechanism.

The **secret key is server-side only**. It must never appear in the app or in an
`{{envPrefix}}*` variable.

## Joining users to your data

Clerk owns the user record; your database owns everything else. Store Clerk's
`userId` on your rows, and handle the `user.deleted` webhook so deleting a user
deletes their data. Without it, personal data outlives the account — a
compliance problem that surfaces at the worst moment.

## Environments

Separate Clerk applications per environment. One shared application means test
accounts in the production user pool, with no clean way to separate them later.
