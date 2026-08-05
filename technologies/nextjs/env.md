# Next.js environment

The `NEXT_PUBLIC_` prefix is the security boundary. Prefixed values are **inlined
into the JavaScript bundle** every visitor downloads; everything else stays on
the server.

Never add the prefix to make a value reachable from a client component. If it is
secret, move the code that reads it to the server.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of this deployment, used for absolute links and redirects. | `https://<your-domain>` |
| `NEXT_PUBLIC_API_URL` | No | Base URL of an external API called from the browser. | `https://api.<your-domain>` |
| `NODE_ENV` | No | Set by Next.js. Do not override it manually. | `development` |
