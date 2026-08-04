### Overview

Supabase Storage holds files — avatars, attachments, exports — behind the same
policy engine as the database. That is its main advantage here: no second
permission system to keep in step with the first.

The decision to make deliberately is **public versus private buckets**. A public
bucket serves anything in it to anyone with the URL, forever, with no auth
check. It is right for product images and wrong for anything belonging to a
user, and switching later does not un-share URLs that already escaped.

### Create a bucket

1. **Storage → New bucket** in the dashboard.
2. Choose public or private. Default to private; make it public only when the
   content genuinely is.
3. Set a file size limit and allowed MIME types on the bucket itself — a client
   check is a convenience, not a control.

### Policies

Storage objects live in a table, so RLS applies:

```sql
create policy "Users read their own files"
  on storage.objects for select
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload to their own folder"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

Namespacing objects by user id (`{userId}/avatar.png`) is what makes those
policies expressible. Decide the path convention before you have files.

### Install

```bash
npx expo install expo-image-picker expo-file-system
```

The Supabase client comes from the Supabase module.

### Uploading

```ts
const file = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

const { error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, decode(file), {
    contentType: 'image/png',
    upsert: true,
  });

if (error) throw new Error(`Upload failed: ${error.message}`);
```

Resize before uploading. A modern phone camera produces multi-megabyte images,
and shipping the original wastes the user's data allowance, your bandwidth bill
and their battery — for pixels nobody sees.

### Downloading

```ts
// Private bucket: a time-limited URL
const { data } = await supabase.storage
  .from('avatars')
  .createSignedUrl(`${userId}/avatar.png`, 3600);

// Public bucket: a permanent URL, readable by anyone who has it
const { data: pub } = supabase.storage.from('product-images').getPublicUrl(path);
```

Signed URLs expire; generate them when needed rather than storing them.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| "new row violates row-level security policy" | No insert policy, or the path does not match it |
| Upload succeeds, download 404s | Private bucket accessed with a public URL |
| Signed URL works then stops | Expected — it expired. Regenerate |
| Large uploads fail on mobile | File size over the bucket limit, or a timeout. Resize first |
| Wrong image served after replacing | CDN cache. Use `upsert` plus a cache-busting path or query |

### Common mistakes

- **Public buckets for user content.** Anyone with the URL has it permanently.
- **Uploading camera originals.** Multi-megabyte files nobody needs.
- **No path convention.** Without `{userId}/...` the policies cannot be written.
- **Storing signed URLs.** They expire; store the path.
- **Trusting client-side type checks.** Enforce on the bucket.

### Production checklist

- [ ] Buckets private unless the content is genuinely public.
- [ ] Policies for select, insert, update and delete, tested as another user.
- [ ] Objects namespaced by user id.
- [ ] File size and MIME restrictions set on the bucket.
- [ ] Images resized client-side before upload.
- [ ] Signed URL lifetimes as short as the use allows.
- [ ] Deleting a user deletes their objects.

### Documentation

- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
