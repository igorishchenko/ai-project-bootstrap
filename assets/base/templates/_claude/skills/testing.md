# Testing

What to write, at which level, and how to make it hold up.

## Choosing the level

| You changed | Write |
| --- | --- |
| A pure function, reducer, formatter, validator | Unit test |
| A hook or service | Unit test with the boundary mocked |
| What a user sees or clicks | Component test |
| A flow across screens or systems | One end-to-end test |
| A bug | The failing test first, then the fix |

Spend the effort where logic can be wrong. Asserting that a component renders
proves almost nothing.

## Anatomy

```ts
it('surfaces a retryable error when the token has expired', async () => {
  const client = makeClient({ tokenExpired: true });

  const result = await loadProfile(client);

  expect(result).toEqual({ status: 'error', retryable: true });
});
```

Arrange the smallest state that makes the scenario true, act once, assert what
a caller observes.

## Mocking

Mock the network, storage, the clock, device APIs and third-party SDKs. Do not
mock your own modules — that couples the test to today's file layout, and it
will break on a refactor that changed no behaviour.

Where the project wraps an SDK, mock the wrapper. That is a large part of why
the wrapper exists.

## Test data

```ts
const user = makeUser({ subscriptionStatus: 'expired' });
```

A factory with overrides keeps each test focused on the one field it cares
about. Repeated inline literals hide that.

## Determinism

- Freeze time rather than asserting on `Date.now()`.
- No real network. No sleeping to wait for something — await it.
- No state shared between tests; each sets up what it needs.

A flaky test is worse than no test: it teaches everyone to ignore a red build.

## Before reporting a task done

```bash
npm run lint
npm run typecheck
{{#if has.testing}}npm test
{{/if}}npm run format:check
```

If any of these fail, say so with the output. Do not describe work as complete
with a failing suite.
{{#unless has.testing}}
This project has no test runner configured — there is no `test` script in
`package.json`. Do not invent one, and do not report a change as tested. If a
change needs a test, say that a runner has to be installed first;
`docs/testing.md` says how.
{{/unless}}
