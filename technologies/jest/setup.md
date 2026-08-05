### Overview

Jest runs the unit and component tests. Paired with Testing Library, it renders
components in a JavaScript environment and asserts on what a user would see — no
simulator, no browser, fast enough to run on every save.

What it deliberately does *not* cover: anything that only exists on a real
device or in a real browser. Native modules, permissions, purchases and push
notifications need an end-to-end runner instead.

{{#if has.react-native}}
### Install

```bash
npx expo install -- --save-dev jest jest-expo @testing-library/react-native @types/jest
```

The generated `jest.config.js` uses the `jest-expo` preset. Without it, every
import of a native module throws a syntax error.

**`transformIgnorePatterns`** must whitelist React Native packages that ship
untranspiled ESM. This is the single most common source of "Unexpected token
export" — when a new dependency breaks the suite, add it there first.
{{/if}}
{{#unless has.react-native}}
### Install

```bash
npm install -D jest @types/jest jest-environment-jsdom
npm install -D @testing-library/react @testing-library/jest-dom
```

The generated `jest.config.js` uses the `jsdom` environment, which gives you a
DOM without a browser.
{{/unless}}

### Writing a test

```tsx
it('shows the annual plan when offerings load', async () => {
  render(<Paywall />);

  expect(await screen.findByText('Annual')).toBeVisible();
});
```

Query the way a user finds things — by text, label or role — not by test id.
`getByTestId` everywhere means the test passes while the screen is unusable for
anyone relying on a screen reader.

### Async queries

`getBy*` queries once and throws. `findBy*` retries until the element appears.
Almost every intermittent failure traces back to a `getBy*` that should have
been a `findBy*`, or a hand-rolled `setTimeout` standing in for one.

### Mocking

Mock only at boundaries: the network, storage, the clock, third-party SDKs.
Where this project wraps an SDK in a service, mock the service — that is much of
why the wrapper exists.

Mocking your own modules ties the test to today's file layout, and it breaks on
a refactor that changed no behaviour.

### Running

```bash
npm test
npm run test:watch
npm run test:coverage
```

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Unexpected token 'export'" | An ESM dependency is being ignored. Add it to `transformIgnorePatterns` |
| Test passes alone, fails in the suite | Shared state. Reset mocks in `beforeEach` |
| "Cannot find module '@/…'" | Path alias missing from `moduleNameMapper` |
| An async assertion is flaky | Use `findBy*`, which retries, rather than a fixed delay |
{{#if has.react-native}}| "Invariant Violation: TurboModuleRegistry" | A native module is unmocked. Mock it in `jest.setup.js` |
{{/if}}{{#unless has.react-native}}| "document is not defined" | `testEnvironment` is not `jsdom` |
{{/unless}}

### Common mistakes

- **Querying by test id by default.** Tests structure, not behaviour.
- **`getBy*` for anything async.** It does not retry.
- **Mocking your own modules.** Couples the test to the file layout.
- **Snapshots nobody reads.** A snapshot regenerated on every failure asserts
  nothing.
- **Chasing a coverage number.** Coverage shows what ran, not what was verified.

### Production checklist

- [ ] Suite runs in CI on every pull request.
- [ ] No skipped or focused tests committed (`it.skip`, `it.only`).
- [ ] Async assertions use `findBy*`, not fixed timeouts.
- [ ] Mocks reset between tests.
- [ ] Every bug fixed this cycle has a regression test.

### Documentation

- [Jest](https://jestjs.io/docs/getting-started)
{{#if has.react-native}}- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Expo apps](https://docs.expo.dev/develop/unit-testing/)
{{/if}}{{#unless has.react-native}}- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [jest-environment-jsdom](https://jestjs.io/docs/configuration#testenvironment-string)
{{/unless}}
