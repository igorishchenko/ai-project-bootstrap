### Overview

Fastlane scripts the release process — building, signing, uploading, screenshots
— in Ruby, and runs the same lanes locally and in CI.

Choose it over a hosted service when you need full control of signing, run your
own build machines, or have release steps that do not fit someone else's
pipeline. The cost is that certificates and provisioning profiles become your
problem, and they are the part that breaks.

### Install

```bash
brew install fastlane
cd ios && fastlane init && cd ..
cd android && fastlane init && cd ..
```

Fastlane is a Ruby gem. Pin it with a `Gemfile` and commit `Gemfile.lock`, or CI
will eventually run a different version than you tested with.

### Signing: use match

`match` stores certificates and provisioning profiles in an encrypted private
repository, so every machine and CI runner uses the same ones:

```bash
fastlane match init
fastlane match appstore
```

The alternative — each developer generating their own certificates — produces
the classic "works on my machine, fails in CI" signing failure, and Apple caps
how many certificates you can hold.

The match repository is **private**, encrypted with a passphrase held in CI
secrets. It contains signing identities: anyone with the repository and the
passphrase can sign as you.

### A release lane

```ruby
platform :ios do
  lane :release do
    setup_ci if ENV['CI']            # keychain handling on a fresh runner
    match(type: 'appstore', readonly: true)
    increment_build_number(xcodeproj: 'ios/YourApp.xcodeproj')
    build_app(workspace: 'ios/YourApp.xcworkspace', scheme: 'YourApp')
    upload_to_testflight(skip_waiting_for_build_processing: true)
  end
end
```

`readonly: true` in CI matters: without it a runner can regenerate certificates
and invalidate everyone else's.

### Android

```ruby
platform :android do
  lane :release do
    gradle(task: 'bundle', build_type: 'Release')
    upload_to_play_store(track: 'internal', json_key: ENV['PLAY_JSON_KEY_PATH'])
  end
end
```

Upload to `internal` and promote in the console. The keystore and the Play
service account JSON never enter the repository — CI provides them at runtime.

### App Store Connect API key

Use an API key rather than an Apple ID and password. CI cannot answer a 2FA
prompt, and app-specific passwords expire at inconvenient moments.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Signing fails only in CI | `setup_ci` missing, or match not run in readonly mode |
| "No profiles for bundle id" | Profile not created for that identifier. `fastlane match` |
| Different behaviour locally vs CI | Unpinned fastlane version. Commit `Gemfile.lock` |
| Upload rejected immediately | Duplicate build number, or expired API key |
| match cannot decrypt | Wrong passphrase, or the repository was re-encrypted |

### Common mistakes

- **Committing the keystore or `.p8` key.** Credentials that cannot be rotated
  quietly.
- **Not using `readonly: true` in CI.** A runner regenerates certificates and
  breaks the whole team.
- **Unpinned fastlane.** A gem update changes behaviour mid-release.
- **Uploading straight to production.** No verification step.
- **Skipping `setup_ci`.** Keychain access fails on a fresh runner.

### Production checklist

- [ ] `Gemfile.lock` committed; fastlane version pinned.
- [ ] Signing via `match`, with `readonly: true` in CI.
- [ ] Match repository private; passphrase in CI secrets only.
- [ ] Keystore and Play JSON supplied by CI, never committed.
- [ ] App Store Connect API key rather than an Apple ID password.
- [ ] Build numbers incremented automatically.
- [ ] Releases go to a beta track first.
- [ ] Lanes run identically locally and in CI.

### Documentation

- [Fastlane](https://docs.fastlane.tools/)
- [match](https://docs.fastlane.tools/actions/match/)
- [Continuous integration](https://docs.fastlane.tools/best-practices/continuous-integration/)
- [React Native setup](https://docs.fastlane.tools/getting-started/cross-platform/react-native/)
