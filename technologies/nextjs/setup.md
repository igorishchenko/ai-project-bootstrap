### Overview

Next.js is React with a server attached. Routing comes from the file system,
and — the part that changes how you write code — components render on the
server by default.

That default is the thing to internalise. A Server Component runs on the server
only: it can read the database and use secrets, and it ships **no JavaScript** to
the browser. A Client Component (`'use client'`) runs in both places. Most
confusion, and most accidental secret leaks, come from not being sure which one
a file is.

### Install

```bash
npm install next react react-dom
npm install -D @types/react @types/react-dom
```

### Running

```bash
npm run dev     # development server
npm run build   # production build
npm start       # serve the production build
```

### Server and Client Components

```tsx
// app/dashboard/page.tsx — Server Component by default
export default async function Dashboard() {
  const rows = await db.query('select id, name from projects');  // safe here
  return <ProjectList rows={rows} />;
}
```

```tsx
'use client';   // only where you need interactivity

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

Push `'use client'` as far down the tree as you can. Marking a layout as a
Client Component turns everything inside it into client code, which is how
bundles quietly triple in size.

### Environment variables

| Prefix | Where it is available |
| --- | --- |
| `NEXT_PUBLIC_*` | Server **and browser** — inlined into the bundle |
| everything else | Server only |

A non-prefixed variable read in a Client Component is `undefined`, which people
"fix" by adding `NEXT_PUBLIC_` — and that publishes the secret to every visitor.
If a value is secret, the code that reads it belongs on the server.

### Data fetching and caching

```tsx
const data = await fetch(url, { next: { revalidate: 60 } });   // cache 60s
const live = await fetch(url, { cache: 'no-store' });          // never cache
```

Caching is the most common source of "why is this stale?". Be explicit about it
rather than discovering the default the hard way, and remember that a route
using cookies or headers opts out of static rendering entirely.

### Route handlers and Server Actions

Route handlers (`app/api/*/route.ts`) are ordinary HTTP endpoints. Server Actions
are functions that run on the server when called from the client.

Both are **public entry points**. `'use server'` does not mean "only my code can
call this" — it means "this executes on the server". Validate the input and check
authorisation inside every one, exactly as you would for a REST endpoint.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "useState only works in a Client Component" | Add `'use client'`, or move the state down |
| Env var is `undefined` in the browser | Not prefixed `NEXT_PUBLIC_` — and if it is secret, keep it server-side |
| Stale data after a deploy | Route was statically rendered. Set `revalidate` or `no-store` |
| Hydration mismatch | Rendering `Date.now()`, `Math.random()` or browser-only state during SSR |
| Huge client bundle | `'use client'` too high in the tree |

### Common mistakes

- **Adding `NEXT_PUBLIC_` to silence an undefined variable.** That ships the
  secret to every visitor.
- **`'use client'` on a layout.** Everything below it becomes client code.
- **Trusting Server Action input.** They are public endpoints; validate and
  authorise.
- **Ignoring caching until production.** Decide per route, deliberately.
- **Importing a server-only module into a client component.** Mark it with
  `import 'server-only'` so the mistake is a build error, not a leak.

### Production checklist

- [ ] No secret in a `NEXT_PUBLIC_*` variable.
- [ ] Server-only modules marked with `import 'server-only'`.
- [ ] Every route handler and Server Action validates input and checks
      authorisation.
- [ ] Caching decided per route, not inherited by accident.
- [ ] Images served through `next/image` with explicit sizes.
- [ ] Security headers configured in `next.config.ts`.
- [ ] `npm run build` clean — no type errors suppressed.

### Documentation

- [Next.js](https://nextjs.org/docs)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
