import { createPublicKey, verify as verifySignature } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.PROGRESS_DATABASE_URL || '').trim();
const firebaseProjectId = String(process.env.FIREBASE_PROJECT_ID || 'neon-riddle-2060-admin').trim();
const firebaseCertUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  max: Math.max(2, Math.min(6, Number(process.env.STUDENT_STATE_PG_POOL_MAX || 3))),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
}) : null;

let schemaPromise;
let certificateCache = { expiresAt: 0, values: null };

function json(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(body);
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return {};
  const sameOrigin = (() => {
    try {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
      return new URL(origin).host === host;
    } catch { return false; }
  })();
  if (!sameOrigin && !allowedOrigins.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    Vary: 'Origin'
  };
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
  certificateCache = {
    values,
    expiresAt: now + parseCacheSeconds(response.headers.get('cache-control')) * 1000
  };
  return values;
}

async function authenticate(req) {
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
  const verified = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey(certificate),
    base64UrlDecode(parts[2])
  );
  if (!verified) throw Object.assign(new Error('INVALID_AUTH_SIGNATURE'), { statusCode: 401 });

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId || payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) {
    throw Object.assign(new Error('INVALID_AUTH_AUDIENCE'), { statusCode: 401 });
  }
  if (!payload.sub || Number(payload.exp || 0) <= now) throw Object.assign(new Error('AUTH_TOKEN_EXPIRED'), { statusCode: 401 });
  return { uid: String(payload.sub).slice(0, 128) };
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function safeObject(value, maxBytes = 12_000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized) > maxBytes) return {};
    return JSON.parse(serialized);
  } catch { return {}; }
}

function cleanDate(value) {
  const text = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanNotebookItem(value) {
  const item = safeObject(value);
  const id = cleanText(item.id, 240);
  if (!id) return null;
  return {
    id,
    questionId: cleanText(item.questionId, 220),
    subject: cleanText(item.subject, 120),
    subjectTitle: cleanText(item.subjectTitle, 180),
    question: cleanText(item.question, 4000),
    options: Array.isArray(item.options) ? item.options.slice(0, 8).map(option => cleanText(option, 1200)) : [],
    answer: Number.isInteger(Number(item.answer)) ? Number(item.answer) : 0,
    correctText: cleanText(item.correctText, 1200),
    explain: cleanText(item.explain, 5000),
    category: cleanText(item.category, 180),
    wrongCount: Math.max(1, Math.min(1000, Math.trunc(Number(item.wrongCount || 1)))),
    lastWrongAt: cleanText(item.lastWrongAt, 80),
    nextReviewAt: cleanText(item.nextReviewAt, 80)
  };
}

async function ensureSchema() {
  if (!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { statusCode: 503 });
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS neon_error_notebook_state (
        firebase_uid TEXT NOT NULL,
        item_id TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, item_id)
      );

      CREATE TABLE IF NOT EXISTS neon_daily_plan_state (
        firebase_uid TEXT NOT NULL,
        plan_date DATE NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, plan_date)
      );

      CREATE INDEX IF NOT EXISTS neon_error_notebook_active_idx
        ON neon_error_notebook_state(firebase_uid, resolved_at, updated_at DESC);
      CREATE INDEX IF NOT EXISTS neon_daily_plan_recent_idx
        ON neon_daily_plan_state(firebase_uid, plan_date DESC);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function readNotebook(identity) {
  await ensureSchema();
  const [active, resolved] = await Promise.all([
    pool.query(`
      SELECT payload FROM neon_error_notebook_state
      WHERE firebase_uid=$1 AND resolved_at IS NULL
      ORDER BY updated_at DESC LIMIT 300
    `, [identity.uid]),
    pool.query(`
      SELECT item_id FROM neon_error_notebook_state
      WHERE firebase_uid=$1 AND resolved_at IS NOT NULL AND resolved_at > NOW() - INTERVAL '180 days'
      ORDER BY resolved_at DESC LIMIT 500
    `, [identity.uid])
  ]);
  return {
    ok: true,
    items: active.rows.map(row => row.payload).filter(Boolean),
    resolvedIds: resolved.rows.map(row => String(row.item_id))
  };
}

async function syncNotebook(identity, body) {
  await ensureSchema();
  const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 40).map(cleanNotebookItem).filter(Boolean);
  const removeIds = [...new Set((Array.isArray(body?.removeIds) ? body.removeIds : []).slice(0, 100).map(value => cleanText(value, 240)).filter(Boolean))];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      await client.query(`
        INSERT INTO neon_error_notebook_state (firebase_uid, item_id, payload, resolved_at, updated_at)
        VALUES ($1,$2,$3::jsonb,NULL,NOW())
        ON CONFLICT (firebase_uid, item_id) DO UPDATE SET
          payload=EXCLUDED.payload,
          resolved_at=NULL,
          updated_at=NOW()
      `, [identity.uid, item.id, JSON.stringify(item)]);
    }
    for (const itemId of removeIds) {
      await client.query(`
        INSERT INTO neon_error_notebook_state (firebase_uid, item_id, payload, resolved_at, updated_at)
        VALUES ($1,$2,'{}'::jsonb,NOW(),NOW())
        ON CONFLICT (firebase_uid, item_id) DO UPDATE SET
          resolved_at=NOW(),
          updated_at=NOW()
      `, [identity.uid, itemId]);
    }
    await client.query('COMMIT');
    return { ok: true, upserted: items.length, resolved: removeIds.length };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function readDailyPlan(identity, date) {
  await ensureSchema();
  const result = await pool.query(`
    SELECT payload, updated_at FROM neon_daily_plan_state
    WHERE firebase_uid=$1 AND plan_date=$2
  `, [identity.uid, date]);
  return { ok: true, date, state: result.rows[0]?.payload || {}, updatedAt: result.rows[0]?.updated_at || null };
}

async function saveDailyPlan(identity, date, state) {
  await ensureSchema();
  const payload = safeObject(state, 8_000);
  const result = await pool.query(`
    INSERT INTO neon_daily_plan_state (firebase_uid, plan_date, payload, updated_at)
    VALUES ($1,$2,$3::jsonb,NOW())
    ON CONFLICT (firebase_uid, plan_date) DO UPDATE SET
      payload=EXCLUDED.payload,
      updated_at=NOW()
    RETURNING updated_at
  `, [identity.uid, date, JSON.stringify(payload)]);
  return { ok: true, date, state: payload, updatedAt: result.rows[0]?.updated_at || null };
}

function errorPayload(error) {
  const code = String(error?.message || 'STUDENT_STATE_ERROR');
  if (code === 'AUTH_REQUIRED' || code.startsWith('INVALID_AUTH') || code === 'AUTH_TOKEN_EXPIRED' || code === 'UNKNOWN_AUTH_KEY') {
    return { status: 401, code, message: 'يلزم تسجيل الدخول لمزامنة بيانات الطالب.' };
  }
  if (code === 'DATABASE_NOT_CONFIGURED') return { status: 503, code, message: 'قاعدة البيانات غير مهيأة بعد.' };
  if (error?.statusCode) return { status: error.statusCode, code, message: 'تعذر تنفيذ الطلب.' };
  return { status: 500, code: 'STUDENT_STATE_ERROR', message: 'تعذر مزامنة بيانات الطالب مؤقتًا.' };
}

export async function handleStudentStateApi(req, res, requestPath, readJsonBody) {
  if (!requestPath.startsWith('/api/student-state')) return false;
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return true;
  }
  if (requestPath === '/api/student-state/status' && req.method === 'GET') {
    json(res, 200, { configured: Boolean(pool), features: ['error-notebook', 'daily-plan', 'cross-device-sync'] }, cors);
    return true;
  }

  try {
    const identity = await authenticate(req);
    if (requestPath === '/api/student-state/notebook' && req.method === 'GET') {
      json(res, 200, await readNotebook(identity), cors);
      return true;
    }
    if (requestPath === '/api/student-state/notebook/sync' && req.method === 'POST') {
      json(res, 200, await syncNotebook(identity, await readJsonBody(req)), cors);
      return true;
    }
    if (requestPath === '/api/student-state/daily-plan' && req.method === 'GET') {
      const url = new URL(req.url || '/', 'http://localhost');
      const date = cleanDate(url.searchParams.get('date'));
      if (!date) {
        json(res, 400, { error: 'INVALID_PLAN_DATE' }, cors);
        return true;
      }
      json(res, 200, await readDailyPlan(identity, date), cors);
      return true;
    }
    if (requestPath === '/api/student-state/daily-plan' && req.method === 'PUT') {
      const body = await readJsonBody(req);
      const date = cleanDate(body?.date);
      if (!date) {
        json(res, 400, { error: 'INVALID_PLAN_DATE' }, cors);
        return true;
      }
      json(res, 200, await saveDailyPlan(identity, date, body?.state), cors);
      return true;
    }
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { ...cors, Allow: 'GET, POST, PUT, OPTIONS' });
  } catch (error) {
    const failure = errorPayload(error);
    console.error('Student state API error:', failure.code, error?.message || error);
    json(res, failure.status, { error: failure.code, message: failure.message }, cors);
  }
  return true;
}

export async function closeStudentStateDatabase() {
  if (pool) await pool.end().catch(() => {});
}
