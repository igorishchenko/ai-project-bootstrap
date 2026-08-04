CI decides whether a change may merge. Deployment is a separate, deliberate act.

```mermaid
flowchart TD
  pr["Pull request"] --> ci["CI: lint, typecheck, test"]
  ci -->|fails| blocked["Merge blocked by branch protection"]
  ci -->|passes| merge["Merge to main"]
  merge --> tag["Tag a release"]
  tag --> deploy["Deploy workflow"]
  deploy --> env{"Environment with reviewers"}
  env -->|approved| prod["Production"]
```

Branch protection is what makes the CI job meaningful — a workflow that cannot
block a merge is decoration.

The gap between `merge` and `deploy` is intentional. A green build means the
code is safe to ship, not that this is the right moment; the environment
approval is where a human decides.

### Secret exposure boundary

```mermaid
flowchart LR
  fork["Fork pull request"] -->|pull_request| nosecrets["Runs WITHOUT secrets"]
  internal["Branch in this repo"] -->|pull_request| secrets["Runs with secrets"]
```

Fork runs are secret-free by design. `pull_request_target` crosses that boundary
— full secrets against contributor-controlled code — and is the reason not to
reach for it when a fork build cannot see a credential.
