# Testing

How {{projectName}} is tested, and what level of test a given change needs.

## What to write, and when

| Change | Test |
| --- | --- |
| Pure function, formatter, reducer, validator | Unit test |
| Hook, service, data access | Unit test with the boundary mocked |
| Screen or component behaviour | Component test asserting what a user sees |
| A flow crossing several screens or systems | One end-to-end test |
| Bug fix | A test reproducing the bug, written before the fix |

Aim the effort at logic that can be wrong. A test asserting that a component
renders without crashing tells you almost nothing.

## Principles

- **Test behaviour, not implementation.** Assert what a caller observes. A test
  that breaks when you rename a private helper is testing the wrong thing.
- **Mock at boundaries only** — the network, the clock, the device, third-party
  SDKs. Mocking your own modules couples the test to the structure.
- **One reason to fail per test.** When it goes red, the name should tell you
  what broke without opening the file.
- **Deterministic.** No real network, no real time, no shared state between
  tests. A flaky test is worse than no test, because it trains people to ignore
  red.
- **Fixtures over literals.** Build test data with a factory that takes
  overrides, so each test states only what it cares about.

## Naming

```
it('returns the cached profile when offline', …)
it('surfaces a retryable error when the token has expired', …)
```

Name the scenario and the expected outcome. Not `it('works')`.

## Running

```bash
npm test
```

See `package.json` for watch and coverage variants.

## Coverage

Coverage measures what was executed, not what was verified — treat a drop as a
prompt to look, not as a target to hit. Untested error paths and edge cases
matter far more than the percentage.

## Before you push

```bash
npm run lint
npm run typecheck
npm test
```
