// Scaffolded by `ai-project-bootstrap implement push-notifications` (OneSignal).
// See implementation/push-notifications/plan.md, step 5.
//
// Register once, at startup — not per screen.

import { OneSignal } from 'react-native-onesignal';

export function registerNotificationOpenedListener(
  onOpen: (data: Record<string, unknown>) => void,
): () => void {
  const handler = (event: { notification: { additionalData?: Record<string, unknown> } }): void => {
    // Notification *content* is visible on the lock screen — route from the
    // data payload, never trust the title/body for anything sensitive.
    onOpen(event.notification.additionalData ?? {});
  };

  OneSignal.Notifications.addEventListener('click', handler);
  return () => OneSignal.Notifications.removeEventListener('click', handler);
}

// TODO (plan.md, step 5): call registerNotificationOpenedListener() once at
// the app's root, and route to the right screen using the data payload — e.g.
// `onOpen((data) => { if (data.screen) navigate(data.screen as string); })`.
