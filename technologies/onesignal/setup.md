### Overview

OneSignal handles push delivery plus the things around it: audience
segmentation, scheduling, A/B tests and per-campaign analytics. You send to a
segment or an external user id rather than managing device tokens yourself.

That token management is the practical reason to choose it over a raw push
integration — and the reason the main correctness risk moves to **identity**:
getting `login`/`logout` wrong sends one user's notifications to another.

### Dashboard configuration

1. Create an app at [onesignal.com](https://onesignal.com).
2. **Settings → Push & In-App → Apple iOS** — upload your APNs key (key id, team
   id, and the `.p8` file).
3. **Google Android (FCM)** — upload the FCM v1 service account JSON from your
   Firebase project.
4. Copy the **App ID**. The REST API key is server-side only.
5. Create separate OneSignal apps for development and production, or test sends
   reach real users.

### Install

```bash
npx expo install react-native-onesignal onesignal-expo-plugin
npx expo prebuild --clean
```

Add the plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [["onesignal-expo-plugin", { "mode": "development" }]]
  }
}
```

Set `mode` to `production` for release builds — a development APNs environment
in a production build fails silently.

### Initialise

```ts
import { OneSignal, LogLevel } from 'react-native-onesignal';

export function configureNotifications() {
  OneSignal.Debug.setLogLevel(__DEV__ ? LogLevel.Verbose : LogLevel.None);
  OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);
}
```

### Permission, in context

```ts
const accepted = await OneSignal.Notifications.requestPermission(true);
```

Do not call this on first launch. On iOS the system prompt appears once per
install, and a decline is permanent short of a trip to Settings. Show your own
explanation first and request only when the user agrees.

### Identity

```ts
OneSignal.login(userId);    // after sign-in
OneSignal.logout();         // after sign-out
```

This is the part that goes wrong. Without `logout()`, the device stays
subscribed as the previous user, and the next person to sign in on that phone
receives notifications intended for someone else. Treat it as part of the
sign-out path, not an optimisation.

### Tags and segments

```ts
OneSignal.User.addTag('plan', 'pro');
```

Tags drive segmentation. Keep them to non-personal attributes — plan, locale,
onboarding state. Email addresses, names and anything sensitive do not belong in
a third-party segmentation store.

### Handling taps

```ts
OneSignal.Notifications.addEventListener('click', (event) => {
  const screen = event.notification.additionalData?.screen;
  // navigate — must also work when the app was launched by the tap
});
```

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| No notifications on iOS | APNs key missing, or plugin `mode` does not match the build |
| No notifications on Android | FCM service account not uploaded |
| Nothing in Expo Go | Expected — native module, needs a development build |
| Wrong user receives alerts | `logout()` not called on sign-out |
| Subscribed but never delivered | Device unsubscribed in the dashboard, or permission revoked |

### Common mistakes

- **Requesting permission at launch.** One iOS decline is effectively permanent.
- **Skipping `logout()`.** Notifications follow the device, not the account.
- **Personal data in tags.** It is a third-party store, and hard to purge.
- **One app for all environments.** Test campaigns reach production users.
- **Shipping the REST API key.** It can send to your entire audience.

### Production checklist

- [ ] Separate OneSignal apps for development and production.
- [ ] APNs key and FCM service account uploaded.
- [ ] Plugin `mode` set to `production` for release builds.
- [ ] Permission requested in context, after an explanation.
- [ ] `login` on sign-in and `logout` on sign-out, both verified.
- [ ] Tags contain no personal data.
- [ ] REST API key server-side only.
- [ ] Tested on physical iOS and Android devices.

### Documentation

- [OneSignal React Native SDK](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [Expo plugin](https://documentation.onesignal.com/docs/expo-sdk-setup)
- [Identity and aliases](https://documentation.onesignal.com/docs/users)
