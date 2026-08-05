### Overview

Firebase bundles authentication, Firestore, storage, cloud functions and
messaging behind one SDK, with a generous free tier and no server to run.

Two things shape how you use it, and both bite late rather than early:

**Security rules are the only thing protecting your data.** The client talks
directly to the database, and the config in your app is public by design. A
database left in test mode is readable and writable by anyone on the internet —
and Google will email you about it, usually after it has been scraped.

**Billing is usage-based with no hard cap.** A runaway query loop or an
unindexed collection scan can produce a genuinely alarming bill. Set a budget
alert on day one.

### Create the project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Project settings → Your apps** — register a Web, iOS and/or Android app and
   copy the config object.
3. **Build → Authentication** — enable the sign-in providers you want.
4. **Build → Firestore Database** — create it in **production mode**, never test
   mode. Test mode expires into "open to everyone".
5. **Billing → Budgets & alerts** — set an alert before you ship.

Create separate Firebase projects for development and production. There is no
environment concept inside a project, so sharing one means test writes land in
real data.

### Install

```bash
npm install firebase
```

### Initialise once

```ts
import { initializeApp } from 'firebase/app';

export const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
```

The `apiKey` here is **not a secret** — it identifies the project, it does not
grant access. Restricting it does not secure your data; rules do.

### Security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deny by default and grant narrowly. Rules are code: keep them in
`firestore.rules`, in git, and deploy them with the app. Editing them in the
console leaves environments silently divergent.

Test them with the emulator rather than by trying things in production.

### Local development

```bash
npm install -g firebase-tools
firebase login
firebase init
firebase emulators:start
```

The emulator suite runs auth, Firestore, functions and storage locally — free,
fast, and safe to reset.

### Privileged work

Anything the client must not be able to do goes in a Cloud Function using the
Admin SDK, which bypasses rules. The Admin SDK service account key never goes
anywhere near the app.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Missing or insufficient permissions" | Rules deny it. Check `request.auth` and the path |
| Works locally, fails deployed | Rules not deployed, or a different project |
| "The query requires an index" | Composite index missing. Follow the console link |
| Unexpected bill | Unindexed scans or a listener loop. Check usage, set a budget |
| Auth persists in dev but not production | Different Firebase project, different session |

### Common mistakes

- **Leaving Firestore in test mode.** Open to the world when it expires.
- **Thinking the API key is a secret.** It is not; rules are the security.
- **Editing rules in the console.** They drift from git.
- **One project for all environments.** Test data in production.
- **No budget alert.** Usage billing has no ceiling by default.

### Production checklist

- [ ] Rules deny by default, live in git, and are deployed with the app.
- [ ] Rules tested against the emulator, as a non-owner user.
- [ ] Separate projects for development and production.
- [ ] Admin SDK credentials server-side only.
- [ ] Composite indexes created for every real query.
- [ ] Budget alert configured.
- [ ] App Check enabled if abuse is a concern.

### Documentation

- [Firebase docs](https://firebase.google.com/docs)
- [Security rules](https://firebase.google.com/docs/rules)
- [Emulator suite](https://firebase.google.com/docs/emulator-suite)
- [Understand billing](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
