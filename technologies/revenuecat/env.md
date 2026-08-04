# RevenueCat environment

The public SDK keys are designed to ship inside the app — one per platform.

The **secret** API key is not. It can read and modify subscriber data for every
user, so it belongs on a server or in CI secrets only.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Yes | Public SDK key for the iOS app, from the RevenueCat dashboard. | `appl_xxxxxxxx` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | Yes | Public SDK key for the Android app. | `goog_xxxxxxxx` |
| `REVENUECAT_SECRET_KEY` | No | Server-side REST API key. Never ship this in the app. | `sk_xxxxxxxx` |
