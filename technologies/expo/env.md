# Expo environment

Only variables prefixed `EXPO_PUBLIC_` are exposed to the app, and they are
**embedded in the JavaScript bundle**. Anyone who downloads the app can read
them. Server keys, service-role keys and API secrets belong in EAS secrets or on
a server — never here.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Yes | Base URL the app calls. One per environment. | `https://api.example.com` |
| `EXPO_PUBLIC_ENV` | No | Environment label used for feature gating and diagnostics. | `development` |
| `EXPO_TOKEN` | No | EAS access token. CI only — never in a local `.env` that could be committed. | `xxxxxxxx` |
