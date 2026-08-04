### Overview

Detox builds the app, installs it on a simulator or emulator, and drives it the
way a person would — tapping, typing, scrolling — asserting on what is actually
on screen.

It is the only way to test what Jest cannot reach: navigation across screens,
native permission dialogs, deep links from a cold start, and anything behind a
native module. It is also slow and expensive, so a handful of tests covering the
flows that must never break is worth far more than broad coverage.

### Install

```bash
npm install -D detox @types/jest
npm install -g detox-cli
```

macOS additionally needs `applesimutils`:

```bash
brew tap wix/brew && brew install applesimutils
```

### Configure

`.detoxrc.js` ships with this project. Point its `binaryPath` and `device` at
the simulator and build you actually use — the defaults name a simulator that
may not exist on your machine, which produces a confusing "device not found".

For Expo, you need a development or release build, not Expo Go:

```bash
npx expo prebuild --clean
detox build --configuration ios.sim.debug
```

### Writing a test

```js
describe('Subscription', () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('unlocks pro after purchasing', async () => {
    await element(by.id('open-paywall')).tap();
    await expect(element(by.text('Annual'))).toBeVisible();
    await element(by.id('purchase-annual')).tap();
    await waitFor(element(by.id('pro-badge'))).toBeVisible().withTimeout(10000);
  });
});
```

Unlike component tests, Detox **does** use test ids — the accessibility tree is
what it can see, and text changes with locale.

### Running

```bash
detox build --configuration ios.sim.debug
detox test  --configuration ios.sim.debug
```

Build once, then re-run tests as often as you like; only a native change needs
a rebuild.

### What to cover

Pick the few flows where a regression would be unacceptable: sign-in, purchase,
the primary task the app exists for. Resist adding a Detox test for anything a
component test could catch — every one you add is minutes of CI on every push.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Device not found" | The simulator named in `.detoxrc.js` does not exist. `xcrun simctl list` |
| Test hangs then times out | The app is stuck on a network call. Stub the network for E2E |
| Passes locally, fails in CI | CI has a different simulator or no `applesimutils` |
| "Cannot find element" on a visible view | The element has no accessibility id, or is off-screen — scroll to it |
| Flaky on animations | Detox waits for the app to be idle; an infinite animation never idles |

### Common mistakes

- **Testing everything end to end.** Slow, flaky, and it duplicates what unit
  tests already prove.
- **Hitting real services.** Purchases, email and analytics must be stubbed;
  a test that charges a card is not a test.
- **`sleep()` instead of `waitFor`.** Fixed delays are slow when they pass and
  flaky when they do not.
- **Sharing state between tests.** Relaunch with `newInstance: true`.

### Production checklist

- [ ] The critical flows have an E2E test; nothing else does.
- [ ] Network and third-party SDKs stubbed in the E2E build.
- [ ] No `sleep()` — every wait is a `waitFor` with a timeout.
- [ ] Each test relaunches the app rather than inheriting state.
- [ ] CI has the same simulator and `applesimutils` installed.
- [ ] The suite is quarantined, not deleted, if it turns flaky.

### Documentation

- [Detox](https://wix.github.io/Detox/)
- [Detox with Expo](https://docs.expo.dev/build-reference/e2e-tests/)
- [Matchers and actions](https://wix.github.io/Detox/docs/api/matchers)
