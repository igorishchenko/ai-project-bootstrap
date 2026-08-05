# Firestore

Data access in {{projectName}}.

## Reads cost money, per document

This is the thing to hold onto. A screen that reads 500 documents costs 500
reads every single time someone opens it. Not per query — per document.

So:

- **`limit()` on every query.** Always. An unbounded read over a collection that
  grows is a bill that grows with it.
- **Detach every listener.** `onSnapshot` returns an unsubscribe function;
  return it from the effect. A leaked listener bills for the life of the tab.

When you add a query over a large collection, say roughly how many documents it
reads. That number is the cost.

## No joins — denormalise deliberately

There is no way to join. A list of posts showing author names stores the author
name *on the post*. Fetching authors separately is N+1 reads and will be the
slowest, most expensive screen in the app.

The trade-off is that a write must update every copy. Keep duplicated fields few
and slow-changing, and make the write path explicit rather than hoping.

## Indexes belong in git

A composite query fails at runtime with a console link that creates the index in
one click. Convenient, and a trap: the index now exists in one environment only.
Commit it to `firestore.indexes.json` so it deploys everywhere.

## Timestamps

`serverTimestamp()`, not `Date.now()`. Client clocks are wrong often enough to
scramble ordering, and a user can set theirs to anything.

## Rules still enforce access

Filtering in the query is not access control — the client could ask for anything.
The rules decide. See the Firebase skill.

## Verifying

`firebase emulators:start --only firestore` is free and resettable. Test rules
as a user who does *not* own the document; testing as the owner proves nothing.
