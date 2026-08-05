# Next.js

Building {{projectName}} on Next.js.

## Know which side a file runs on

Server Component (the default) runs only on the server: it can query the
database, read secrets, and ships no JavaScript. Client Component (`'use client'`)
runs in the browser too.

Before writing any component, decide which it is. Nearly every Next.js bug worth
having comes from getting this wrong — either a secret crossing to the client, or
a bundle that grew because `'use client'` sat too high in the tree.

Push `'use client'` down to the smallest interactive leaf. On a layout it makes
everything beneath it client code.

## The `NEXT_PUBLIC_` trap

A server-only variable read in a Client Component is `undefined`. The tempting
fix is to add `NEXT_PUBLIC_` — and that inlines the value into the JavaScript
every visitor downloads.

If the value is a secret, that is a leak, and it is permanent for anyone who
already loaded the page. The correct fix is to move the code that reads it to
the server and pass down only the result.

When asked to make a key "available in the component", check whether it is
secret before reaching for the prefix, and say so if it is.

## Server Actions are public endpoints

```ts
'use server';
export async function deleteProject(id: string) { ... }
```

`'use server'` means "executes on the server", **not** "only callable from my
UI". Anyone can invoke it with a crafted request. Validate the input and check
that this user may perform the action — inside the action itself, not in the
component that calls it.

Same for route handlers.

## Caching is explicit or it surprises you

```ts
fetch(url, { next: { revalidate: 60 } })   // cached, revalidated
fetch(url, { cache: 'no-store' })          // always fresh
```

Stale-data reports almost always trace back to a route that was statically
rendered without anyone deciding it should be. State the caching intent per
route.

## Verifying

`npm run build` catches what `dev` does not — server/client boundary violations
and type errors in particular. Run it before calling a change done, and report
the real output.
