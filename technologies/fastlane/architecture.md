Signing identities are shared through an encrypted repository, so local machines
and CI runners produce interchangeable builds.

```mermaid
flowchart TD
  match[("match repo — encrypted certificates")] --> local["Developer machine"]
  match --> ci["CI runner (readonly)"]
  local --> build["build_app / gradle"]
  ci --> build
  build --> upload["upload_to_testflight / upload_to_play_store"]
  upload --> track["Beta or internal track"]
  track --> promote["Promoted by a person"]
```

The `readonly` marking on CI is the load-bearing detail: a runner permitted to
write can regenerate certificates, revoking the existing ones and breaking every
other machine's builds.

### Where credentials live

```mermaid
flowchart LR
  cisecrets[("CI secrets: MATCH_PASSWORD, ASC key, keystore")] --> runner["Runner at runtime"]
  repo["Git repository"] -.->|never| cisecrets
```

Nothing signing-related is committed. Certificates are expensive to rotate —
revoking one invalidates existing builds — which makes a leak here costlier than
most.
