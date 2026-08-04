### Overview

GitHub Actions runs the checks that decide whether a change is safe to merge,
and automates the steps after it is.

The base project already ships a CI workflow running lint, typecheck and tests.
This module adds the parts that matter once more than one person is committing:
secrets, caching, concurrency, and least-privilege permissions.

### Repository configuration

1. **Settings → Secrets and variables → Actions** — add secrets there, never in
   the workflow file. Anything committed to the repository is public to everyone
   with read access, and rewriting history does not un-leak it.
2. **Settings → Branches** — protect the default branch and require the CI check
   to pass before merging. A workflow nobody has to satisfy is decoration.
3. Use **environments** for anything that deploys, with required reviewers on
   production.

### Permissions

Set the narrowest token permissions at the top of every workflow:

```yaml
permissions:
  contents: read
```

The default grants far more than a test run needs, and a compromised action
inherits whatever the job holds. Raise individual permissions only on the job
that needs them.

### Pinning actions

```yaml
- uses: actions/checkout@v4          # fine for first-party actions
- uses: some-org/some-action@<sha>   # pin third-party actions to a commit SHA
```

A tag is mutable. A third-party action referenced by tag can change under you,
and it runs with access to your secrets.

### Caching and concurrency

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Cancelling superseded runs is the single biggest saving on a busy repository —
without it, every push to an open pull request runs a full build to completion
for a commit nobody will ever merge.

### Pull requests from forks

`pull_request` runs without access to secrets, which is deliberate. Never switch
to `pull_request_target` to "fix" that: it runs the base branch's workflow with
full secret access against untrusted code, and it is a well-known way to leak
every secret in the repository.

### Deployment

Keep deployment in a separate workflow, triggered by a tag or a manual dispatch,
targeting a GitHub environment with required reviewers. Deploying automatically
from every green build removes the moment where someone decides it is a good
time to ship.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Secret is empty in a PR from a fork | Expected. Do not use `pull_request_target` |
| Cache never hits | Lockfile changed, or `cache` key does not match the manager |
| Passes locally, fails in CI | Different Node version, or a file only present locally |
| Workflow does not run | Wrong branch filter, or the file is not on the default branch yet |
| Slow queue on busy repos | No `concurrency` — superseded runs are still running |

### Common mistakes

- **Secrets in the workflow file.** Committed is leaked.
- **Default permissions everywhere.** Grants more than any job needs.
- **Third-party actions pinned to a tag.** Mutable code with secret access.
- **`pull_request_target` for fork secrets.** A known exfiltration path.
- **No branch protection.** CI that cannot block a merge is decoration.

### Production checklist

- [ ] Secrets in repository or environment settings, never in files.
- [ ] `permissions` set explicitly and minimally in every workflow.
- [ ] Third-party actions pinned to a commit SHA.
- [ ] Branch protection requires CI to pass.
- [ ] `concurrency` cancels superseded runs.
- [ ] Dependency caching enabled.
- [ ] Deployment gated behind an environment with reviewers.
- [ ] No workflow uses `pull_request_target` with untrusted code.

### Documentation

- [GitHub Actions](https://docs.github.com/actions)
- [Security hardening](https://docs.github.com/actions/security-guides/security-hardening-for-github-actions)
- [Environments](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
