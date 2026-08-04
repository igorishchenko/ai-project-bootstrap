# GitLab CI environment

Pipeline secrets are configured in **Settings → CI/CD → Variables**, never in
`.gitlab-ci.yml` and never in `.env`. Mark each one **Masked** so it is hidden
in job logs, and **Protected** so only protected branches and tags can read it.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `CI` | No | Set by the runner. Use it to skip prompts and enable machine-readable output. | `true` |
