### Overview

A single-page React application built with Vite: fast dev server, fast builds,
and a plain static bundle at the end.

The defining constraint is that **there is no server**. Everything in the bundle
ships to the browser and can be read by anyone who opens devtools. That is fine
for a client talking to an API you control; it means any secret, any privileged
query, and any authorisation decision has to live somewhere else.

If you find yourself needing a server, that is a signal to reach for a framework
that has one rather than bolting it on.

### Install

```bash
npm create vite@latest . -- --template react-ts
npm install
```

### Running

```bash
npm run dev       # dev server with HMR
npm run build     # production bundle into dist/
npm run preview   # serve the built bundle locally
```

### Environment variables

Only variables prefixed `VITE_` are exposed, and they are **inlined into the
bundle**:

```ts
const apiUrl = import.meta.env.VITE_API_URL;
```

Every one is public. There is no server-side alternative here — a value that
must stay secret belongs behind an API.

### Structure

```
src/
  components/    shared UI
  features/      one folder per feature: views, hooks, services
  services/      API clients and business logic
  lib/           helpers, configured third-party clients
```

Group by feature, not by file type. Anything shared moves up on its third use.

### Routing

`react-router-dom` handles routes. Lazy-load route components so the initial
bundle stays small:

```tsx
const Settings = lazy(() => import('./features/settings/SettingsPage'));
```

Without this, a single-page app sends every screen to every visitor on first
load, including ones most of them never open.

### Data fetching

Fetching in `useEffect` gets you race conditions, double-fetching in StrictMode,
and no caching. Use a query library, or at minimum cancel in-flight requests on
unmount and key the cache explicitly.

### Build output

`npm run build` writes static files to `dist/`. They can be served by any static
host or CDN — which is the payoff for having no server.

Configure your host to serve `index.html` for unknown paths, or deep links 404
on refresh.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Env var is `undefined` | Missing `VITE_` prefix, or the dev server was not restarted |
| 404 on refresh of a nested route | Host not falling back to `index.html` |
| Effect runs twice in development | React StrictMode, on purpose. Make effects idempotent |
| Huge initial bundle | Routes not lazy-loaded |
| Works in dev, breaks in the build | Something depended on the dev server. Test `npm run preview` |

### Common mistakes

- **Putting a secret in a `VITE_` variable.** It is in the bundle, permanently.
- **Authorising in the client.** Hiding a button is presentation, not security —
  the API must enforce it.
- **Fetching in `useEffect` without cancellation.** Races and leaks.
- **No lazy loading.** Every visitor downloads every screen.
- **Only testing the dev server.** Build and preview before shipping.

### Production checklist

- [ ] No secret in any `VITE_*` variable.
- [ ] Every permission enforced by the API, not just hidden in the UI.
- [ ] Routes lazy-loaded; initial bundle size checked.
- [ ] Host configured to fall back to `index.html`.
- [ ] `npm run build` and `npm run preview` verified, not just `dev`.
- [ ] Source maps either not published or restricted.

### Documentation

- [React](https://react.dev/)
- [Vite](https://vite.dev/guide/)
- [Vite env variables](https://vite.dev/guide/env-and-mode)
- [React Router](https://reactrouter.com/)
