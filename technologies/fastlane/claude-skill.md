# Fastlane

Release automation for {{projectName}}.

## match, and readonly in CI

Signing identities live in an encrypted private repository managed by `match`,
so every machine uses the same certificate.

```ruby
match(type: 'appstore', readonly: true)
```

`readonly: true` in CI is the important detail. Without it, a runner can decide
to regenerate certificates — which revokes the existing ones and breaks builds
for everyone else on the team, usually mid-release. Read-only means CI can only
consume what a human already created.

## Credentials are never committed

The keystore, the `.p8` App Store Connect key, and the Play service account JSON
all grant the ability to ship as you. CI supplies them at runtime; the
repository never contains them.

The match repository itself holds signing identities and is private, with its
passphrase only in CI secrets. Anyone with both can sign as your team.

If asked to commit a credential "just so CI can find it", say why that cannot be
undone cheaply — signing certificates are awkward to rotate and doing so
invalidates existing builds.

## Pin the gem

Commit `Gemfile.lock`. Fastlane is a Ruby gem, and an unpinned update changes
release behaviour with no change to your code — which is a bad surprise
specifically during a release.

## Use an API key, not a password

CI cannot answer a two-factor prompt. App-specific passwords expire at
inconvenient moments. An App Store Connect API key is the only arrangement that
works unattended.

## Lanes behave the same everywhere

Beyond `setup_ci`, a lane that branches on `ENV['CI']` is usually doing two
different things and will drift. Keep local and CI paths identical so a release
can be reproduced.

## Ship to a beta track

Upload to TestFlight or the internal track, then promote deliberately. Store
releases are slow to reverse, so the verification step earns its place.
