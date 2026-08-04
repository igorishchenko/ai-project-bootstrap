### Overview

Resend sends transactional email — password resets, receipts, notifications —
with templates written as React components and a straightforward delivery
webhook.

Most of the work in email is not the sending. It is **domain authentication**:
without SPF, DKIM and DMARC configured, your mail goes to spam or is rejected
outright, and no amount of code fixes it.

### Domain setup

1. Add your domain at [resend.com/domains](https://resend.com/domains).
2. Add the DNS records it shows — SPF, DKIM, and a return-path record.
3. Wait for verification. This takes minutes to hours depending on your DNS.
4. Add a DMARC record once SPF and DKIM pass:
   `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`, tightening to
   `p=quarantine` after you have watched the reports for a while.

Send from a subdomain you use only for transactional mail — `mail.example.com`.
A deliverability problem then cannot damage your primary domain's reputation.

### Install

```bash
npm install resend
```

Server-side only. The API key sends mail as your domain to anyone.

### Sending

```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: '{{projectName}} <noreply@mail.example.com>',
  to: user.email,
  subject: 'Reset your password',
  react: <ResetPasswordEmail resetUrl={url} />,
});

if (error) throw new Error(`Email failed: ${error.message}`);
```

Like several SDKs in this stack, it returns `{ data, error }` rather than
throwing — an unchecked `error` looks exactly like a successful send.

### Idempotency

Sending is a side effect that cannot be undone. Guard anything triggered by a
retryable path — a webhook, a queue consumer — with an idempotency key or a
sent-record in your database, or a retry storm emails a user twenty times.

### Webhooks

Subscribe to `email.bounced` and `email.complained`, and **stop sending to those
addresses**. Continuing to send to bounces destroys your sender reputation, and
recovering it takes far longer than it took to lose.

Verify the webhook signature; the endpoint is public.

### Templates

React Email components live in `emails/`. Keep them simple: mail clients support
a fraction of modern CSS, and Outlook renders with Word. Tables and inline
styles still win.

Always provide a plain-text alternative.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Everything lands in spam | Domain not verified, or no DMARC. Check SPF and DKIM first |
| "Domain not verified" | DNS records missing or not yet propagated |
| Works in test, fails live | Test mode only sends to your own address |
| Users get duplicates | A retryable path with no idempotency guard |
| Layout broken in Outlook | Unsupported CSS. Use tables and inline styles |

### Common mistakes

- **Shipping the API key in a client.** It can send as your domain to anyone.
- **Sending from your primary domain.** A bad campaign harms everything.
- **Ignoring bounces.** Reputation damage compounds quietly.
- **No idempotency on retryable sends.** Users receive the same mail repeatedly.
- **HTML only.** Some clients and filters want plain text.

### Production checklist

- [ ] Domain verified with SPF and DKIM; DMARC published.
- [ ] Sending from a dedicated transactional subdomain.
- [ ] API key server-side only, separate per environment.
- [ ] Bounce and complaint webhooks handled, with suppression.
- [ ] Webhook signatures verified.
- [ ] Idempotency on every retryable send path.
- [ ] Plain-text alternative for every template.
- [ ] Unsubscribe handling for anything not strictly transactional.

### Documentation

- [Resend docs](https://resend.com/docs)
- [Domain verification](https://resend.com/docs/dashboard/domains/introduction)
- [React Email](https://react.email/docs/introduction)
- [Webhooks](https://resend.com/docs/dashboard/webhooks/introduction)
