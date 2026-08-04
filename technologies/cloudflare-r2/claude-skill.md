# Cloudflare R2

Object storage in {{projectName}}.

## There is no client-safe R2 key

R2 credentials are account-scoped: whoever holds them can read, write and delete
across the bucket. They belong on a server, full stop.

If a task asks you to upload directly from the app "to avoid a round trip", the
answer is a presigned URL from your backend — not an embedded key. Say so
plainly; no configuration makes a shipped credential safe.

## The backend owns the object key

```ts
const key = `${userId}/${crypto.randomUUID()}`;
```

Never sign a key the client supplied. A client that names its own key can write
to `otherUser/avatar.png` and overwrite someone else's file — and because the
upload is legitimate, nothing looks wrong until the damage is reported.

Namespace by owner, generate the rest server-side.

## A presigned URL is a capability

Once issued, anyone holding it can perform that operation until it expires. So
validate content type and size **before** signing, not after the upload lands,
and keep `expiresIn` as short as the flow allows.

## Store the key, not the URL

Presigned URLs expire. A stored one turns into a broken asset with no obvious
cause. Persist the key and mint URLs on demand.

## Two details that cost real money

- `region: 'auto'` — R2 ignores regions but the SDK insists on the field, and
  the resulting `SignatureDoesNotMatch` points nowhere useful.
- Add a lifecycle rule expiring incomplete multipart uploads. They do not show
  in a bucket listing and you are billed for them indefinitely.

## Deletion

Deleting a user deletes their objects. Otherwise their files persist — a
compliance problem, and storage you pay for forever.
