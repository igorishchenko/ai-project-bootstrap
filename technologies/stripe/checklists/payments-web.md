# Stripe checklist

Payment bugs are expensive in a way that other bugs are not. Verify all of this
before taking real money.

## Trust boundary

- [ ] No amount, price or currency accepted from the client.
- [ ] Prices resolved server-side from an id.
- [ ] Secret key absent from every client bundle and public variable.
- [ ] Access granted only after the webhook, never on the success redirect.

## Webhooks

- [ ] Signature verified against the raw, unparsed body.
- [ ] Event ids recorded; duplicates ignored.
- [ ] `checkout.session.completed` handled.
- [ ] `customer.subscription.updated` and `.deleted` handled, so cancellations
      actually revoke access.
- [ ] Endpoint returns 2xx quickly; slow handlers cause retries.

## Money

- [ ] Amounts are integers in the smallest currency unit.
- [ ] Currency explicit on every charge.
- [ ] Refund path tested, not just payment.

## Environments

- [ ] Live keys in production, test keys everywhere else.
- [ ] Webhook endpoint and signing secret configured per environment.
- [ ] Test mode data not relied on in production.

## Tested

- [ ] Successful payment.
- [ ] Declined card (`4000 0000 0000 9995`).
- [ ] 3D Secure authentication (`4000 0025 0000 3155`).
- [ ] Subscription cancellation revokes access.
- [ ] Duplicate webhook delivery grants access once.
- [ ] Customer Portal opens and manages the subscription.

{{#if has.mobile}}## Mobile

- [ ] Not used for digital goods in an iOS or Android app — the stores reject it.
{{/if}}
