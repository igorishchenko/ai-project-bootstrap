### Overview

SendGrid sends transactional email, with dynamic templates edited in a dashboard
and detailed delivery analytics.

As with any email provider, the code is the easy part. **Sender authentication —
SPF, DKIM, DMARC — determines whether your mail arrives at all**, and no
application change compensates for missing DNS records.

### Sender authentication

1. **Settings → Sender Authentication → Authenticate Your Domain.**
2. Add the CNAME records SendGrid provides to your DNS.
3. Wait for verification.
4. Publish a DMARC record once SPF and DKIM pass: start at `p=none`, watch the
   aggregate reports, then tighten to `p=quarantine`.

Authenticate a dedicated subdomain — `mail.example.com` — so a deliverability
problem cannot damage your primary domain's reputation.

### Install

```bash
npm install @sendgrid/mail
```

Server-side only. The API key sends mail as your domain to any recipient.

### Sending

```ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  to: user.email,
  from: process.env.SENDGRID_FROM_EMAIL!,   // must be an authenticated sender
  subject: 'Reset your password',
  text: plainTextVersion,                   // always include this
  html: htmlVersion,
});
```

`from` must be a verified sender. Anything else is rejected outright.

### Dynamic templates

```ts
await sgMail.send({
  to: user.email,
  from: process.env.SENDGRID_FROM_EMAIL!,
  templateId: 'd-xxxxxxxx',
  dynamicTemplateData: { firstName: user.firstName, resetUrl },
});
```

Templates live in the dashboard, which means they are **not** in version
control and change without a deploy. Record template ids in your codebase and
treat a template edit as a production change — it is one.

### API key permissions

Create a **restricted** key with Mail Send only. A full-access key can read your
contacts, alter templates and change account settings; there is no reason for a
sending service to hold that.

### Idempotency

Sending cannot be undone. Any retryable path — a webhook, a queue consumer —
needs an idempotency guard, or one failure downstream mails a user repeatedly.

### Event webhook

Enable the Event Webhook for `bounce`, `dropped` and `spamreport`, and suppress
those addresses. Verify the signature; the endpoint is public.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| 403 on send | API key lacks Mail Send, or `from` is not authenticated |
| Mail goes to spam | Domain not authenticated, or no DMARC |
| Template renders with blanks | `dynamicTemplateData` keys do not match the template |
| Duplicates | Retryable path with no idempotency guard |
| Sudden delivery drop | Bounces not suppressed; reputation damaged |

### Common mistakes

- **Full-access API key.** Use a restricted, send-only key.
- **Key in a client app.** It sends as your domain to anyone.
- **HTML with no plain text.** Some filters penalise it.
- **Ignoring bounces.** Reputation degrades quietly, then all at once.
- **Forgetting templates are unversioned.** An edit ships instantly.

### Production checklist

- [ ] Domain authenticated with SPF and DKIM; DMARC published.
- [ ] Dedicated transactional subdomain.
- [ ] Restricted API key, Mail Send only, separate per environment.
- [ ] Event webhook handling bounces and spam reports, with suppression.
- [ ] Webhook signature verified.
- [ ] Idempotency on retryable send paths.
- [ ] Plain-text alternative on every message.
- [ ] Template ids recorded in the codebase.

### Documentation

- [SendGrid Node.js](https://github.com/sendgrid/sendgrid-nodejs)
- [Sender authentication](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication)
- [Dynamic templates](https://docs.sendgrid.com/ui/sending-email/how-to-send-an-email-with-dynamic-transactional-templates)
- [Event webhook](https://docs.sendgrid.com/for-developers/tracking-events/event)
