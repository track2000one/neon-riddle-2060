# Msar Neon — Automatic Atari 2600 covers

The Atari Google Drive library can load game cover art automatically from TheGamesDB without storing one image per ROM in Google Drive.

## Railway variable

Add one secret variable to the Railway service:

```text
THEGAMESDB_API_KEY=<your-api-key>
```

Do not commit the API key to GitHub.

## Lookup flow

For each visible Drive card, the browser lazily requests:

```text
GET /api/atari-metadata/cover/:fileId
```

The backend then:

1. Verifies the authenticated NEON user.
2. Reads the Google Drive file metadata using the existing private Service Account.
3. Confirms that the file is inside the configured Atari ROM folder.
4. Uses the Drive `md5Checksum` for a TheGamesDB `ByGameHash` lookup first.
5. If no hash match is found, derives a small set of cleaned title candidates from the ROM filename and falls back to `ByGameName`.
6. Restricts lookups to the Atari 2600 platform discovered from `Platforms/ByPlatformName`.
7. Requests `boxart` metadata and prefers front box art.
8. Returns only the public HTTPS cover URL and normalized game metadata to the browser. The TheGamesDB API key is never sent to the browser.

## Cache and request control

- Positive lookup results are cached in Railway process memory for 7 days.
- Negative results are cached for 12 hours.
- Atari platform lookup is cached for 24 hours.
- Maximum in-process cover cache size is 5,000 entries.
- The frontend uses `IntersectionObserver`; it does not request covers for all Drive files at once. It requests only cards near the viewport.
- The frontend keeps an additional per-page memory cache.
- If TheGamesDB reports an allowance/rate-limit condition, automatic cover loading pauses and the existing `DRIVE` artwork remains as a fallback.

## Endpoints

### `GET /api/atari-metadata/status`

Returns whether automatic metadata is configured.

### `GET /api/atari-metadata/cover/:fileId`

Returns a result similar to:

```json
{
  "ok": true,
  "matched": true,
  "provider": "thegamesdb",
  "matchMethod": "hash",
  "gameId": 123,
  "title": "River Raid",
  "releaseDate": "1982-01-01",
  "coverUrl": "https://..."
}
```

If no match is found, the endpoint returns `matched: false`; the frontend keeps the current NEON/DRIVE fallback artwork.

## Security

The integration reuses the same Google Drive Service Account variables already configured for the ROM library:

```text
ATARI_GOOGLE_DRIVE_FOLDER_ID
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL
GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY
```

The TheGamesDB key and Google credentials remain server-side only.
