After adding any package with native code:

```bash
cd ios && pod install && cd ..
```

Then rebuild. A JavaScript reload will not link native code.

**Signing** — open `ios/{{projectSlug}}.xcworkspace` (the workspace, never the
`.xcodeproj`) and set your team under Signing & Capabilities.

**Permissions** — every permission your app requests needs a usage string in
`Info.plist`. Write what the user gets from granting it; App Review rejects
strings like "This app needs camera access".

**Minimum version** — set the deployment target once, in the Podfile, and let
the pods inherit it. Setting it per-target drifts and produces confusing build
errors months later.
