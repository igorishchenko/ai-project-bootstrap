# Resend environment

The API key sends email as your verified domain to any recipient. Server-side
only, and separate keys per environment so a staging bug cannot mail real users.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | Yes | Sends email. Never ship in the app. | `re_xxxxxxxx` |
| `RESEND_FROM_EMAIL` | Yes | Verified sender. Use a dedicated transactional subdomain. | `noreply@mail.example.com` |
| `RESEND_WEBHOOK_SECRET` | No | Verifies bounce and complaint webhooks. The endpoint is public. | `whsec_xxxxxxxx` |
