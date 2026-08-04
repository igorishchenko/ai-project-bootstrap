# Base environment variables

Every project gets these. Technology-specific variables are documented in each
technology's own section of `docs/setup.md`.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `APP_ENV` | No | Which environment this build targets. Drives which credentials and third-party projects are used. Defaults to development. | `development` |
| `APP_NAME` | No | Display name, where the UI needs one. | `{{projectName}}` |

Never commit `.env`. Only `.env.example` belongs in git.
