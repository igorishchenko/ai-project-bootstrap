// Scaffolded by `ai-project-bootstrap implement push-notifications` (OneSignal).
// See implementation/push-notifications/plan.md, steps 1-4.

import { OneSignal } from 'react-native-onesignal';

/** Call once, at startup, before anything else in this module. */
export function initializeOneSignal(): void {
  const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) throw new Error('Missing EXPO_PUBLIC_ONESIGNAL_APP_ID — see .env.example.');
  OneSignal.initialize(appId);
}

/** Call only after the user agrees to your own explanation screen — see plan.md, step 2. */
export async function requestPushPermission(): Promise<boolean> {
  return OneSignal.Notifications.requestPermission(true);
}

/** Call after your app's own sign-in, so notifications follow the account, not the device. */
export function linkOneSignalToUser(userId: string): void {
  OneSignal.login(userId);
}

/**
 * Call after your app's own sign-out. Skipping this leaves the device
 * subscribed as the previous user — see plan.md, step 3.
 */
export function unlinkOneSignal(): void {
  OneSignal.logout();
}

/** Non-personal attributes only — see plan.md, step 4. */
export function setNonPersonalTag(key: string, value: string): void {
  OneSignal.User.addTag(key, value);
}
