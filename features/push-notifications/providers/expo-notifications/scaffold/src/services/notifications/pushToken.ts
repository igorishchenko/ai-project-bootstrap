// Scaffolded by `ai-project-bootstrap implement push-notifications` (Expo Push).
// See implementation/push-notifications/plan.md, steps 1-3.

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Call only after the user agrees to your own explanation screen — see plan.md, step 1. */
export async function requestPushPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Registers for a push token. Returns null on a simulator or when permission is denied. */
export async function registerForPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators/emulators cannot receive push at all

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) throw new Error('Missing EXPO_PUBLIC_EAS_PROJECT_ID — see .env.example.');

  if (Platform.OS === 'android') {
    // TODO (plan.md, step 4): tune importance/sound per channel for this app.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

// TODO (plan.md, step 3): call registerForPushToken() on every launch for a
// signed-in user, send the token to your backend, and delete it there on
// sign-out — the next person to sign in on this device must not receive the
// previous user's notifications.
