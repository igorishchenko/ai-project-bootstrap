# React (Vite) environment

Only `VITE_*` variables are exposed to the app, and Vite **inlines them into the
bundle** at build time. Every one is public — there is no server here to keep
anything private.

A value that must stay secret belongs behind an API you control.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `VITE_API_URL` | Yes | Base URL of the API this app calls. | `https://api.<your-domain>` |
| `VITE_APP_ENV` | No | Environment label used for diagnostics and feature gating. | `development` |
