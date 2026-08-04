# Resend

Transactional email in {{projectName}}.

## Sending cannot be undone

That single property drives most of the rules. An email that should not have
gone out is in someone's inbox permanently — there is no delete, no rollback.

So **every retryable path needs an idempotency guard**: a key, or a sent-record
in your database checked before sending. A webhook handler or queue consumer
without one emails the user once per retry, and retries are exactly what happens
when something else is broken.

## Server-side only

The API key sends mail as your domain to any address. It belongs on a server. If
asked to send email directly from the app, say why the key cannot ship and
propose an endpoint.

## Check the error

```ts
const { data, error } = await resend.emails.send({ ... });
if (error) throw new Error(`Email failed: ${error.message}`);
```

Returns `{ data, error }`, does not throw. Unchecked, a failed send looks
exactly like a successful one — and nobody notices until a user asks why they
never got their password reset.

## Deliverability is configuration, not code

If mail is landing in spam, the cause is almost always SPF, DKIM or DMARC — not
the sending code. Check domain verification before changing anything in the
application.

Handle `email.bounced` and `email.complained` and stop sending to those
addresses. Reputation damage from repeatedly mailing dead addresses takes far
longer to repair than to cause.

## Never put secrets in the body

No tokens, passwords or session ids in an email. Mail is stored unencrypted on
servers you do not control and forwarded freely. Send a short-lived, single-use
link and validate it server-side.

## Templates

Mail clients support a fraction of modern CSS and Outlook renders with Word.
Tables and inline styles. Always include a plain-text alternative — some
filters penalise HTML-only mail.
