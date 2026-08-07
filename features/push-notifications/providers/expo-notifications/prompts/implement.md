# Implement push notifications — Expo Push

> Read `implementation/push-notifications/plan.md` first if you haven't —
> this prompt assumes it. Replace the bracketed parts, delete what doesn't
> apply, then send.

Implement push notifications in {{projectName}} using Expo's push service,
following `implementation/push-notifications/plan.md` step by step.

## Context

- Read `docs/setup.md#expo-push` and
  `.cursor/rules/expo-notifications.mdc`/`.claude/skills/expo-notifications/SKILL.md`
  for the conventions this project expects.
- This needs a development build, not Expo Go — confirm one exists before
  testing anything.
- Scaffolded, currently stubs: `src/services/notifications/pushToken.ts`,
  `src/services/notifications/listener.ts`. Fill these in rather than
  restructuring them, unless there's a concrete reason to.
- [Name the screen(s) a notification tap should open, and what identifies
  which one — an id in the notification's data payload, presumably.]

## Requirements

- An explanation screen shown before requesting permission — never requested
  on first launch with no context.
- Token registration and re-send-on-launch, deleted on sign-out.
- A response listener, registered once, that handles both a tap while
  running and a cold-start launch via `getLastNotificationResponseAsync()`.
- [If you have a backend in this project] an endpoint that stores tokens per
  user and checks delivery receipts after sending.

## Constraints

- Denied permission is a normal state — no feature is blocked on it.
- No personal data or token inside a notification payload.
- New environment variables get added to `.env.example` in this change.
- Include the tests described in `docs/testing.md` — mock the
  `expo-notifications` boundary; this can't be tested in CI against a real
  device.

## Before you start

Tell me the files you plan to create or change, which screen a tap should
open, and anything above that's ambiguous. Then implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/push-notifications/checklist.md` and tell me what's
verified versus what still needs a physical device.
