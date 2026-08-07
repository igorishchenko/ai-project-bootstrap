// Scaffolded by `ai-project-bootstrap implement push-notifications` (Expo Push).
// See implementation/push-notifications/plan.md, steps 5-6.
//
// Register once, at startup — not per screen.

import * as Notifications from 'expo-notifications';

export function registerNotificationResponseListener(
  onOpen: (data: Record<string, unknown>) => void,
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onOpen(response.notification.request.content.data ?? {});
  });

  // Cold start: a tap that launched the app from scratch doesn't fire the
  // listener above — without checking this separately, that deep link is lost.
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) onOpen(response.notification.request.content.data ?? {});
  });

  return () => subscription.remove();
}

// TODO (plan.md, step 6): call registerNotificationResponseListener() once at
// the app's root, and route to the right screen using the data payload — e.g.
// `onOpen((data) => { if (data.screen) navigate(data.screen as string); })`.
