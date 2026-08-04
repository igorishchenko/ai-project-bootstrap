# Create an API endpoint

> Replace the bracketed parts, delete what does not apply, then send.

Add an endpoint to {{projectName}}: **[METHOD] [path]**.

## Contract

- **Request**: [body / params, and which fields are required]
- **Response**: [shape on success]
- **Status codes**: [200/201, and every error case you expect]

## Rules

- Validate the request at the boundary — parse it into a typed value, do not
  cast it.
- Authorisation: [who may call this, and what happens when they may not]
- Errors return a useful message and a stable code; internal detail stays in
  the error reporter, not in the response body.
- [Rate limiting / idempotency, if this mutates anything]

## Data

- Reads/writes: [tables or collections]
- [Any migration this needs]

## Tests

- Happy path.
- Each validation failure.
- Unauthorised access.
- [Domain-specific edge case]

## When you are done

Run lint, typecheck and tests, and report the actual output.
