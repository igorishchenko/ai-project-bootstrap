Expo's service fans out to APNs and FCM, so the app holds one token format and
the backend has one endpoint to call.

```mermaid
flowchart LR
  app["App"] -->|register| expo["Expo push service"]
  expo -->|ExponentPushToken| app
  app -->|token + userId| backend["Your backend"]
  backend -->|send| expo
  expo --> apns["APNs"]
  expo --> fcm["FCM"]
  apns --> device["iOS device"]
  fcm --> android["Android device"]
  expo -->|receipts| backend
```

The receipts loop is not optional bookkeeping: a send returning 200 only means
Expo accepted the request. Delivery failures — most importantly
`DeviceNotRegistered` — appear later in the receipt, and those tokens must be
deleted or they accumulate forever.

### Tap handling

```mermaid
flowchart TD
  tap["User taps notification"] --> running{"App already running?"}
  running -->|yes| listener["Response listener fires"]
  running -->|no| cold["Cold start"]
  cold --> last["getLastNotificationResponseAsync()"]
  listener --> nav["Navigate"]
  last --> nav
```

Only handling the listener branch loses every deep link from a cold start, which
is the most common way a notification tap "does nothing".
