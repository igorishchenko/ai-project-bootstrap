The client never holds a credential. Your backend mints short-lived presigned
URLs, and the upload itself goes straight to R2.

```mermaid
sequenceDiagram
  participant App
  participant API as Your backend
  participant R2

  App->>API: request upload URL (type, size)
  API->>API: validate, generate key {userId}/{uuid}
  API->>R2: presign PutObject
  R2-->>API: signed URL
  API-->>App: signed URL
  App->>R2: PUT file directly
  App->>API: confirm, store key
```

Two properties of this shape matter:

**The backend chooses the key.** A client-supplied key would let one user write
over another's object with a request that looks entirely legitimate.

**Validation happens before signing.** The signed URL is a capability — once
issued it works until it expires, so checking the file afterwards is too late.

```mermaid
flowchart LR
  db[("Database stores the key")] --> sign["Presign GetObject on demand"]
  sign --> url["Temporary URL"]
  url --> client["Client renders"]
```
