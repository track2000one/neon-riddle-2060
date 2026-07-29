# NEON Academy Admin Backend

Secure Node.js API for managing Firebase Authentication users from the NEON administrator console.

## Railway deployment

1. Create a new Railway service from the GitHub repository `track2000one/neon-riddle-2060`.
2. In the service **Settings**, set **Root Directory** to `/admin-backend`.
3. Railway will detect `package.json` and run `npm start`.
4. In **Variables**, add Firebase Admin credentials using one of the supported methods below.
5. Generate a public domain for the service and test `/api/health`.

## Required variables

Preferred method:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: complete Firebase service-account JSON.
- `ADMIN_UIDS`: comma-separated Firebase Authentication UIDs allowed to bootstrap administrator access.
- `ALLOWED_ORIGINS`: comma-separated browser origins. Default production origin is `https://track2000one.github.io`.

Alternative credential methods:

- `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64`
- or `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`

Optional:

- `ENABLE_FIRESTORE_AUDIT=true` to write administrative actions to the `adminAuditLogs` collection.

Never commit a service-account JSON file, private key, or `.env` file to GitHub.

## API routes

Public:

- `GET /api/health`

Administrator token required:

- `GET /api/admin/me`
- `GET /api/admin/users?limit=50&pageToken=...`
- `GET /api/admin/users/:uid`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:uid`
- `PATCH /api/admin/users/:uid/role`
- `POST /api/admin/users/:uid/revoke-sessions`
- `DELETE /api/admin/users/:uid`

Protected requests must include the signed-in Firebase user's ID token:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

The server verifies the token and authorizes only users with an `admin` custom claim, `role: admin`, or a UID listed in `ADMIN_UIDS`.

## Supported roles

- `student`
- `teacher`
- `content_manager`
- `admin`

Changing a user's role revokes their existing refresh tokens so that new claims are applied after they sign in again.
