# React (Vite)

Building {{projectName}} as a single-page app.

## There is no server

Everything in this project ships to the browser. Open devtools, read the bundle,
see all of it — including every `VITE_*` variable, which Vite inlines at build
time.

Two consequences that come up constantly:

**Secrets have nowhere to live here.** If a task needs an API key that must stay
private, it belongs behind an API you control. Say so rather than putting it in
a `VITE_` variable — once built and deployed, it is public to everyone who
loaded the page.

**The UI cannot enforce permissions.** Hiding an admin button is presentation.
Anyone can call the endpoint directly. If asked to "restrict this to admins",
the answer includes a server-side check; the client change alone is not the
feature.

## Effects

Under StrictMode, effects run twice in development. That is intentional — it
surfaces missing cleanup. Make effects idempotent and cancel in-flight work on
unmount rather than disabling StrictMode.

Avoid hand-rolled `useEffect` fetching. It gives you races, double-fetches and
no caching. Use a query library, or at minimum an abort signal.

## Lazy-load routes

```tsx
const Settings = lazy(() => import('./features/settings/SettingsPage'));
```

Without it, a visitor who only opens the login page downloads the entire
application. This is the single biggest performance lever in an SPA.

## Where code goes

Feature folders, with API calls in `src/services/`. Components ask a service;
they do not call `fetch` directly. That is what makes them testable without a
network.

## Verifying

`npm run dev` is not enough — the production build behaves differently, and
build-only failures are common. Run `npm run build` and `npm run preview`, and
report what actually happened.
