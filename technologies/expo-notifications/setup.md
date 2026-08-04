### Overview

Expo's push service sits in front of APNs and FCM, so you send to one endpoint
with one token format instead of maintaining two integrations.

Two things account for most of the difficulty, and neither is code: push does
not work in a simulator, and it does not work in Expo Go for production
credentials. Testing means a development build on a physical device.

### Install

```bash
npx expo install expo-notifications expo-device
npx expo prebuild --clean
```

### Credentials

**iOS** — an APNs key uploaded to EAS:

```bash
eas credentials
```

**Android** — a Firebase project (FCM v1), with `google-services.json` added to
the project and the service account uploaded to EAS. Android push runs on FCM
even through Expo.

### Permission and token

Ask at the moment the value is obvious, not on first launch:

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;          // simulators cannot receive push

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;      // a real state, not an error

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  return token.data;
}
```

On iOS the permission prompt appears **once, ever**. A user who declines can
only change it in Settings, so asking at launch — before they know what the
notifications are for — permanently costs you that channel.

### Storing tokens

Send the token to your backend with the user id, and refresh it on every
launch: tokens rotate on reinstall and restore. Delete the token on sign-out, or
the next person on that device receives the previous user's notifications.

### Handling notifications

```ts
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

Notifications.addNotificationResponseReceivedListener((response) => {
  const { screen } = response.notification.request.content.data;
  // navigate — must also work from a cold start
});
```

Tapping a notification frequently launches the app from scratch. Handle the
cold-start case with `getLastNotificationResponseAsync()`, or the tap opens the
home screen and the deep link is lost.

### Sending

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{"to":"ExponentPushToken[xxx]","title":"Hello","body":"World"}'
```

Check the receipts endpoint afterwards. A 200 means Expo accepted it, not that
it was delivered — `DeviceNotRegistered` comes back in the receipt, and that
token must then be deleted.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| No token on a simulator | Expected. Push needs a physical device |
| Permission prompt never appears | Already answered once. Reinstall or reset in Settings |
| iOS silent failure | APNs key missing or wrong in EAS credentials |
| Android silent failure | `google-services.json` missing, or FCM not configured |
| `DeviceNotRegistered` | Token is stale. Delete it and re-register on next launch |
| Tap does nothing from cold start | Cold-start response not handled |

### Common mistakes

- **Asking for permission at launch.** One refusal is permanent on iOS.
- **Treating denial as an error.** It is a normal state; the app must work.
- **Never refreshing tokens.** They rotate, and stale ones fail silently.
- **Not clearing tokens on sign-out.** The next user gets the last one's alerts.
- **Assuming a 200 means delivered.** Read the receipts.

### Production checklist

- [ ] APNs key uploaded; FCM configured for Android.
- [ ] Permission requested in context, with an explanation first.
- [ ] Denied state handled as a normal path.
- [ ] Tokens refreshed on launch and deleted on sign-out.
- [ ] Cold-start notification taps navigate correctly.
- [ ] Receipts checked and `DeviceNotRegistered` tokens purged.
- [ ] Tested on physical iOS and Android devices.

### Documentation

- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Push notifications overview](https://docs.expo.dev/push-notifications/overview/)
- [Sending and receipts](https://docs.expo.dev/push-notifications/sending-notifications/)
