# Fastlane environment

Every value here is a signing or publishing credential, supplied by CI at
runtime. None of them belong in the repository, and none of them belong in a
client build.

Signing certificates are awkward to rotate — revoking one invalidates existing
builds — so treat a leak here as more expensive than most.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `MATCH_PASSWORD` | Yes | Decrypts the match certificate repository. CI secrets only. | `xxxxxxxx` |
| `MATCH_GIT_URL` | Yes | Private repository holding encrypted signing identities. | `git@github.com:org/certificates.git` |
| `ASC_KEY_ID` | Yes | App Store Connect API key id. | `XXXXXXXXXX` |
| `ASC_ISSUER_ID` | Yes | App Store Connect issuer id. | `00000000-0000-0000-0000-000000000000` |
| `ASC_KEY_CONTENT` | Yes | Contents of the `.p8` key. Provided as a CI secret, never a file in git. | `-----BEGIN PRIVATE KEY-----…` |
| `PLAY_JSON_KEY_PATH` | No | Path to the Play service account JSON written by CI at runtime. | `./play-service-account.json` |
| `ANDROID_KEYSTORE_PASSWORD` | No | Release keystore password. CI secrets only. | `xxxxxxxx` |
