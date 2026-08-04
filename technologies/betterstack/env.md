# Better Stack environment

The source token authorises writing logs for your account. Server-side only —
shipping it lets anyone flood your log stream and your bill.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `BETTERSTACK_SOURCE_TOKEN` | Yes | Log source token. Server-side only. | `xxxxxxxx` |
| `BETTERSTACK_INGESTING_HOST` | No | Region-specific ingest host, if your source specifies one. | `https://in.logs.betterstack.com` |
| `HEALTHCHECK_PATH` | No | Path the uptime monitor calls. Must verify real dependencies. | `/health` |
