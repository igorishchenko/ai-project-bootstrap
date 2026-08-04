Subscription state lives on RevenueCat's servers, not on the device. The app
asks for the current entitlements; it never computes them.

```mermaid
sequenceDiagram
  participant User
  participant App
  participant RC as RevenueCat
  participant Store as App Store / Play

  User->>App: Tap "Subscribe"
  App->>RC: getOfferings()
  RC-->>App: packages to display
  User->>App: Choose a package
  App->>RC: purchasePackage(pkg)
  RC->>Store: native purchase sheet
  Store-->>RC: receipt
  RC->>RC: validate, update entitlements
  RC-->>App: customerInfo
  App->>App: unlock if entitlements.active['pro']
```

### Why the indirection

Receipt validation, cross-platform state, renewals and refunds are all handled
server-side by RevenueCat. Renewals and cancellations arrive later, via store
webhooks, without the app being open — which is why the device cannot be the
source of truth for access.

```mermaid
flowchart LR
  store["Store webhook"] --> rc["RevenueCat"]
  rc --> backend["Your backend (optional)"]
  app["App on launch/foreground"] --> rc
```

### In this project

- `src/services/payments/` owns every call to the SDK.
- `src/hooks/payments/` exposes entitlement state to the UI.
- `src/features/subscriptions/` holds the paywall and management screens.

Nothing outside `services/payments/` imports `react-native-purchases`.
