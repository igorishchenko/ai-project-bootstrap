# Jest

How to test {{projectName}}.

## Query like a user

```tsx
render(<Paywall />);
expect(await screen.findByText('Annual')).toBeVisible();
```

Prefer `getByText`, `getByLabelText`, `getByRole`. Reach for `getByTestId` only
when there is genuinely nothing user-visible to target — a suite built on test
ids passes happily while the screen is unusable with a screen reader.

## Async needs findBy

`getBy*` queries once and throws. `findBy*` retries until it appears. Almost
every intermittent failure in a React Native suite is a `getBy*` that should
have been a `findBy*`, or a hand-rolled `setTimeout` standing in for one.

## Mock at the boundary

Native modules and third-party SDKs get mocked in `jest.setup.js`. Where this
project wraps an SDK in a service, mock the service — that indirection exists
largely to make this possible.

Do **not** mock the project's own modules to get a test green. It ties the test
to today's structure, so a refactor that changes no behaviour turns the suite
red and teaches everyone to distrust it.

## When a new dependency breaks the whole suite

"Unexpected token 'export'" means a package ships untranspiled ESM and Jest is
ignoring it. Add it to `transformIgnorePatterns` in `jest.config.js` — this is
configuration, not a broken test, and it costs an hour if you go looking in the
wrong place.

## Fixing a bug

Write the failing test first, watch it fail for the right reason, then fix.
A bug fix without a regression test invites the bug back.

## Reporting

Run the suite and report the real result. If tests fail, say so with the
output — never describe work as done with a red suite.
