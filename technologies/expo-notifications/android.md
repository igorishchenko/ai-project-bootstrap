Android push goes through Firebase Cloud Messaging even when you send via Expo.

1. Create a Firebase project and add an Android app with your package name.
2. Download `google-services.json` and reference it in `app.json`:

   ```json
   {
     "expo": {
       "android": {
         "package": "com.example.{{projectSlug}}",
         "googleServicesFile": "./google-services.json"
       }
     }
   }
   ```

3. Upload the FCM v1 service account key to EAS via `eas credentials`.

**Android 13 and later require the `POST_NOTIFICATIONS` runtime permission.**
The config plugin declares it, but you must still request it at runtime — on
these versions notifications simply never appear otherwise, with no error.

Unlike iOS, Android permission can be re-requested, though repeated denials
become permanent. Notification channels are also required: without an explicit
channel, importance settings are ignored and alerts arrive silently.

```ts
await Notifications.setNotificationChannelAsync('default', {
  name: 'Default',
  importance: Notifications.AndroidImportance.DEFAULT,
});
```

`google-services.json` contains project identifiers rather than secrets, but
keep it out of public repositories regardless.
