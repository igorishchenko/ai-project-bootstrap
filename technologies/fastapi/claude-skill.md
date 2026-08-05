# FastAPI

The Python API in {{projectName}}.

## The annotation is the validation

```python
class CreateUser(BaseModel):
    email: EmailStr
    display_name: str

@app.post("/users", status_code=201)
async def create_user(payload: CreateUser) -> UserOut:
    ...
```

Accepting `dict` or `Any` for a body throws away validation, the generated
documentation and the type checking simultaneously — the three reasons this
framework exists. If a payload is genuinely dynamic, model the dynamic part
explicitly rather than opting out entirely.

## Declare the response model

Returning an ORM object serialises whatever is on it. That is how password
hashes, internal flags and soft-delete columns end up in a public API.

Map to a response model. It is also the only way clients get accurate generated
types from the OpenAPI schema.

## Do not block the event loop

An `async def` handler that calls a synchronous database driver, or `requests`,
blocks *every* concurrent request — not just its own. It looks fine in
development with one user and falls over under load.

Use an async library, or declare the handler `def` so FastAPI runs it in a
threadpool. When adding a dependency, check which it is.

## Auth belongs in a dependency

```python
async def me(user: User = Depends(current_user)) -> UserOut:
```

A dependency is enforced by the framework. A check written inside each handler
is one somebody forgets on the next endpoint, and nothing catches it.

Never take a user id from the request body — derive it from the verified token.

## Settings fail at startup

One `Settings` object validated at import means a missing variable stops the
process immediately. `os.getenv` scattered through handlers means it fails on
the first request that reaches that line, in production, at an unhelpful moment.

## Note on this project

This is a Python service: it has no `package.json`, and its dependencies live in
`requirements.txt` or `pyproject.toml`. Commands like `npm test` do not apply to
it — run `pytest`, and say so plainly rather than reporting a JavaScript command
that was never run.
