Pipelines gate the merge; deployment stays a separate manual step.

```mermaid
flowchart TD
  mr["Merge request"] --> verify["verify: lint, typecheck, test"]
  verify -->|fails| blocked["Merge blocked"]
  verify -->|passes| merge["Merge to default branch"]
  merge --> tag["Tag"]
  tag --> manual{"deploy:production — when: manual"}
  manual -->|approved| prod["Production environment"]
```

### Where variables are readable

```mermaid
flowchart LR
  protected["Protected branch / tag"] --> yes["Protected variables available"]
  fork["Fork merge request"] --> no["Protected variables withheld"]
```

The right-hand path is the protection doing its job. Unprotecting a variable so
a fork pipeline can read it hands your credentials to anyone who can open a
merge request — if a job truly needs them, run it after merge instead.
