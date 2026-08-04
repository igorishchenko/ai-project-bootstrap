Build and submit are separate steps, and neither one releases the app.

```mermaid
flowchart TD
  tag["Tag a release"] --> build["eas build --profile production"]
  build --> artifact["Signed binary on EAS"]
  artifact --> submit["eas submit --profile production"]
  submit --> tf["TestFlight / internal track"]
  tf --> verify["Someone verifies the build"]
  verify --> publish["Publish in the store console"]
  publish --> users["Users"]
```

The last two steps are deliberately manual. Automating all the way to `users`
removes the point at which a person confirms this is the build they intended,
and store releases are slow and awkward to reverse.

### Credential flow

```mermaid
flowchart LR
  ci["CI"] -->|EXPO_TOKEN| eas["EAS"]
  secrets[("EAS credentials: APNs, ASC key, Play JSON")] --> eas
  eas --> stores["App Store / Play"]
  repo["Repository"] -.->|never| secrets
```

No store credential lives in the repository. EAS holds them, CI holds only the
token that authorises using them.
