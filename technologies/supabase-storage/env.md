# Supabase Storage environment

Storage uses the same project URL and anon key as the rest of Supabase, so no
additional keys are needed. Access is controlled by bucket policies, not by a
separate credential.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_STORAGE_BUCKET` | No | Default bucket for user uploads. Keep it private and namespace objects by user id. | `avatars` |
