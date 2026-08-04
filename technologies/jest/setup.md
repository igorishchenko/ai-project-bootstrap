### Overview

Jest runs the unit and component tests. Paired with React Native Testing
Library, it renders components in a JavaScript environment and asserts on what a
user would see — no simulator, no device, fast enough to run on every save.

What it deliberately does *not* cover: anything that only exists on a real
device. Native modules, permissions, purchases and push notifications need an
end-to-end runner instead.

### Install

```bash
npx expo install -- --save-dev jest jest-expo @testing-library/react-native @types/jest
```

Outside Expo, install the same packages with `npm install -D` and use the
`react-native` preset instead of `jest-expo`.

### Configuration

`jest.config.js` ships with this project. The parts that matter:

- **`preset`** wires up the React Native transformer. Without it, every import
  of a native module throws a syntax error.
- **`transformIgnorePatterns`** must whitelist the RN packages that ship
  untranspiled ESM. This is the single most common source of "Unexpected token
  export" — when a new dependency breaks the suite, add it here first.
- **`setupFilesAfterEnv`** loads `jest.setup.js`, where global mocks live.

### Writing a test

```tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { Paywall } from './Paywall';

it('shows the annual plan when offerings load', async () => {
  render(<Paywall />);

  expect(await screen.findByText('Annual')).toBeVisible();
});
```

Query the way a user finds things — by text, label or role — not by test id.
A `getByTestId` everywhere means the test passes while the screen is unusable.

### Mocking native modules

Anything native must be mocked, in `jest.setup.js`:

```js
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
}));
```

Where this project wraps an SDK in a service, mock the service instead. That is
most of why the wrapper exists.

### Running

```bash
npm test              # once
npm run test:watch    # on change
npm run test:coverage
```

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "Unexpected token 'export'" | An ESM dependency is being ignored. Add it to `transformIgnorePatterns` |
| "Invariant Violation: TurboModuleRegistry" | A native module is unmocked. Mock it in `jest.setup.js` |
| Test passes alone, fails in the suite | Shared state between tests. Reset mocks in `beforeEach` |
| "Cannot find module '@/…'" | Path alias missing from `moduleNameMapper` |
| An async assertion fails intermittently | Use `findBy*`, which retries, rather than `getBy*` |

### Common mistakes

- **Querying by test id by default.** It tests structure, not behaviour.
- **`getBy*` for anything async.** It does not retry; use `findBy*`.
- **Mocking your own modules.** Couples the test to today's file layout.
- **Snapshot tests nobody reads.** A snapshot that gets regenerated on every
  failure asserts nothing.
- **Chasing a coverage number.** Coverage shows what ran, not what was verified.

### Production checklist

- [ ] Suite runs in CI on every pull request.
- [ ] No skipped or focused tests committed (`it.skip`, `it.only`).
- [ ] Async assertions use `findBy*`, not a fixed timeout.
- [ ] Mocks reset between tests.
- [ ] Every bug fixed this cycle has a regression test.

### Documentation

- [Jest](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Expo apps](https://docs.expo.dev/develop/unit-testing/)
