import { createSign } from 'node:crypto';
import { Readable } from 'node:stream';
import { authenticatePlatformRequest } from './platform-access.mjs';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const DEFAULT_ATARI_FOLDER_ID = '1GUasd-Y5HSsSJ7nBI9wFu0_a0xsrDZsj';
const ALLOWED_EXTENSIONS = new Set(['a26', 'bin', 'rom', 'zip', '7z', 'rar']);
const MAX_ROM_BYTES = 32 * 1024 * 1024;

let tokenCache = { accessToken: '', expiresAt: 0 };

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
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
  return {
    serviceAccountEmail,
    privateKey,
    folderId,
    configured: Boolean(serviceAccountEmail && privateKey && folderId)
  };
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createAssertion({ serviceAccountEmail, privateKey }) {
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

async function accessToken() {
  const current = config();
  if (!current.configured) throw Object.assign(new Error('DRIVE_NOT_CONFIGURED'), { statusCode: 503 });
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;

  const assertion = createAssertion(current);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const detail = data.error_description || data.error || `HTTP_${response.status}`;
    throw Object.assign(new Error('DRIVE_AUTH_FAILED'), { statusCode: 502, detail });
  }
  tokenCache = {
    accessToken: String(data.access_token),
    expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600)) * 1000
  };
  return tokenCache.accessToken;
}

function extensionOf(name) {
  const value = String(name || '');
  const index = value.lastIndexOf('.');
  return index >= 0 ? value.slice(index + 1).toLowerCase() : '';
}

function escapeDriveQuery(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function driveJson(path, params = {}) {
  const token = await accessToken();
  const url = new URL(`${DRIVE_API}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message || `HTTP_${response.status}`;
    throw Object.assign(new Error('DRIVE_API_ERROR'), { statusCode: response.status === 404 ? 404 : 502, detail });
  }
  return data;
}

async function requireAuth(req) {
  try {
    return await authenticatePlatformRequest(req);
  } catch (error) {
    throw Object.assign(new Error('AUTH_REQUIRED'), { statusCode: Number(error?.statusCode || 401) });
  }
}

async function listLibrary(requestUrl) {
  const current = config();
  if (!current.configured) {
    return { configured: false, folderId: current.folderId, items: [], nextPageToken: null };
  }

  const query = String(requestUrl.searchParams.get('q') || '').trim().slice(0, 100);
  const pageToken = String(requestUrl.searchParams.get('pageToken') || '').trim().slice(0, 1000);
  const requestedPageSize = Number(requestUrl.searchParams.get('pageSize') || 120);
  const pageSize = Math.max(12, Math.min(200, Number.isFinite(requestedPageSize) ? requestedPageSize : 120));
  const conditions = [`'${escapeDriveQuery(current.folderId)}' in parents`, 'trashed = false'];
  if (query) conditions.push(`name contains '${escapeDriveQuery(query)}'`);

  const data = await driveJson('/files', {
    q: conditions.join(' and '),
    spaces: 'drive',
    pageSize,
    pageToken,
    orderBy: 'name',
    fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,md5Checksum,parents)'
  });

  const items = (Array.isArray(data.files) ? data.files : [])
    .filter(file => ALLOWED_EXTENSIONS.has(extensionOf(file.name)))
    .map(file => ({
      id: String(file.id || ''),
      name: String(file.name || ''),
      extension: extensionOf(file.name),
      size: Number(file.size || 0),
      modifiedTime: file.modifiedTime || null,
      checksum: file.md5Checksum || null
    }));

  return {
    configured: true,
    folderId: current.folderId,
    items,
    nextPageToken: data.nextPageToken || null
  };
}

async function downloadRom(req, res, fileId) {
  const current = config();
  if (!current.configured) throw Object.assign(new Error('DRIVE_NOT_CONFIGURED'), { statusCode: 503 });
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(fileId)) throw Object.assign(new Error('INVALID_FILE_ID'), { statusCode: 400 });

  const metadata = await driveJson(`/files/${encodeURIComponent(fileId)}`, {
    fields: 'id,name,mimeType,size,parents,md5Checksum,modifiedTime',
    supportsAllDrives: 'true'
  });
  if (!Array.isArray(metadata.parents) || !metadata.parents.includes(current.folderId)) {
    throw Object.assign(new Error('ROM_OUTSIDE_ALLOWED_FOLDER'), { statusCode: 403 });
  }

  const extension = extensionOf(metadata.name);
  const size = Number(metadata.size || 0);
  if (!ALLOWED_EXTENSIONS.has(extension)) throw Object.assign(new Error('ROM_EXTENSION_NOT_ALLOWED'), { statusCode: 415 });
  if (size > MAX_ROM_BYTES) throw Object.assign(new Error('ROM_TOO_LARGE'), { statusCode: 413 });

  const token = await accessToken();
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw Object.assign(new Error('ROM_DOWNLOAD_FAILED'), { statusCode: response.status === 404 ? 404 : 502, detail: detail.slice(0, 300) });
  }

  const fileName = String(metadata.name || 'atari2600.rom');
  const headers = {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'X-NEON-ROM-Name': encodeURIComponent(fileName)
  };
  if (size > 0) headers['Content-Length'] = String(size);
  res.writeHead(200, headers);
  Readable.fromWeb(response.body).pipe(res);
}

function publicError(error) {
  const code = String(error?.message || 'ATARI_DRIVE_ERROR');
  const known = new Map([
    ['AUTH_REQUIRED', [401, 'يلزم تسجيل الدخول لاستخدام مكتبة Google Drive.']],
    ['DRIVE_NOT_CONFIGURED', [503, 'تكامل Google Drive مهيأ برمجيًا لكنه ينتظر بيانات حساب الخدمة في Railway.']],
    ['DRIVE_AUTH_FAILED', [502, 'تعذر توثيق حساب الخدمة مع Google Drive.']],
    ['DRIVE_API_ERROR', [502, 'تعذر قراءة مكتبة Atari من Google Drive.']],
    ['INVALID_FILE_ID', [400, 'معرّف الملف غير صالح.']],
    ['ROM_OUTSIDE_ALLOWED_FOLDER', [403, 'الملف المطلوب خارج مجلد Atari المسموح.']],
    ['ROM_EXTENSION_NOT_ALLOWED', [415, 'صيغة ROM غير مسموحة.']],
    ['ROM_TOO_LARGE', [413, 'حجم الملف أكبر من الحد المسموح.']],
    ['ROM_DOWNLOAD_FAILED', [502, 'تعذر تنزيل ROM من Google Drive.']]
  ]);
  const [status, message] = known.get(code) || [Number(error?.statusCode || 500), 'حدث خطأ أثناء الوصول إلى مكتبة Atari.'];
  return { status, code, message, detail: error?.detail || '' };
}

export async function handleAtariGoogleDriveApi(req, res, requestPath) {
  if (!requestPath.startsWith('/api/atari-drive/')) return false;
  try {
    await requireAuth(req);
    const requestUrl = new URL(req.url || '/', 'http://localhost');

    if (requestPath === '/api/atari-drive/status' && req.method === 'GET') {
      const current = config();
      json(res, 200, {
        ok: true,
        provider: 'google-drive',
        configured: current.configured,
        folderId: current.folderId,
        mode: 'private-service-account'
      });
      return true;
    }

    if (requestPath === '/api/atari-drive/library' && req.method === 'GET') {
      const library = await listLibrary(requestUrl);
      json(res, 200, { ok: true, provider: 'google-drive', ...library });
      return true;
    }

    const match = requestPath.match(/^\/api\/atari-drive\/rom\/([A-Za-z0-9_-]{10,200})$/);
    if (match && req.method === 'GET') {
      await downloadRom(req, res, match[1]);
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

export function getAtariDriveRuntimeStatus() {
  const current = config();
  return { configured: current.configured, folderId: current.folderId };
}
