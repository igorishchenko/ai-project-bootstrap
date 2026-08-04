# GitHub Actions environment

CI secrets are configured in **Settings → Secrets and variables → Actions**, not
in `.env` and never in a workflow file. The values below name the secrets a
workflow expects; the secrets themselves live only in GitHub.

`GITHUB_TOKEN` is provided automatically — do not create one.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `CI` | No | Set by the runner. Use it to skip prompts and enable machine-readable output. | `true` |
