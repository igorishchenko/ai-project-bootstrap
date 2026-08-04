### Overview

R2 is S3-compatible object storage with no egress fees, which makes it a good
fit for anything read far more often than it is written — images, video,
downloads.

Because it is S3-compatible you use the AWS SDK, and that brings the critical
constraint: **R2 credentials are account-level and must never reach a client.**
Uploads and downloads from an app go through presigned URLs minted by your
backend. There is no client-safe R2 key.

### Create a bucket

1. **R2 → Create bucket** in the Cloudflare dashboard.
2. Choose a location hint near your users.
3. **R2 → Manage API Tokens** → create a token scoped to that bucket, with only
   the permissions you need. Copy the access key id, secret and account id — the
   secret is shown once.
4. Leave public access **off** unless the bucket genuinely holds public assets.
   Serve public content through a custom domain with Cloudflare caching instead
   of exposing the bucket.

### Install

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Server-side only.

### Client

```ts
import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

`region: 'auto'` is required — R2 ignores regions, but the SDK demands one.

### Presigned uploads

The app asks your backend for a URL, then uploads directly to R2:

```ts
// backend
const url = await getSignedUrl(
  r2,
  new PutObjectCommand({ Bucket, Key: `${userId}/${fileId}`, ContentType }),
  { expiresIn: 600 },
);
```

```ts
// app
await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': type } });
```

The backend decides the key. Never let a client choose its own object key — that
is how one user overwrites another's file. Namespace by user id and generate the
rest.

Constrain `ContentType` and check size server-side before signing. The presigned
URL is a capability: once issued, whoever holds it can upload.

### Presigned downloads

```ts
const url = await getSignedUrl(r2, new GetObjectCommand({ Bucket, Key }), {
  expiresIn: 3600,
});
```

Store the **key** in your database, not the URL.

### Lifecycle rules

Set a lifecycle rule to expire incomplete multipart uploads. Without one they
accumulate invisibly and you are billed for storage you cannot see in the
bucket listing.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `SignatureDoesNotMatch` | Wrong secret, or `region` not `'auto'` |
| Presigned upload rejected | `Content-Type` sent differs from the one signed |
| 403 on download | URL expired, or the token lacks read on that bucket |
| Works locally, fails deployed | Credentials missing from the deployment environment |
| Storage cost with an empty-looking bucket | Orphaned multipart uploads. Add a lifecycle rule |

### Common mistakes

- **Credentials in the app.** They are account-scoped; there is no safe client key.
- **Client-chosen object keys.** Enables overwriting other users' files.
- **Not validating type and size before signing.** The URL is a capability.
- **Storing presigned URLs.** They expire; store the key.
- **Making a bucket public for convenience.** Use a custom domain instead.

### Production checklist

- [ ] No R2 credential in any client application or `EXPO_PUBLIC_*` variable.
- [ ] API token scoped to one bucket with least privilege.
- [ ] Object keys generated server-side and namespaced by owner.
- [ ] Content type and size validated before signing.
- [ ] Presigned lifetimes as short as the flow allows.
- [ ] Lifecycle rule expiring incomplete multipart uploads.
- [ ] Public assets served via a custom domain, not public bucket access.
- [ ] Deleting a user deletes their objects.

### Documentation

- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
