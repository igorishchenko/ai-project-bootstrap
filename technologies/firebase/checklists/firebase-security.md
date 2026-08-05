# Firebase security checklist

The client reaches the database directly, so rules are not one layer of defence
— they are the only one.

## Rules

- [ ] Firestore created in **production mode**, never test mode.
- [ ] Rules deny by default and grant narrowly by path and `request.auth.uid`.
- [ ] `firestore.rules` and `storage.rules` committed to git.
- [ ] Rules deployed with the application, not edited in the console.
- [ ] Rules tested against the emulator **as a different user**, not the owner.
- [ ] No collection readable by an unauthenticated caller unless it is genuinely
      public.

## Projects

- [ ] Separate Firebase projects for development and production.
- [ ] Production config only in production builds.
- [ ] Admin SDK service account absent from the app and from git.

## Cost

- [ ] Budget alert configured — usage billing has no default ceiling.
- [ ] Every query bounded with `limit()`; unbounded collection reads removed.
- [ ] Listeners detached on unmount.
- [ ] Composite indexes committed in `firestore.indexes.json`.

## Data

- [ ] Personal data only in documents whose rules restrict it to its owner.
- [ ] Deleting a user deletes their documents and storage objects.
- [ ] Backups or scheduled exports configured.

## Abuse

- [ ] App Check enabled if the app is a plausible target.
- [ ] Auth providers reviewed; unused ones disabled.
