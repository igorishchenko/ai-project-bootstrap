# OneSignal environment

The App ID identifies your app and is safe in the client. The REST API key can
send notifications to your entire audience and read subscriber data — server
side only.

Development and production should be separate OneSignal apps, so test campaigns
cannot reach real users.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `{{envPrefix}}ONESIGNAL_APP_ID` | Yes | OneSignal App ID for this environment. | `00000000-0000-0000-0000-000000000000` |
| `ONESIGNAL_REST_API_KEY` | No | Sends notifications from your backend. Never ship in the app. | `xxxxxxxx` |
