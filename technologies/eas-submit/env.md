# EAS Submit environment

`EXPO_TOKEN` can build and submit on your behalf — CI secrets only, masked.

The Play service account JSON must never be committed. Store it as an EAS secret
or a CI file variable and keep its path in `.gitignore`; it can publish releases
to your app.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_TOKEN` | Yes | Authenticates EAS in CI. Never in a local `.env` that could be committed. | `xxxxxxxx` |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | No | Path to the Play service account JSON, provided by CI at runtime. | `./play-service-account.json` |
| `ASC_APP_ID` | No | App Store Connect app id used by the submit profile. | `1234567890` |
