# FastAPI environment

Every value here is server-side. They are read once at startup through a
`Settings` object, so a missing one stops the process immediately rather than
failing on the first request that happens to need it.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | Connection string. Full read and write access — never in a client. | `postgresql://user:pass@host:5432/<db>` |
| `SECRET_KEY` | Yes | Signs tokens and sessions. Rotating it invalidates every existing session. | `<generate-with-openssl-rand-hex-32>` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated origins allowed by CORS. Never `*` alongside credentials. | `https://<your-domain>` |
| `LOG_LEVEL` | No | Logging verbosity. | `info` |
