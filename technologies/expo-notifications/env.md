# Expo Push environment

Sending happens from your backend. The access token below can send
notifications to every user of your project, so it is server-side only.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Yes | EAS project id, needed when requesting a push token. Also present in `app.json`. | `00000000-0000-0000-0000-000000000000` |
| `EXPO_ACCESS_TOKEN` | No | Authenticates sends against the Expo push API. Server-side only. | `xxxxxxxx` |
