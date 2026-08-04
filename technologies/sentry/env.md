# Sentry environment

The DSN is safe to ship — it only allows writing events. The auth token is not:
it can read and modify project data, so it belongs in CI secrets only.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SENTRY_DSN` | Yes | Project DSN from Settings → Client Keys. Write-only, safe in the client. | `https://abc@o0.ingest.sentry.io/0` |
| `SENTRY_AUTH_TOKEN` | No | Uploads source maps during CI builds. Never ship in the app. | `sntrys_xxxxxxxx` |
| `SENTRY_ORG` | No | Organisation slug, used by the source map upload. | `my-org` |
| `SENTRY_PROJECT` | No | Project slug, used by the source map upload. | `{{projectSlug}}` |
