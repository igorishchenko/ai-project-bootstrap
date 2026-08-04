# SendGrid environment

Use a **restricted** API key with Mail Send permission only — a full-access key
can read contacts and change account settings. Server-side only, and separate
per environment so a staging bug cannot mail real users.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `SENDGRID_API_KEY` | Yes | Restricted key, Mail Send only. Never ship in the app. | `SG.xxxxxxxx` |
| `SENDGRID_FROM_EMAIL` | Yes | Authenticated sender address. Unauthenticated senders are rejected. | `noreply@mail.example.com` |
| `SENDGRID_WEBHOOK_KEY` | No | Verifies Event Webhook signatures. The endpoint is public. | `xxxxxxxx` |
