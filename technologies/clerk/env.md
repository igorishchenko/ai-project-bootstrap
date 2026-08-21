# Clerk environment

The publishable key is designed to ship in the app. The secret key can read and
modify every user in your instance — it belongs on a server or in CI secrets,
never in an `{{envPrefix}}*` variable.

Development and production are separate Clerk applications with separate keys.
A development key in a production build puts real users in your test pool.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `{{envPrefix}}CLERK_PUBLISHABLE_KEY` | Yes | Publishable key for this environment's Clerk instance. | `pk_test_xxxxxxxx` |
| `CLERK_SECRET_KEY` | No | Server-side key for backend verification and the admin API. Never ship in the app. | `sk_test_xxxxxxxx` |
| `CLERK_WEBHOOK_SECRET` | No | Verifies incoming webhooks, including `user.deleted`. Server-side only. | `whsec_xxxxxxxx` |
