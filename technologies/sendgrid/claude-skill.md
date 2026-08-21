# SendGrid

Transactional email in {{projectName}}.

## Sending is irreversible

An email that should not have gone out cannot be recalled. So any path that can
be retried — a webhook handler, a queue consumer, a job runner — needs an
idempotency guard: a key, or a sent-record checked first. Retries happen exactly
when something else is already broken, which is the worst moment to also mail
someone five times.

## Restricted API key

Create a key with **Mail Send only**. A full-access key can read your contact
lists, rewrite templates and change account settings — none of which a sending
service needs. And it is server-side: never in the app, never in an
`{{envPrefix}}*` variable.

## Templates are outside version control

Dynamic templates live in the SendGrid dashboard. They change without a deploy,
have no review, and no history you can diff. Two consequences:

- Record template ids in the codebase so they are greppable.
- Treat a template edit as a production change, because it is one.

Mismatched `dynamicTemplateData` keys render as blanks rather than errors, so a
renamed field silently ships an email with a missing name.

## Deliverability is DNS, not code

Mail going to spam is almost always SPF, DKIM or DMARC. Check sender
authentication before changing anything in the application.

Handle bounces and spam reports from the Event Webhook and suppress those
addresses — continuing to send to dead addresses is what degrades sender
reputation, quietly and then all at once.

## Never put secrets in the body

No tokens, passwords or session ids. Mail sits unencrypted on servers you do not
control and gets forwarded. Send a short-lived, single-use link instead.

Always include a plain-text alternative; some filters penalise HTML-only mail.
