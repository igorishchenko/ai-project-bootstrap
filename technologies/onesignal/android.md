OneSignal delivers to Android through Firebase Cloud Messaging.

1. Create a Firebase project and add an Android app with your package name.
2. In Firebase, generate a service account key (Project Settings → Service
   Accounts) and upload that JSON to OneSignal under Google Android (FCM).
3. Rebuild:

   ```bash
   npx expo prebuild --platform android --clean
   npx expo run:android
   ```

**Android 13 and later require the `POST_NOTIFICATIONS` runtime permission.**
The plugin declares it in the manifest, but you must still request it at
runtime — otherwise notifications never appear and nothing reports an error.

```ts
await OneSignal.Notifications.requestPermission(true);
```

Notification channels control importance and sound. Without an explicit channel
Android applies defaults and your importance settings are ignored.

Legacy FCM server keys are no longer accepted — use the v1 service account JSON.
