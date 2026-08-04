# GitHub Actions

CI for {{projectName}}.

## Secrets never live in a file

Repository or environment secrets only. A secret committed to a workflow is
readable by everyone with repository access the moment it lands, and rewriting
history does not un-leak it — the value must be rotated.

If a workflow needs a credential, add it in **Settings → Secrets** and reference
it. Never inline one "temporarily to test".

## Least privilege, explicitly

```yaml
permissions:
  contents: read
```

Every workflow sets this at the top. The default token is broader than a test
run needs, and every action in the job — including third-party ones — inherits
it. Raise a specific permission only on the job that requires it.

## Pin third-party actions to a SHA

A tag is mutable. `some-org/action@v1` can be repointed at new code, and that
code runs with access to your secrets. Pin to a commit SHA for anything not
under `actions/`.

## The fork trap

`pull_request` withholds secrets from fork contributions. That is deliberate, not
a bug.

**Never** switch to `pull_request_target` to gain secret access. It runs the
base branch's workflow with full permissions against code the contributor
controls — a well-documented way to exfiltrate every secret in the repository.
If a job genuinely needs secrets, run it after merge, not on the fork's PR.

## Cancel superseded runs

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Without it, every push to an open pull request builds a commit nobody will merge,
all the way to completion.

## Deployment is a separate, gated workflow

Tag or manual dispatch, targeting an environment with required reviewers. A
green build means the code is *safe* to ship, not that now is the right moment.
