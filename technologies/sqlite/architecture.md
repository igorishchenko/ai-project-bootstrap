Local storage sits behind the same service boundary as the network, so screens
do not know where data came from.

```mermaid
flowchart TD
  ui["Screens"] --> service["src/services/database"]
  service --> db[("SQLite on device")]
  sync["Sync service"] --> db
  sync --> api["Remote API"]
```

### Offline-first read path

```mermaid
flowchart LR
  read["Read request"] --> local[("Local SQLite")]
  local --> render["Render immediately"]
  render --> refresh["Refresh from API in background"]
  refresh --> write["Write back to SQLite"]
  write --> render
```

Reading locally first is what makes the app usable without a connection. The
consequence is that two copies of the data exist, so **the conflict rule must be
decided deliberately** — last-write-wins on a timestamp is usually enough, but
it silently discards one side, and that is worth stating here rather than
leaving it implicit in the sync code.
