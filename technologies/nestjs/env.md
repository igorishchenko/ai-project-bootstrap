# NestJS environment

Server-side only. Validate these at boot through `ConfigModule.forRoot({
validationSchema })`, so a missing value stops startup rather than failing on
the first request that reaches it.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `PORT` | No | Port the server listens on. | `3000` |
| `DATABASE_URL` | Yes | Connection string. Full access — never in a client. | `postgresql://user:pass@host:5432/<db>` |
| `JWT_SECRET` | Yes | Signs and verifies access tokens. Rotating it invalidates every session. | `<generate-with-openssl-rand-hex-32>` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated CORS origins. Never `*` with credentials. | `https://<your-domain>` |
