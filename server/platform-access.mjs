import { createPublicKey, verify as verifySignature } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.PROGRESS_DATABASE_URL || '').trim();
const firebaseProjectId = String(process.env.FIREBASE_PROJECT_ID || 'neon-riddle-2060-admin').trim();
const firebaseCertUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  max: Math.max(2, Math.min(6, Number(process.env.ACCESS_PG_POOL_MAX || 3))),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
}) : null;

let schemaPromise;
let certificateCache = { expiresAt: 0, values: null };

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

function base64UrlDecode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 ? '='.repeat(4 - (normalized.length % 4)) : '';
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function parseCacheSeconds(value) {
  const match = String(value || '').match(/max-age=(\d+)/i);
  return match ? Number(match[1]) : 3600;
}

async function firebaseCertificates() {
  const now = Date.now();
  if (certificateCache.values && certificateCache.expiresAt > now + 30_000) return certificateCache.values;
  const response = await fetch(firebaseCertUrl, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw Object.assign(new Error('FIREBASE_CERTIFICATES_UNAVAILABLE'), { statusCode: 503 });
  const values = await response.json();
  certificateCache = { values, expiresAt: now + parseCacheSeconds(response.headers.get('cache-control')) * 1000 };
  return values;
}

export async function authenticatePlatformRequest(req) {
  const value = String(req.headers.authorization || '');
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('AUTH_REQUIRED'), { statusCode: 401 });
  const parts = match[1].split('.');
  if (parts.length !== 3) throw Object.assign(new Error('INVALID_AUTH_TOKEN'), { statusCode: 401 });
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
  } catch {
    throw Object.assign(new Error('INVALID_AUTH_TOKEN'), { statusCode: 401 });
  }
  if (header.alg !== 'RS256' || !header.kid) throw Object.assign(new Error('INVALID_AUTH_TOKEN'), { statusCode: 401 });
  const certificate = (await firebaseCertificates())[header.kid];
  if (!certificate) throw Object.assign(new Error('UNKNOWN_AUTH_KEY'), { statusCode: 401 });
  const verified = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey(certificate), base64UrlDecode(parts[2]));
  if (!verified) throw Object.assign(new Error('INVALID_AUTH_SIGNATURE'), { statusCode: 401 });
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId || payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) throw Object.assign(new Error('INVALID_AUTH_AUDIENCE'), { statusCode: 401 });
  if (!payload.sub || Number(payload.exp || 0) <= now) throw Object.assign(new Error('AUTH_TOKEN_EXPIRED'), { statusCode: 401 });
  return {
    uid: String(payload.sub).slice(0, 128),
    email: typeof payload.email === 'string' ? payload.email.slice(0, 320) : '',
    name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : ''
  };
}

async function ensureSchema() {
  if (!pool) return false;
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS neon_platform_users (
        firebase_uid TEXT PRIMARY KEY,
        email TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL DEFAULT '',
        role TEXT NOT NULL DEFAULT 'student',
        account_status TEXT NOT NULL DEFAULT 'active',
        status_reason TEXT NOT NULL DEFAULT '',
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS neon_platform_users_last_seen_idx ON neon_platform_users(last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS neon_platform_users_role_idx ON neon_platform_users(role, account_status);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
  return true;
}

async function registerIdentity(identity) {
  if (!pool) return { role: 'student', status: 'active', configured: false };
  await ensureSchema();
  const result = await pool.query(`
    INSERT INTO neon_platform_users (firebase_uid, email, display_name, last_seen_at, updated_at)
    VALUES ($1,$2,$3,NOW(),NOW())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email=CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE neon_platform_users.email END,
      display_name=CASE WHEN EXCLUDED.display_name <> '' THEN EXCLUDED.display_name ELSE neon_platform_users.display_name END,
      last_seen_at=NOW()
    RETURNING role, account_status, status_reason, first_seen_at, last_seen_at
  `, [identity.uid, identity.email || '', identity.name || '']);
  const row = result.rows[0] || {};
  return {
    role: row.role || 'student',
    status: row.account_status || 'active',
    reason: row.status_reason || '',
    firstSeenAt: row.first_seen_at || null,
    lastSeenAt: row.last_seen_at || null,
    configured: true
  };
}

function publicFailure(error) {
  const code = String(error?.message || 'ACCESS_ERROR');
  if (code === 'AUTH_REQUIRED' || code.startsWith('INVALID_AUTH') || code === 'AUTH_TOKEN_EXPIRED' || code === 'UNKNOWN_AUTH_KEY') {
    return { status: 401, code, message: 'يلزم تسجيل الدخول.' };
  }
  if (code === 'ACCOUNT_SUSPENDED') return { status: 403, code, message: 'تم إيقاف الوصول إلى خدمات المنصة لهذا الحساب.' };
  return { status: Number(error?.statusCode || 500), code: 'ACCESS_ERROR', message: 'تعذر التحقق من حالة الحساب مؤقتًا.' };
}

export async function handlePlatformAccessApi(req, res, requestPath) {
  if (!requestPath.startsWith('/api/access/')) return false;
  if (requestPath !== '/api/access/session' || !['GET', 'POST'].includes(req.method || 'GET')) {
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' });
    return true;
  }
  try {
    const identity = await authenticatePlatformRequest(req);
    const access = await registerIdentity(identity);
    if (access.status === 'suspended') {
      json(res, 403, { error: 'ACCOUNT_SUSPENDED', message: 'تم إيقاف الوصول إلى خدمات المنصة لهذا الحساب.', access });
      return true;
    }
    json(res, 200, { ok: true, identity, access });
  } catch (error) {
    const failure = publicFailure(error);
    json(res, failure.status, { error: failure.code, message: failure.message });
  }
  return true;
}

export async function guardPlatformAccess(req, res, requestPath) {
  if (!requestPath.startsWith('/api/') || requestPath.startsWith('/api/access/')) return false;
  if (!String(req.headers.authorization || '').match(/^Bearer\s+/i)) return false;
  try {
    const identity = await authenticatePlatformRequest(req);
    const access = await registerIdentity(identity);
    if (access.status !== 'suspended') return false;
    json(res, 403, { error: 'ACCOUNT_SUSPENDED', message: 'تم إيقاف الوصول إلى خدمات المنصة لهذا الحساب.' });
    return true;
  } catch (error) {
    // Downstream APIs keep ownership of normal authentication failures.
    if (String(error?.message || '') === 'ACCOUNT_SUSPENDED') {
      json(res, 403, { error: 'ACCOUNT_SUSPENDED', message: 'تم إيقاف الوصول إلى خدمات المنصة لهذا الحساب.' });
      return true;
    }
    return false;
  }
}

export async function closePlatformAccessDatabase() {
  if (pool) await pool.end().catch(() => {});
}
