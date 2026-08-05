Queries go from the client to Firestore directly, filtered by rules on the way
in and billed per document on the way out.

```mermaid
flowchart LR
  screen["Screen"] --> service["src/services/firebase/collections"]
  service --> query["query(collection, where, orderBy, limit)"]
  query --> rules{"Security rules"}
  rules -->|allow| docs[("Documents — billed per read")]
  rules -->|deny| denied["Permission denied"]
```

### Why the data model looks duplicated

```mermaid
flowchart TD
  posts[("posts: { title, authorId, authorName }")] --> list["Post list renders in one query"]
  users[("users: { name }")] -.->|no join available| list
```

Storing `authorName` on the post is not sloppiness — there is no join, and
fetching each author separately turns one query into N. The cost is that
renaming a user must update every post that copied the name, so keep duplicated
fields few and slow to change.
