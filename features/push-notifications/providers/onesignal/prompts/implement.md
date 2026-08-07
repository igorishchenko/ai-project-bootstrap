# Implement push notifications — OneSignal

> Read `implementation/push-notifications/plan.md` first if you haven't —
> this prompt assumes it. Replace the bracketed parts, delete what doesn't
> apply, then send.

Implement push notifications in {{projectName}} using OneSignal, following
`implementation/push-notifications/plan.md` step by step.

## Context

- Read `docs/setup.md#onesignal` and
  `.cursor/rules/onesignal.mdc`/`.claude/skills/onesignal/SKILL.md` for the
  conventions this project expects.
- This needs a development build, not Expo Go — confirm one exists before
  testing anything.
- Scaffolded, currently stubs: `src/services/notifications/oneSignalClient.ts`,
  `src/services/notifications/listener.ts`. Fill these in rather than
  restructuring them, unless there's a concrete reason to.
- [Name the screen(s) a notification tap should open, and what identifies
  which one.]

## Requirements

- Initialization at startup, an explanation screen before requesting
  permission, and `login`/`logout` tied to your app's own sign-in/sign-out.
- A notification-opened listener, registered once, routing by the payload's
  data.
- Tags limited to non-personal attributes — [list the ones this app actually
  needs, e.g. plan tier, locale].
- [If you have a backend in this project] a send path using the REST API key
  server-side only, targeted by tag or external id.

## Constraints

- No personal data (email, name, phone) ever sent as a tag or in a
  notification payload.
- Denied permission is a normal state — no feature is blocked on it.
- New environment variables get added to `.env.example` in this change.
- Include the tests described in `docs/testing.md` — mock the
  `react-native-onesignal` boundary; this can't be tested in CI against a
  real device.

## Before you start

Tell me the files you plan to create or change, which screen a tap should
open, which tags this app needs, and anything above that's ambiguous. Then
implement it.

## When you are done

Run lint, typecheck and tests, and report the actual results. Then walk
through `implementation/push-notifications/checklist.md` and tell me what's
verified versus what still needs a physical device.
