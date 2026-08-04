# Write tests

> Replace the bracketed parts, delete what does not apply, then send.

Add tests for **[file, module or feature]** in {{projectName}}.

## Read first

`docs/testing.md` and `.claude/skills/testing.md` — they define the level of
test each kind of change needs, and what this project mocks.

## Cover

- The main behaviour, for each meaningful input.
- Boundaries: empty, one, many; zero, negative, maximum.
- Every error path, including what the caller observes.
- [Domain-specific case that has broken before]

## Rules

- Assert observable behaviour, not internal calls.
- Mock only at boundaries — network, storage, clock, device, third-party SDKs.
- Each test fails for one reason, and its name says which.
- Build test data with a factory plus overrides.
- No real network, no real time, no shared state between tests.

## Do not

- Do not add snapshot tests nobody will read.
- Do not test the framework or the library — test our use of it.
- Do not change the implementation to make it easier to test without telling me
  first.

## When you are done

Run the suite and report the real result, including anything that fails.
