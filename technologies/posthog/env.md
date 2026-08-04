# PostHog environment

The project API key is write-only and designed to ship in the client. The
personal API key is not — it can read and modify project data.

The host determines which region your data is stored in. Sending EU users' data
to the US region is a compliance problem, so set it deliberately.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_POSTHOG_KEY` | Yes | Project API key. Write-only, safe in the client. | `phc_xxxxxxxx` |
| `EXPO_PUBLIC_POSTHOG_HOST` | Yes | Ingestion host. Must match your data region. | `https://eu.i.posthog.com` |
| `POSTHOG_PERSONAL_API_KEY` | No | Server-side API access. Never ship in the app. | `phx_xxxxxxxx` |
