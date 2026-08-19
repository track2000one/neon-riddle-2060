# Msar Neon — Atari 2600 Google Drive integration

This integration keeps Atari ROM files in a private Google Drive folder while NEON reads them through the Railway backend.

## Drive folders created

- `Msar Neon`
- `Msar Neon / Atari 2600`
- `Msar Neon / Atari 2600 / ROMs`
- `Msar Neon / Atari 2600 / Covers`
- `Msar Neon / Atari 2600 / Metadata`

The runtime defaults to the ROM folder ID below and may be overridden with an environment variable:

```text
1GUasd-Y5HSsSJ7nBI9wFu0_a0xsrDZsj
```

## Security model

The browser never receives Google service-account credentials or a direct Google Drive download URL.

Flow:

```text
Authenticated NEON user
  -> /api/atari-drive/library
  -> Railway backend
  -> Google Drive API (drive.readonly)

Authenticated NEON user
  -> /api/atari-drive/rom/:fileId
  -> Railway backend verifies the file belongs to the allowed ROM folder
  -> Google Drive media download
  -> browser File object
  -> Stella 2014 / EmulatorJS
```

Only the following extensions are accepted:

```text
.a26 .bin .rom .zip .7z .rar
```

Maximum ROM payload passed through the backend is 32 MB.

## Google Cloud setup required once

1. Create or select a Google Cloud project for Msar Neon.
2. Enable **Google Drive API**.
3. Create a **Service Account**.
4. Create a JSON key for that service account.
5. Copy `client_email` and `private_key` from the JSON file.
6. In Google Drive, share the `ROMs` folder with the service-account email as **Viewer**.

Do not make the ROM folder public.

## Railway variables

Set these variables on the `neon-academy-frontend-preview` Railway service:

```text
ATARI_GOOGLE_DRIVE_FOLDER_ID=1GUasd-Y5HSsSJ7nBI9wFu0_a0xsrDZsj
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=<service-account>@<project>.iam.gserviceaccount.com
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

The private key may be pasted with real line breaks or escaped `\n` line breaks; the backend handles both.

After saving the variables, redeploy the Railway service.

## API

### `GET /api/atari-drive/status`

Authenticated endpoint. Returns whether the backend credentials are configured.

### `GET /api/atari-drive/library`

Authenticated endpoint. Query parameters:

- `q`: optional Google Drive filename search.
- `pageSize`: 12–200, default 120.
- `pageToken`: Google Drive pagination token returned by the previous response.

### `GET /api/atari-drive/rom/:fileId`

Authenticated endpoint. Before downloading, the backend checks that:

- the file ID format is valid;
- the file is directly inside the configured ROM folder;
- the extension is allowed;
- the file is no larger than 32 MB.

## Frontend behavior

The Atari page retains local ROM upload as a fallback. Once Railway credentials are present and the Drive folder is shared with the service account, the **Google Drive Private** section lists ROM files and offers **تشغيل من Google Drive**.

The downloaded bytes are converted to a browser `File` and passed to the existing same-origin Stella 2014 player. No ROM is committed to GitHub.
