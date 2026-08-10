/**
 * The dashboard has no backend yet, so the states the design calls for —
 * rate-limited, past-due, lapsed, empty — can't be reached by clicking. Each
 * screen accepts one from `?state=…` instead, which keeps every designed state
 * reviewable without shipping a prototype scene-switcher into the UI.
 *
 * When the account API lands this is the seam: the real subscription and quota
 * status replaces the query param, and the `?state=` reader goes away.
 */
export function pickState<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const first = Array.isArray(value) ? value[0] : value;
  return allowed.includes(first as T) ? (first as T) : fallback;
}

export type SearchParams = Record<string, string | string[] | undefined>;

/*
 * The scene lists live here rather than beside their screens: the screens are
 * `"use client"` modules, and a server component importing a plain value from
 * one gets a client-reference proxy, not the array.
 */

export const chatScenes = [
  "thread",
  "empty",
  "loading",
  "streaming",
  "e422",
  "e429",
  "e402",
  "unsub",
  "offline",
] as const;
export type ChatScene = (typeof chatScenes)[number];

export const connectScenes = ["ok", "stale", "never", "lapsed"] as const;
export type ConnectScene = (typeof connectScenes)[number];

export const stacksScenes = ["list", "empty", "lapsed"] as const;
export type StacksScene = (typeof stacksScenes)[number];

export const settingsScenes = ["active", "pastdue", "canceling", "lapsed"] as const;
export type SettingsScene = (typeof settingsScenes)[number];

export const authScenes = [
  "signin",
  "signup",
  "sent",
  "expired",
  "used",
  "session",
  "onboard",
  "nosub",
] as const;
export type AuthScene = (typeof authScenes)[number];
