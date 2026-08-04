### Overview

EAS Submit uploads a finished build to App Store Connect and Google Play. It
handles the credential dance and the upload protocols, so releasing does not
depend on one person's laptop.

It submits; it does not release. The build lands in TestFlight or a Play track,
and going live is still a decision someone makes in the store console — which is
the correct place for it.

### Store prerequisites

**App Store Connect**

1. The app record must exist, with its bundle identifier registered.
2. An App Store Connect API key (Users and Access → Integrations) — issuer id,
   key id and the `.p8` file. This is what lets CI upload without a password or
   2FA prompt.
3. The Paid Applications agreement signed if the app sells anything.

**Google Play**

1. The app must exist in the Play Console, and **a first build must be uploaded
   manually**. The API cannot create the initial release, which catches most
   people once.
2. A service account with the Release Manager role, and its JSON key.

### Configure

Submit profiles live in `eas.json`:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "you@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Submit to the `internal` track first, then promote in the console. Submitting
straight to `production` removes the step where someone verifies the build is
the one they meant.

**Never commit the service account JSON.** Use an EAS secret or a CI file
variable, and keep the path in `.gitignore`.

### Submitting

```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

`--latest` submits the most recent build for that profile. In CI, prefer an
explicit `--id` so a concurrent build cannot be picked up by accident.

### From CI

```bash
eas build --profile production --platform all --non-interactive --auto-submit
```

`--auto-submit` chains build and submit. Requires `EXPO_TOKEN` in the CI
environment, and every credential already uploaded to EAS.

### Version and build numbers

Stores reject a duplicate build number, and they reject it *after* the upload
completes — wasting a full build cycle. `autoIncrement` in the production build
profile avoids this entirely.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "app not found" on Android | No build uploaded manually yet. The API cannot create the first one |
| iOS submission rejected instantly | Duplicate build number, or an expired API key |
| "Invalid credentials" in CI | `EXPO_TOKEN` missing, or store credentials not uploaded to EAS |
| Submitted but not in TestFlight | Processing takes time; check for an export compliance prompt |
| Android upload succeeds, testers see nothing | Submitted to a track with no testers assigned |

### Common mistakes

- **Committing the Play service account JSON.** It can publish releases.
- **Submitting straight to production.** No verification step.
- **Not incrementing the build number.** Rejected after a full build.
- **Assuming submitted means released.** It is in a track, not live.
- **Interactive credentials in CI.** Use an API key, not an Apple ID password.

### Production checklist

- [ ] App Store Connect API key uploaded to EAS.
- [ ] Play service account JSON stored as a secret, never committed.
- [ ] First Play build uploaded manually.
- [ ] Build number auto-incremented.
- [ ] Submitting to an internal or beta track, promoted deliberately.
- [ ] `EXPO_TOKEN` present in CI as a masked secret.
- [ ] Release notes and export compliance answered.

### Documentation

- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Submitting to the App Store](https://docs.expo.dev/submit/ios/)
- [Submitting to Google Play](https://docs.expo.dev/submit/android/)
