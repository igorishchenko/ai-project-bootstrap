# Firebase environment

The values below are **not secrets** — they identify the project and ship in
every client. Security comes from the rules, not from hiding these.

The Admin service account is the opposite: it bypasses every rule. Server-side
only, never in the app, never committed.

Use separate Firebase projects per environment; there is no environment concept
inside a project, so a shared one puts test writes in real data.

| Key | Required | Description | Example |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Identifies the project. Public by design. | `AIzaSyXXXXXXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Auth domain from the console. | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Project id. | `<your-project>` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | App id from Project settings. | `1:000000000000:web:xxxxxxxx` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | No | Storage bucket, if you use Storage. | `<project>.appspot.com` |
| `FIREBASE_SERVICE_ACCOUNT` | No | Admin SDK credentials JSON. Bypasses all rules — server-side only. | `{"type":"service_account",...}` |
