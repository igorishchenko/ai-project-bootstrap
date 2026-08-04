# Detox

End-to-end tests for {{projectName}}.

## Add one sparingly

Detox drives the real app on a simulator. It catches what nothing else can —
navigation across screens, native permission dialogs, deep links from a cold
start — and it costs minutes of CI on every push.

So the bar is high: a flow whose breakage would be unacceptable. Sign-in,
purchase, the core task. If a component test could catch it, write that
instead, and say so if you are asked for an E2E test that does not need to be
one.

## Shape

```js
beforeEach(async () => {
  await device.launchApp({ newInstance: true });
});

it('unlocks pro after purchasing', async () => {
  await element(by.id('open-paywall')).tap();
  await waitFor(element(by.id('pro-badge'))).toBeVisible().withTimeout(10000);
});
```

## Two rules that prevent most flakes

1. **`waitFor`, never `sleep`.** A fixed delay is slow when it passes and flaky
   when it does not, and it disguises the real timing problem.
2. **Relaunch every test.** State inherited from a previous test produces
   failures that depend on execution order and vanish when run alone.

## Selectors are test ids here

Opposite to component tests: `by.id()` on accessibility ids is correct, because
the accessibility tree is what Detox can see and visible text changes with
locale. Add the id as part of the change rather than after the fact.

## Never hit real services

Purchases, email, analytics and push must be stubbed in the E2E build. A test
that charges a card or sends mail to a real address is not a test.

## Reporting

Detox needs a built app and a specific simulator, so it usually cannot run here.
If you wrote a test but could not execute it, say that plainly rather than
implying it passed.
