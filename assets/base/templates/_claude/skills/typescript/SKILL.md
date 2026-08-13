---
name: typescript
description: "How to type code in {{projectName}} so the compiler catches what tests would not: strictness, validation at the edges, nullability, modules and async. Read before writing or changing any .ts/.tsx file."
paths: ["**/*.ts", "**/*.tsx"]
---

# TypeScript

How to type code in {{projectName}} so the compiler catches what tests would
not.

## Strictness

`strict` is on and stays on. If a change does not compile, fix the code — do
not relax a compiler option, add `// @ts-expect-error`, or widen a type to make
the error go away. A type error is nearly always a real disagreement about what
a value can be.

Never `any`. At a boundary where the type is genuinely not known, use `unknown`
and narrow it with a type guard, so the narrowing happens once, in a place
someone can find.

## Make impossible states unrepresentable

```ts
// No: four booleans describing three real states, and 13 combinations that
// should never happen but compile fine.
type State = { loading?: boolean; data?: User; error?: Error };

// Yes: the compiler now rejects "loading with an error".
type State =
  | { status: 'loading' }
  | { status: 'ready'; user: User }
  | { status: 'failed'; error: Error };
```

Reach for a discriminated union whenever a set of optional properties is really
describing a handful of distinct states. It removes an entire class of "this
should not be possible" bug, and it makes the `switch` exhaustive.

## Validation at the edges

Anything arriving from outside the process — an API response, storage, a deep
link, `process.env` — is `unknown` until it is validated. A cast is an
assertion, not a check:

```ts
// No: the compiler believes you; the runtime does not.
const user = (await response.json()) as User;

// Yes: a wrong shape fails here, not three screens later.
const user = userSchema.parse(await response.json());
```

Validate once, at the boundary, and let the rest of the code trust the type.
Re-checking the same value deeper in the call stack means the boundary is not
doing its job.

## Nullability

- `undefined` means "absent", `null` means "explicitly empty". Pick one per
  field and stay consistent about which your code produces.
- `?.` and `??` are for genuinely optional values. Using them to quiet a value
  that should always exist hides the bug and spreads it: assert at the boundary
  instead, and keep the rest of the code honest.

## Signatures

- Annotate the return type of exported functions; let local helpers infer. An
  annotated public signature cannot change silently during a refactor.
- `readonly` for anything not meant to be mutated, arrays included.
- Prefer a named type over an inline object literal repeated in three
  signatures — when it changes, you want one place to edit.

## Modules

- Named exports. A default export is renamed at the import site, which makes
  the rename invisible in review.
- `import type { … }` for type-only imports.
- No barrel file re-exporting a whole feature: it defeats tree-shaking and
  invites import cycles.

## Async

- `async`/`await`, not raw `.then()` chains.
- Every `await` that can reject is either caught here or deliberately allowed
  to propagate. Decide which, and make the choice visible.
- `Promise.all` for independent work; sequential `await` only when the second
  call genuinely needs the first one's result.

## Watch for

- A cast (`as`) doing the work validation should be doing.
- A non-null assertion (`!`) standing in for a check.
- An optional property added because one caller does not have the value —
  usually that caller wants a different type, not a looser shared one.
- A type duplicated by hand instead of derived (`ReturnType`, `Pick`, indexed
  access) from the thing it must stay in step with.
