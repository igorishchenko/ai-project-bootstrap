Payment state flows from Stripe to your server, never from the browser.

```mermaid
sequenceDiagram
  participant User
  participant App
  participant API as Your server
  participant Stripe

  User->>App: Choose a plan
  App->>API: priceId (never an amount)
  API->>Stripe: create Checkout Session
  Stripe-->>User: hosted payment page
  User->>Stripe: pays
  Stripe->>API: webhook (signed)
  API->>API: verify, dedupe by event id
  API->>API: grant access
  Stripe-->>User: redirect to success page
```

The redirect and the webhook are independent. The user reaching `/success`
proves only that they loaded a URL — anyone can do that. Access is granted on
the webhook.

### Why idempotency is mandatory

```mermaid
flowchart LR
  stripe["Stripe"] -->|deliver| api["Webhook endpoint"]
  api -->|timeout / 500| retry["Retried"]
  retry --> api
  api --> seen{"Event id already processed?"}
  seen -->|yes| ignore["Ignore"]
  seen -->|no| grant["Grant access once"]
```

Delivery is at-least-once by design. Without the check, an ordinary retry —
which happens whenever your endpoint is briefly slow — grants access twice.
