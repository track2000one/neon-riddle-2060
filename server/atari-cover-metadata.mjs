import { createSign } from 'node:crypto';
import { authenticatePlatformRequest } from './platform-access.mjs';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DEFAULT_ATARI_FOLDER_ID = '1GUasd-Y5HSsSJ7nBI9wFu0_a0xsrDZsj';
const TGDB_API = 'https://api.thegamesdb.net/v1';
const CACHE_MAX = 5000;
const POSITIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const NEGATIVE_TTL_MS = 12 * 60 * 60 * 1000;
const PLATFORM_TTL_MS = 24 * 60 * 60 * 1000;

let driveTokenCache = { accessToken: '', expiresAt: 0 };
let platformCache = { id: null, expiresAt: 0 };
const coverCache = new Map();

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function config() {
  const serviceAccountEmail = String(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKey = String(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY || '')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
  const folderId = String(process.env.ATARI_GOOGLE_DRIVE_FOLDER_ID || DEFAULT_ATARI_FOLDER_ID).trim();
  const apiKey = String(process.env.THEGAMESDB_API_KEY || '').trim();
  return {
    serviceAccountEmail,
    privateKey,
    folderId,
    apiKey,
    driveConfigured: Boolean(serviceAccountEmail && privateKey && folderId),
    metadataConfigured: Boolean(apiKey)
  };
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createDriveAssertion({ serviceAccountEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    iss: serviceAccountEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${unsigned}.${signature}`;
}

async function driveAccessToken() {
  const current = config();
  if (!current.driveConfigured) throw Object.assign(new Error('DRIVE_NOT_CONFIGURED'), { statusCode: 503 });
  if (driveTokenCache.accessToken && driveTokenCache.expiresAt > Date.now() + 60_000) return driveTokenCache.accessToken;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: createDriveAssertion(current)
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    throw Object.assign(new Error('DRIVE_AUTH_FAILED'), {
      statusCode: 502,
      detail: data.error_description || data.error || `HTTP_${response.status}`
    });
  }
  driveTokenCache = {
    accessToken: String(data.access_token),
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600)) * 1000
  };
  return driveTokenCache.accessToken;
}

async function driveFileMetadata(fileId) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw Object.assign(new Error('INVALID_FILE_ID'), { statusCode: 400 });
  const current = config();
  const token = await driveAccessToken();
  const url = new URL(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set('fields', 'id,name,size,parents,md5Checksum,modifiedTime');
  url.searchParams.set('supportsAllDrives', 'true');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error('DRIVE_API_ERROR'), {
      statusCode: response.status === 404 ? 404 : 502,
      detail: data?.error?.message || `HTTP_${response.status}`
    });
  }
  if (!Array.isArray(data.parents) || !data.parents.includes(current.folderId)) {
    throw Object.assign(new Error('ROM_OUTSIDE_ALLOWED_FOLDER'), { statusCode: 403 });
  }
  return {
    id: String(data.id || fileId),
    name: String(data.name || ''),
    size: Number(data.size || 0),
    checksum: String(data.md5Checksum || '').toLowerCase(),
    modifiedTime: String(data.modifiedTime || '')
  };
}

async function requireAuth(req) {
  try {
    return await authenticatePlatformRequest(req);
  } catch (error) {
    throw Object.assign(new Error('AUTH_REQUIRED'), { statusCode: Number(error?.statusCode || 401) });
  }
}

async function tgdbJson(path, params = {}) {
  const current = config();
  if (!current.metadataConfigured) throw Object.assign(new Error('TGDB_NOT_CONFIGURED'), { statusCode: 503 });
  const url = new URL(`${TGDB_API}${path}`);
  url.searchParams.set('apikey', current.apiKey);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || Number(data.code || response.status) >= 400) {
    const statusCode = response.status === 403 || Number(data.code) === 403 ? 429 : 502;
    throw Object.assign(new Error('TGDB_API_ERROR'), {
      statusCode,
      detail: data.status || data.message || `HTTP_${response.status}`
    });
  }
  return data;
}

async function atariPlatformId() {
  if (platformCache.id && platformCache.expiresAt > Date.now()) return platformCache.id;
  const data = await tgdbJson('/Platforms/ByPlatformName', { name: 'Atari 2600' });
  const platforms = Array.isArray(data?.data?.platforms) ? data.data.platforms : [];
  const exact = platforms.find(item => String(item?.name || '').toLowerCase() === 'atari 2600')
    || platforms.find(item => String(item?.alias || '').toLowerCase() === 'atari-2600')
    || platforms[0];
  const id = Number(exact?.id || 0);
  if (!id) throw Object.assign(new Error('TGDB_ATARI_PLATFORM_NOT_FOUND'), { statusCode: 502 });
  platformCache = { id, expiresAt: Date.now() + PLATFORM_TTL_MS };
  return id;
}

function stripExtension(name) {
  return String(name || '').replace(/\.[^.]+$/, '').trim();
}

function normalizeTitle(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[’‘]/g, "'")
    .replace(/[^a-zA-Z0-9'!&+.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function titleCandidates(fileName) {
  const raw = stripExtension(fileName);
  const beforeParen = raw.split('(')[0].trim();
  const withoutTags = raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hackBases = [...raw.matchAll(/\(([^()]+?)\s+Hack\)/gi)]
    .map(match => String(match[1] || '').trim())
    .filter(Boolean);
  const candidates = [raw, beforeParen, withoutTags, ...hackBases]
    .map(value => value.replace(/\s+/g, ' ').trim())
    .filter(value => value.length >= 2);
  return [...new Map(candidates.map(value => [normalizeTitle(value), value])).values()].slice(0, 4);
}

function gameList(data) {
  return Array.isArray(data?.data?.games) ? data.data.games : [];
}

function chooseGame(data, preferredTitle = '') {
  const games = gameList(data);
  if (!games.length) return null;
  const preferred = normalizeTitle(preferredTitle);
  if (preferred) {
    const exact = games.find(game => normalizeTitle(game?.game_title) === preferred);
    if (exact) return exact;
    const starts = games.find(game => normalizeTitle(game?.game_title).startsWith(preferred) || preferred.startsWith(normalizeTitle(game?.game_title)));
    if (starts) return starts;
  }
  return games[0];
}

function pickBoxart(data, gameId) {
  const boxart = data?.include?.boxart;
  const bases = boxart?.base_url || {};
  const byGame = boxart?.data || {};
  const images = Array.isArray(byGame?.[String(gameId)])
    ? byGame[String(gameId)]
    : Array.isArray(byGame?.[gameId]) ? byGame[gameId] : [];
  if (!images.length) return null;
  const front = images.find(image => image?.type === 'boxart' && String(image?.side || '').toLowerCase() === 'front')
    || images.find(image => image?.type === 'boxart')
    || images[0];
  const filename = String(front?.filename || '').trim();
  const base = String(bases.medium || bases.large || bases.original || bases.small || bases.thumb || '').trim();
  if (!filename || !base) return null;
  try {
    return new URL(filename, base.endsWith('/') ? base : `${base}/`).href;
  } catch {
    return `${base}${base.endsWith('/') ? '' : '/'}${filename}`;
  }
}

function cacheGet(key) {
  const entry = coverCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    coverCache.delete(key);
    return null;
  }
  return { ...entry.value, cached: true };
}

function cacheSet(key, value) {
  if (coverCache.size >= CACHE_MAX) {
    const oldest = coverCache.keys().next().value;
    if (oldest) coverCache.delete(oldest);
  }
  coverCache.set(key, {
    value,
    expiresAt: Date.now() + (value.matched ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS)
  });
  return value;
}

async function lookupByHash(hash, platformId) {
  if (!/^[a-f0-9]{16,64}$/i.test(hash)) return null;
  const data = await tgdbJson('/Games/ByGameHash', {
    hash,
    'filter[platform]': platformId,
    include: 'boxart,platform'
  });
  const game = chooseGame(data);
  if (!game) return null;
  return { data, game, method: 'hash' };
}

async function lookupByName(fileName, platformId) {
  for (const candidate of titleCandidates(fileName)) {
    const data = await tgdbJson('/Games/ByGameName', {
      name: candidate,
      'filter[platform]': platformId,
      include: 'boxart,platform'
    });
    const game = chooseGame(data, candidate);
    if (game) return { data, game, method: candidate === stripExtension(fileName) ? 'name' : 'normalized-name', query: candidate };
  }
  return null;
}

async function coverForRom(metadata) {
  const key = `${metadata.checksum || metadata.id}:${metadata.modifiedTime}:${metadata.name}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const platformId = await atariPlatformId();
  let match = null;
  if (metadata.checksum) {
    try { match = await lookupByHash(metadata.checksum, platformId); }
    catch (error) {
      if (String(error?.message || '') === 'TGDB_API_ERROR' && Number(error?.statusCode || 0) === 429) throw error;
    }
  }
  if (!match) match = await lookupByName(metadata.name, platformId);

  if (!match) {
    return cacheSet(key, {
      matched: false,
      cached: false,
      provider: 'thegamesdb',
      sourceName: metadata.name,
      coverUrl: null
    });
  }

  const coverUrl = pickBoxart(match.data, match.game.id);
  return cacheSet(key, {
    matched: true,
    cached: false,
    provider: 'thegamesdb',
    matchMethod: match.method,
    gameId: Number(match.game.id || 0) || null,
    title: String(match.game.game_title || stripExtension(metadata.name)),
    releaseDate: match.game.release_date || null,
    platformId: Number(match.game.platform || platformId) || platformId,
    sourceName: metadata.name,
    coverUrl
  });
}

function publicError(error) {
  const code = String(error?.message || 'ATARI_METADATA_ERROR');
  const known = new Map([
    ['AUTH_REQUIRED', [401, 'يلزم تسجيل الدخول لتحميل صور مكتبة Atari.']],
    ['DRIVE_NOT_CONFIGURED', [503, 'تكامل Google Drive غير مكتمل.']],
    ['DRIVE_AUTH_FAILED', [502, 'تعذر توثيق حساب Google Drive.']],
    ['DRIVE_API_ERROR', [502, 'تعذر قراءة بيانات ملف Atari من Google Drive.']],
    ['INVALID_FILE_ID', [400, 'معرّف ملف Atari غير صالح.']],
    ['ROM_OUTSIDE_ALLOWED_FOLDER', [403, 'الملف خارج مكتبة Atari المسموح بها.']],
    ['TGDB_NOT_CONFIGURED', [503, 'مفتاح TheGamesDB غير مضاف في Railway بعد.']],
    ['TGDB_API_ERROR', [Number(error?.statusCode || 502), Number(error?.statusCode || 0) === 429 ? 'تعذر جلب الغلاف مؤقتًا بسبب حد TheGamesDB.' : 'تعذر قراءة بيانات اللعبة من TheGamesDB.']],
    ['TGDB_ATARI_PLATFORM_NOT_FOUND', [502, 'تعذر تحديد منصة Atari 2600 في TheGamesDB.']]
  ]);
  const [status, message] = known.get(code) || [Number(error?.statusCode || 500), 'حدث خطأ أثناء البحث عن غلاف اللعبة.'];
  return { status, code, message, detail: error?.detail || '' };
}

export async function handleAtariCoverMetadataApi(req, res, requestPath) {
  if (!requestPath.startsWith('/api/atari-metadata/')) return false;
  try {
    await requireAuth(req);

    if (requestPath === '/api/atari-metadata/status' && req.method === 'GET') {
      const current = config();
      json(res, 200, {
        ok: true,
        provider: 'thegamesdb',
        configured: current.metadataConfigured,
        driveConfigured: current.driveConfigured,
        mode: 'lazy-cover-lookup',
        cache: 'memory-ttl'
      });
      return true;
    }

    const match = requestPath.match(/^\/api\/atari-metadata\/cover\/([A-Za-z0-9_-]{10,200})$/);
    if (match && req.method === 'GET') {
      const current = config();
      if (!current.metadataConfigured) throw Object.assign(new Error('TGDB_NOT_CONFIGURED'), { statusCode: 503 });
      const metadata = await driveFileMetadata(match[1]);
      const result = await coverForRom(metadata);
      json(res, 200, { ok: true, ...result });
      return true;
    }

    json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    return true;
  } catch (error) {
    const failure = publicError(error);
    if (!res.headersSent) json(res, failure.status, {
      error: failure.code,
      message: failure.message,
      ...(failure.detail ? { detail: failure.detail } : {})
    });
    else res.destroy(error);
    return true;
  }
}
