### Overview

FastAPI is a Python web framework where the type annotations *are* the
validation. A Pydantic model on a request body means the request is parsed,
validated and documented from one declaration — and rejected with a useful 422
before your handler runs.

This is a Python service. It has no `package.json`, and its dependencies are
managed separately from the JavaScript side of this project.

### Requirements

| Tool | Version |
| --- | --- |
| Python | 3.11 or newer |
| uv or pip | latest |

### Install

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install "fastapi[standard]" uvicorn pydantic-settings
pip freeze > requirements.txt
```

Commit `requirements.txt` (or `pyproject.toml`). An environment that only exists
on your machine is not reproducible, and CI will not match it.

### Running

```bash
fastapi dev app/main.py     # reload enabled
fastapi run app/main.py     # production
```

Interactive documentation is generated at `/docs`, and the OpenAPI schema at
`/openapi.json` — which is what lets clients generate typed API bindings.

### Validation is the type annotation

```python
from pydantic import BaseModel, EmailStr

class CreateUser(BaseModel):
    email: EmailStr
    display_name: str

@app.post("/users", status_code=201)
async def create_user(payload: CreateUser) -> UserOut:
    ...
```

Never accept `dict` or `Any` for a request body. That discards the validation,
the documentation and the type safety in one go — the three reasons to use this
framework.

Declare a response model too, or internal fields leak into responses. A model
returning the whole database row is how password hashes end up in an API.

### Configuration

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str

settings = Settings()   # fails at startup if something is missing
```

Failing loudly at boot beats discovering a missing variable when the first
request touches that code path.

### Async

Handlers declared `async def` must not perform blocking work — a synchronous
database driver or `requests` call blocks the event loop and stalls every other
request. Use async libraries, or declare the handler `def` and let FastAPI run
it in a threadpool.

### Authentication

Use dependencies for auth so it is declarative and testable:

```python
@app.get("/me")
async def me(user: User = Depends(current_user)) -> UserOut:
    ...
```

A dependency that raises 401 is enforced by the framework, rather than being a
check somebody might forget to write.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| 422 on a valid-looking request | The model rejected it; the response body says which field |
| Requests queue under load | Blocking call in an `async def` handler |
| Works locally, fails deployed | Missing environment variable — settings should fail at startup |
| CORS errors from the browser | `CORSMiddleware` not configured for that origin |
| Fields missing from the response | Response model excludes them, correctly |

### Common mistakes

- **`dict` request bodies.** Discards validation and documentation.
- **No response model.** Internal fields leak to clients.
- **Blocking calls in async handlers.** Stalls the whole server.
- **Secrets read with `os.getenv` scattered around.** Centralise in settings.
- **`allow_origins=["*"]` with credentials.** Browsers reject it, and it is
  wrong anyway.

### Production checklist

- [ ] Dependencies pinned in a committed file.
- [ ] Settings validated at startup; no bare `os.getenv` in handlers.
- [ ] Every endpoint has a request and response model.
- [ ] CORS restricted to known origins.
- [ ] Auth enforced by dependency, not per-handler checks.
- [ ] No blocking I/O in async handlers.
- [ ] `/docs` disabled or protected in production if the API is not public.
- [ ] Structured logging with no secrets or personal data.

### Documentation

- [FastAPI](https://fastapi.tiangolo.com/)
- [Pydantic](https://docs.pydantic.dev/)
- [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Deployment](https://fastapi.tiangolo.com/deployment/)
