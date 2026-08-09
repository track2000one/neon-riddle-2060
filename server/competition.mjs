import { createPublicKey, verify as verifySignature } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.PROGRESS_DATABASE_URL || '').trim();
const firebaseProjectId = String(process.env.FIREBASE_PROJECT_ID || 'neon-riddle-2060-admin').trim();
const firebaseCertUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const allowedOrigins = String(process.env.FRONTEND_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  max: Math.max(2, Math.min(8, Number(process.env.PG_POOL_MAX || 6))),
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
  certificateCache = { values, expiresAt: now + parseCacheSeconds(response.headers.get('cache-control')) * 1000 };
  return values;
}

async function verifyFirebaseToken(token) {
  const parts = String(token || '').split('.');
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
  const certificates = await firebaseCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) throw Object.assign(new Error('UNKNOWN_AUTH_KEY'), { statusCode: 401 });
  const verified = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey(certificate), base64UrlDecode(parts[2]));
  if (!verified) throw Object.assign(new Error('INVALID_AUTH_SIGNATURE'), { statusCode: 401 });
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId) throw Object.assign(new Error('INVALID_AUTH_AUDIENCE'), { statusCode: 401 });
  if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) throw Object.assign(new Error('INVALID_AUTH_ISSUER'), { statusCode: 401 });
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) throw Object.assign(new Error('INVALID_AUTH_SUBJECT'), { statusCode: 401 });
  if (!Number.isFinite(payload.exp) || payload.exp <= now) throw Object.assign(new Error('AUTH_TOKEN_EXPIRED'), { statusCode: 401 });
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.slice(0, 320) : '',
    name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : ''
  };
}

async function authenticate(req) {
  const value = String(req.headers.authorization || '');
  const match = value.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('AUTH_REQUIRED'), { statusCode: 401 });
  return verifyFirebaseToken(match[1]);
}

async function ensureSchema() {
  if (!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { statusCode: 503 });
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS neon_game_competition_events (
        firebase_uid TEXT NOT NULL,
        event_key TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        event_type TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        points INTEGER NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 1000),
        stars INTEGER NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, event_key)
      );
      CREATE INDEX IF NOT EXISTS neon_competition_week_idx ON neon_game_competition_events(created_at DESC, points DESC);
      CREATE INDEX IF NOT EXISTS neon_competition_user_idx ON neon_game_competition_events(firebase_uid, created_at DESC);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function cleanText(value, max = 120) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanIdentifier(value, fallback = 'unknown', max = 180) {
  const cleaned = String(value ?? '').toLowerCase().replace(/[^a-z0-9_:\-.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, max);
  return cleaned || fallback;
}

function safeObject(value, maxBytes = 4_000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const raw = JSON.stringify(value);
    if (Buffer.byteLength(raw) > maxBytes) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function competitionPoints(eventType, stars) {
  if (eventType === 'stage_complete') return ({ 1: 60, 2: 80, 3: 100 })[stars] || 60;
  if (eventType === 'daily_mission') return 100;
  if (eventType === 'weekly_mission') return 250;
  if (eventType === 'season_mission') return 400;
  return 0;
}

async function saveCompetitionEvent(identity, body) {
  await ensureSchema();
  const eventType = cleanIdentifier(body?.eventType, 'presence', 80);
  const eventKey = cleanIdentifier(body?.eventKey, `${eventType}:${Date.now()}`, 220);
  const stars = Math.max(0, Math.min(3, Math.trunc(Number(body?.stars) || 0)));
  const points = competitionPoints(eventType, stars);
  const displayName = cleanText(body?.displayName || identity.name || identity.email.split('@')[0] || 'لاعب نيون', 80);
  const category = cleanIdentifier(body?.category, '', 50);
  const metadata = safeObject(body?.metadata);
  const result = await pool.query(`
    INSERT INTO neon_game_competition_events (firebase_uid, event_key, display_name, event_type, category, points, stars, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
    ON CONFLICT (firebase_uid, event_key) DO NOTHING
    RETURNING points, stars, created_at
  `, [identity.uid, eventKey, displayName, eventType, category, points, stars, JSON.stringify(metadata)]);
  return { ok: true, duplicate: result.rowCount === 0, awardedPoints: Number(result.rows[0]?.points || 0) };
}

async function periodRows(client, start, end, uid, limit = 12) {
  const result = await client.query(`
    WITH scores AS (
      SELECT firebase_uid,
        (ARRAY_AGG(display_name ORDER BY created_at DESC))[1] AS display_name,
        COALESCE(SUM(points),0)::int AS points,
        COALESCE(SUM(stars),0)::int AS stars,
        COUNT(*) FILTER (WHERE event_type='stage_complete')::int AS stages,
        MAX(created_at) AS last_event
      FROM neon_game_competition_events
      WHERE created_at >= $1 AND created_at < $2
      GROUP BY firebase_uid
    ), ranked AS (
      SELECT *, DENSE_RANK() OVER (ORDER BY points DESC, stars DESC, stages DESC, last_event ASC) AS rank
      FROM scores
    )
    SELECT firebase_uid, display_name, points, stars, stages, rank::int
    FROM ranked
    WHERE rank <= $4 OR firebase_uid = $3
    ORDER BY rank ASC, display_name ASC
    LIMIT $5
  `, [start, end, uid, Math.max(20, limit), Math.max(40, limit + 10)]);
  const mapped = result.rows.map(row => ({
    rank: Number(row.rank),
    name: row.display_name || 'لاعب نيون',
    points: Number(row.points || 0),
    stars: Number(row.stars || 0),
    stages: Number(row.stages || 0),
    isYou: row.firebase_uid === uid
  }));
  return {
    top: mapped.filter(row => row.rank <= limit),
    you: mapped.find(row => row.isYou) || null
  };
}

async function leaderboard(identity) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    const boundaryResult = await client.query(`
      SELECT
        (date_trunc('week', NOW() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh') AS week_start,
        ((date_trunc('week', NOW() AT TIME ZONE 'Asia/Riyadh') + interval '7 days') AT TIME ZONE 'Asia/Riyadh') AS week_end,
        (date_trunc('month', NOW() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh') AS season_start,
        ((date_trunc('month', NOW() AT TIME ZONE 'Asia/Riyadh') + interval '1 month') AT TIME ZONE 'Asia/Riyadh') AS season_end
    `);
    const boundary = boundaryResult.rows[0];
    const [weekly, season] = await Promise.all([
      periodRows(client, boundary.week_start, boundary.week_end, identity.uid, 12),
      periodRows(client, boundary.season_start, boundary.season_end, identity.uid, 10)
    ]);
    return {
      ok: true,
      weekly: { start: boundary.week_start, end: boundary.week_end, ...weekly },
      season: { start: boundary.season_start, end: boundary.season_end, ...season },
      scoring: { stage: { oneStar: 60, twoStars: 80, threeStars: 100 }, dailyMission: 100, weeklyMission: 250, seasonMission: 400 }
    };
  } finally {
    client.release();
  }
}

function publicError(error) {
  const code = error?.message || 'COMPETITION_ERROR';
  if (code === 'AUTH_REQUIRED') return { status: 401, code, message: 'يجب تسجيل الدخول للمشاركة في المنافسة.' };
  if (code.startsWith('INVALID_AUTH') || code === 'UNKNOWN_AUTH_KEY' || code === 'AUTH_TOKEN_EXPIRED') return { status: 401, code, message: 'تعذر التحقق من جلسة الحساب.' };
  if (code === 'DATABASE_NOT_CONFIGURED') return { status: 503, code, message: 'قاعدة بيانات المنافسات غير متاحة.' };
  return { status: error?.statusCode || 500, code: 'COMPETITION_ERROR', message: 'تعذر تحديث المنافسة مؤقتًا.' };
}

export async function handleCompetitionApi(req, res, requestPath, readJsonBody) {
  if (!requestPath.startsWith('/api/competition')) return false;
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return true;
  }
  if (requestPath === '/api/competition/status' && req.method === 'GET') {
    json(res, 200, { configured: Boolean(pool), authentication: 'firebase-id-token', timezone: 'Asia/Riyadh' }, cors);
    return true;
  }
  try {
    const identity = await authenticate(req);
    if (requestPath === '/api/competition/event' && req.method === 'POST') {
      json(res, 200, await saveCompetitionEvent(identity, await readJsonBody(req)), cors);
      return true;
    }
    if (requestPath === '/api/competition/leaderboard' && req.method === 'GET') {
      json(res, 200, await leaderboard(identity), cors);
      return true;
    }
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { ...cors, Allow: 'GET, POST, OPTIONS' });
  } catch (error) {
    console.error('Competition API error:', error?.message || error);
    const result = publicError(error);
    json(res, result.status, { error: result.code, message: result.message }, cors);
  }
  return true;
}

export async function closeCompetitionDatabase() {
  if (pool) await pool.end();
}
