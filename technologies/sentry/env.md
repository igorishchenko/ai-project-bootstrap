# Sentry environment

The DSN is safe to ship — it only allows writing events. The auth token is not:
it can read and modify project data, so it belongs in CI secrets only.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `{{envPrefix}}SENTRY_DSN` | Yes | Project DSN from Settings → Client Keys. Write-only, safe in the client. | `https://abc@o0.ingest.sentry.io/0` |
| `{{envPrefix}}APP_ENV` | No | Which environment events are tagged with. Read at init, so it has to reach the client bundle. | `production` |
| `SENTRY_AUTH_TOKEN` | No | Uploads source maps during CI builds. Never ship in the app. | `sntrys_xxxxxxxx` |
| `SENTRY_ORG` | No | Organisation slug, used by the source map upload. | `my-org` |
| `SENTRY_PROJECT` | No | Project slug, used by the source map upload. | `{{projectSlug}}` |
