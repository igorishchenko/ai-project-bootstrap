# Firebase

Backend for {{projectName}}.

## The config is public; rules are the security

The `apiKey` in the Firebase config is not a credential. It identifies the
project. Anyone can read it out of your bundle, and that is by design.

What stops a stranger reading your users' data is the **security rules**. So:

- Deny by default, grant narrowly on path and `request.auth.uid`.
- Rules live in `firestore.rules`, in git, deployed with the app.
- Never edit rules in the console — environments drift and nobody notices until
  production behaves differently from staging.

If a task involves "hiding" data by filtering it in the client, that is
presentation only. The rule is what enforces it, and without one the data is
readable by anyone who opens a network tab.

## Test mode is a countdown to a public database

Firestore's test mode allows all reads and writes, and it expires into exactly
that. Create databases in production mode and write the rules first.

## Money is a correctness concern here

Billing is usage-based with no default ceiling. Two mistakes cost real money:

- **Unbounded reads.** Always `limit()`; paginate anything that grows.
- **Leaked listeners.** A subscription not detached on unmount keeps billing.

Set a budget alert. When a task adds a query over a large collection, say what
its read volume looks like.

## Indexes

A query the console does not have an index for fails at runtime, not at build
time. The error links to a one-click fix — but the index belongs in
`firestore.indexes.json` in git, not clicked in a console.

## Privileged operations

Anything the client must not be able to do goes in a Cloud Function with the
Admin SDK, which bypasses rules entirely. That service account key never goes
near the app; putting it there hands over the whole project.

## Verifying

`firebase emulators:start` runs auth, Firestore and functions locally. Test
rules there as a *different* user than the document owner — testing as the owner
proves nothing.
