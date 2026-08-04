# Cloudflare R2 environment

Every value here is server-side. R2 credentials are account-scoped — there is no
client-safe variant — so the app obtains presigned URLs from your backend rather
than holding a key.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account id, used to build the S3 endpoint. | `abcdef0123456789` |
| `R2_ACCESS_KEY_ID` | Yes | API token access key. Server-side only. | `xxxxxxxx` |
| `R2_SECRET_ACCESS_KEY` | Yes | API token secret. Shown once at creation. Server-side only. | `xxxxxxxx` |
| `R2_BUCKET` | Yes | Bucket name. | `{{projectSlug}}-uploads` |
| `R2_PUBLIC_BASE_URL` | No | Custom domain for genuinely public assets. Preferred over enabling public bucket access. | `https://assets.example.com` |
