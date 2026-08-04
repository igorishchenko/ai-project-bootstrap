# EAS Submit

Shipping {{projectName}} to the stores.

## Submitted is not released

EAS Submit uploads the build to TestFlight or a Play track. Going live is a
separate action someone takes in the store console.

Keep it that way. Submit to `internal` or a beta track and promote deliberately
— submitting straight to production removes the only step where a human confirms
this is the build they meant to ship.

When reporting on a release, say "submitted to the internal track", not
"released", unless someone actually published it.

## Credentials never enter the repository

The Play service account JSON can publish releases to your app. It goes in an
EAS secret or a CI file variable, with the path in `.gitignore`. Committing it
means rotating it, and rotating it means a trip through the Play Console.

Use an App Store Connect API key rather than an Apple ID and password — CI
cannot answer a 2FA prompt, and there is no workaround worth having.

## Increment the build number

Stores reject a duplicate build number **after** the upload completes, which
wastes a full build. `autoIncrement` in the production profile makes this a
non-issue; without it, it will happen, usually under time pressure.

## Two store quirks worth knowing

- **Google Play cannot create the first release through the API.** One build
  must be uploaded by hand before automation works at all.
- **iOS submissions need export compliance answered**, or the build sits in
  processing and never reaches testers.

## In CI

`--non-interactive`, with `EXPO_TOKEN` as a masked secret. Prefer an explicit
build `--id` over `--latest` — with concurrent builds, `--latest` can submit
something you did not intend.
