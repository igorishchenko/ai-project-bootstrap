Objects are rows in `storage.objects`, so the same policy engine that guards the
database guards the files.

```mermaid
flowchart TD
  pick["Image picker"] --> resize["Resize / compress"]
  resize --> upload["storage.upload({userId}/file)"]
  upload --> policy{"RLS policy on storage.objects"}
  policy -->|allowed| bucket[("Private bucket")]
  policy -->|denied| err["Error returned, not thrown"]
  bucket --> signed["createSignedUrl(path, ttl)"]
  signed --> render["Render with a temporary URL"]
```

Two consequences worth stating explicitly:

**The path is the policy input.** Because policies match on
`storage.foldername(name)`, the `{userId}/…` convention is not a tidiness
preference — without it there is no way to express "only the owner may read
this".

**Your database stores the path, never the URL.** Signed URLs expire; a stored
one becomes a broken image with no obvious cause.
