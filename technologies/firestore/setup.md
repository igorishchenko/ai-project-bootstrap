### Overview

Firestore is a document database the client queries directly. Documents live in
collections, collections can nest, and every read and write is checked against
the security rules described in the Firebase section.

Coming from SQL, three things are genuinely different and cause most of the
trouble:

- **There are no joins.** You denormalise, duplicating data where it is read.
- **You are billed per document read**, not per query. A screen that reads 500
  documents costs 500 reads every time it opens.
- **Queries must be satisfiable by an index**, and composite queries need one
  created explicitly.

### Modelling

Design around the screens, not the entities. A list showing a post's title and
its author's name should store the author name **on the post** — a join per row
is not available, and fetching each author separately is N+1 reads.

Duplication is the normal trade-off here, and it means writes must update every
copy. Keep the duplicated fields few and rarely-changing.

Prefer shallow, wide documents over deep nesting: you cannot fetch part of a
document, so a large nested array is read in full every time.

### Queries

```ts
const q = query(
  collection(db, 'posts'),
  where('authorId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(20),
);
```

`limit()` is not optional in production. Without it a growing collection turns
into an unbounded read, and the bill grows with it.

A composite query fails at runtime with a link to create the index. Follow it,
then commit the index to `firestore.indexes.json` — an index that exists only
because someone clicked a console link is missing in the next environment.

### Realtime listeners

```ts
const unsubscribe = onSnapshot(q, (snap) => setPosts(snap.docs.map(toPost)));
return unsubscribe;   // always
```

A listener that is never detached keeps receiving updates — and billing — for
the life of the tab. Returning `unsubscribe` from the effect is the whole fix.

### Writes

- `setDoc` replaces, `updateDoc` merges. Choose deliberately.
- Batched writes for related changes; transactions when you must read then write
  atomically.
- Server timestamps (`serverTimestamp()`) rather than client clocks, which are
  wrong more often than you would think.

### Local development

```bash
firebase emulators:start --only firestore
```

Free, instant, and resettable. Test rules there rather than against real data.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "The query requires an index" | Composite index missing. Create it and commit it |
| "Missing or insufficient permissions" | Rules deny it. Check the path and `request.auth` |
| Costs far above expectation | Unbounded reads or undetached listeners |
| Data appears then vanishes | Optimistic local write rejected by rules on the server |
| Stale data | Reading from cache. Check the snapshot's metadata |

### Common mistakes

- **Querying like SQL.** No joins; denormalise for the read.
- **Omitting `limit()`.** Unbounded reads, unbounded cost.
- **Leaking listeners.** They bill until the tab closes.
- **Client timestamps.** Use `serverTimestamp()`.
- **Indexes created by console click.** They never reach the next environment.

### Production checklist

- [ ] Every query bounded with `limit()` and paginated.
- [ ] Composite indexes committed in `firestore.indexes.json`.
- [ ] All listeners detached on unmount.
- [ ] Rules restrict each collection, tested as a non-owner.
- [ ] Denormalised fields have a write path that keeps every copy in step.
- [ ] `serverTimestamp()` used for ordering.
- [ ] Scheduled export or backup configured.

### Documentation

- [Firestore](https://firebase.google.com/docs/firestore)
- [Data modelling](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Query limitations](https://firebase.google.com/docs/firestore/query-data/queries)
- [Understand billing](https://firebase.google.com/docs/firestore/pricing)
