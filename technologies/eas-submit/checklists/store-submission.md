# Store submission checklist

Store reviews are slow and rejections cost days, so verify before submitting.

## Both stores

- [ ] Build number incremented — duplicates are rejected after upload.
- [ ] Version number matches the release being announced.
- [ ] Release notes written for users, not for the team.
- [ ] Tested on a physical device from the exact build being submitted.
- [ ] No debug logging, test accounts or placeholder content.
- [ ] Privacy policy URL reachable and current.

## App Store

- [ ] Export compliance answered, or the build never reaches TestFlight.
- [ ] Screenshots for every required device size.
- [ ] Permission strings explain the benefit to the user — vague ones are
      rejected.
- [ ] Sign-in credentials supplied for review if the app requires an account.
- [ ] Paid Applications agreement active if the app sells anything.
- [ ] Account deletion available in-app if accounts can be created.

## Google Play

- [ ] Target API level meets Google's current requirement.
- [ ] Data safety form matches what the app actually collects.
- [ ] Content rating questionnaire completed.
- [ ] First build uploaded manually if this is a new app.
- [ ] Testers assigned to the track you submitted to.

## After submitting

- [ ] Build appears in TestFlight or the intended Play track.
- [ ] Someone other than the author installs and verifies it.
- [ ] Promotion to production is a deliberate decision, not automatic.
- [ ] Crash reporting and analytics receiving events from the release build.
