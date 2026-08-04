# GitLab CI

Pipelines for {{projectName}}.

## Masked and Protected are different switches

- **Masked** hides the value in job logs.
- **Protected** restricts it to protected branches and tags.

You need both. A masked-but-unprotected variable is readable by any pipeline,
including one from a fork merge request — the job just has to write it somewhere
other than stdout.

When a fork pipeline cannot see a variable, that is the protection working.
**Never unprotect it to make the pipeline pass.** If a job genuinely needs the
credential, run it after merge on a protected branch.

## Secrets never live in the file

`.gitlab-ci.yml` is committed. A credential in it is leaked the moment it lands,
and history rewriting does not fix that — the value must be rotated.

## Cancel superseded work

```yaml
interruptible: true
```

Without it, every push builds an already-obsolete commit to completion, and busy
repositories queue behind work nobody wants.

## Cache the manager's cache

Key on the lockfile, and cache `.npm/` rather than `node_modules/`:

```yaml
cache:
  key:
    files: [package-lock.json]
  paths: [.npm/]
```

Caching `node_modules` directly restores a tree that may not match the lockfile,
producing failures that only reproduce in CI.

## Deployment is a decision

Production jobs are `when: manual` against a protected environment. Automatic
deploys from every green pipeline remove the point at which a person judges
whether now is a good time — which matters more than it sounds on a Friday.

## Never echo a variable

Printing a secret to debug it defeats masking and writes it into logs that are
retained and widely readable.
