### Overview

GitLab CI runs pipelines defined in `.gitlab-ci.yml`, with environments,
approvals and a container registry built into the same product.

The security model differs from GitHub's in one important way: **protected
variables are exposed to protected branches and tags only.** Getting that
setting wrong is how credentials leak to a merge request from a fork.

### Project configuration

1. **Settings → CI/CD → Variables** — add secrets there, never in
   `.gitlab-ci.yml`. Mark each one **Masked** (hidden in job logs) and
   **Protected** (available only on protected branches).
2. **Settings → Repository → Protected branches** — protect the default branch.
3. **Settings → Merge requests** — require pipelines to succeed before merge.
   A pipeline that cannot block a merge is decoration.

Masked and protected are separate switches, and both matter: masking stops a
value appearing in logs, protection stops untrusted branches from reading it.

### Pipeline structure

`.gitlab-ci.yml` ships with this project. The parts worth understanding:

- **`stages`** run in order; jobs in a stage run in parallel.
- **`cache`** keyed on the lockfile — a cache keyed on the branch is shared
  badly and goes stale silently.
- **`interruptible: true`** cancels superseded pipelines when a new commit is
  pushed. Without it, obsolete commits build to completion.
- **`rules`** decide when a job runs. Prefer them over the older `only`/`except`.

### Caching

```yaml
cache:
  key:
    files: [package-lock.json]
  paths: [.npm/]
```

Then `npm ci --cache .npm --prefer-offline`. Keying on the lockfile means the
cache invalidates exactly when dependencies change.

### Environments and approvals

```yaml
deploy:production:
  stage: deploy
  environment:
    name: production
    url: https://example.com
  when: manual
  rules:
    - if: $CI_COMMIT_TAG
```

`when: manual` is the gate. Deploying automatically from every green pipeline
removes the moment where a person decides it is a sensible time to ship.

### Runners

Shared runners are convenient but run your jobs on infrastructure you do not
control. For anything touching production credentials, use a project runner and
disable it for untrusted merge requests.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Variable empty in a fork MR | Expected for protected variables. Do not unprotect to fix it |
| Secret visible in job log | Variable not marked Masked |
| Cache never hits | Key includes the branch, or paths outside the project directory |
| Pipeline does not start | `rules` excluded it, or `.gitlab-ci.yml` has a syntax error |
| Old commits still building | `interruptible` not set |

### Common mistakes

- **Secrets in `.gitlab-ci.yml`.** Committed is leaked; the value needs rotating.
- **Unprotecting a variable** so a fork pipeline can use it. That is the leak.
- **Not masking variables.** They appear in job logs.
- **Automatic production deploys.** No human decision point.
- **Caching `node_modules` directly.** Cache the package manager's cache instead.

### Production checklist

- [ ] All secrets in CI/CD variables, Masked and Protected.
- [ ] Default branch protected; pipeline required to merge.
- [ ] `interruptible: true` on pipeline jobs.
- [ ] Cache keyed on the lockfile.
- [ ] Production deploy is `when: manual` against a protected environment.
- [ ] Project runners for jobs touching production credentials.
- [ ] No credential ever echoed in a job script.

### Documentation

- [GitLab CI/CD](https://docs.gitlab.com/ee/ci/)
- [CI/CD variables](https://docs.gitlab.com/ee/ci/variables/)
- [Environments](https://docs.gitlab.com/ee/ci/environments/)
- [Caching](https://docs.gitlab.com/ee/ci/caching/)
