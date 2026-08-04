# Supabase Storage

Files in {{projectName}}.

## Public buckets are permanent

A public bucket serves every object to anyone with the URL — no auth, no expiry,
indefinitely. That is correct for product images and wrong for anything
belonging to a user.

It also cannot be undone: making a bucket private later does not recall URLs
already shared, indexed or cached. So when a task involves user uploads, use a
private bucket and signed URLs, and say why if asked to make it public "to keep
it simple".

An unguessable path is **not** access control. It is a URL that has not leaked
yet.

## Path convention comes first

```
{userId}/avatar.png
```

RLS policies for storage are written against the object path:

```sql
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
```

Without owner-namespaced paths there is no policy to write. Decide this before
the first upload — changing it afterwards means moving every existing object.

## Reading private objects

```ts
const { data } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
```

Generate on demand with the shortest workable lifetime. Store the **path** in
your database, never the signed URL — it expires, and a stored one becomes a
broken image nobody can explain.

## Resize before uploading

A phone camera produces multi-megabyte images. Uploading originals for a 100px
avatar spends the user's data allowance and battery, and your bandwidth, on
pixels that are immediately discarded.

## Check the error

Like the rest of the Supabase client, storage calls return `{ data, error }` and
do not throw. An unchecked `error` reads as a successful upload that silently
did nothing.

## Deletion

When a user is deleted, delete their objects. Files outliving the account is a
compliance problem, and storage bills for it forever.
