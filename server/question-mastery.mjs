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
  max: Math.max(2, Math.min(10, Number(process.env.PG_POOL_MAX || 6))),
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
  certificateCache = {
    values,
    expiresAt: now + parseCacheSeconds(response.headers.get('cache-control')) * 1000
  };
  return values;
}

async function authenticate(req) {
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
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
  const certificates = await firebaseCertificates();
  const certificate = certificates[header.kid];
  if (!certificate) throw Object.assign(new Error('UNKNOWN_AUTH_KEY'), { statusCode: 401 });

  const verified = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey(certificate),
    base64UrlDecode(parts[2])
  );
  if (!verified) throw Object.assign(new Error('INVALID_AUTH_SIGNATURE'), { statusCode: 401 });

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId) throw Object.assign(new Error('INVALID_AUTH_AUDIENCE'), { statusCode: 401 });
  if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) throw Object.assign(new Error('INVALID_AUTH_ISSUER'), { statusCode: 401 });
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.length > 128) throw Object.assign(new Error('INVALID_AUTH_SUBJECT'), { statusCode: 401 });
  if (!Number.isFinite(payload.exp) || payload.exp <= now) throw Object.assign(new Error('AUTH_TOKEN_EXPIRED'), { statusCode: 401 });

  return { uid: payload.sub };
}

async function ensureSchema() {
  if (!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { statusCode: 503 });
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS neon_question_mastery (
        firebase_uid TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('new','learning','review','reinforcing','mastered')),
        attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
        wrong_count INTEGER NOT NULL DEFAULT 0 CHECK (wrong_count >= 0),
        correct_streak INTEGER NOT NULL DEFAULT 0 CHECK (correct_streak >= 0),
        mastery_score INTEGER NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
        last_answer_correct BOOLEAN,
        next_review_at TIMESTAMPTZ,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        mastered_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, subject_id, question_id)
      );
      CREATE INDEX IF NOT EXISTS neon_question_mastery_subject_idx
        ON neon_question_mastery(firebase_uid, subject_id, status, updated_at DESC);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function identifier(value, fallback = 'unknown', max = 180) {
  const cleaned = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
  return cleaned || fallback;
}

function integer(value, minimum, maximum, fallback = 0) {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function safeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const serialized = JSON.stringify(value);
    return Buffer.byteLength(serialized) <= 2_000 ? JSON.parse(serialized) : {};
  } catch { return {}; }
}

function normalizeRecord(subjectId, raw) {
  const statuses = new Set(['new', 'learning', 'review', 'reinforcing', 'mastered']);
  const status = statuses.has(raw?.status) ? raw.status : 'learning';
  const attempts = integer(raw?.attempts, 0, 100_000);
  const correctCount = integer(raw?.correctCount, 0, attempts, 0);
  const wrongCount = integer(raw?.wrongCount, 0, attempts, Math.max(0, attempts - correctCount));
  const correctStreak = integer(raw?.correctStreak, 0, 1000);
  const masteryScore = integer(raw?.masteryScore, 0, 100);
  return {
    subjectId,
    questionId: identifier(raw?.questionId || raw?.id, '', 220),
    status,
    attempts,
    correctCount,
    wrongCount,
    correctStreak,
    masteryScore,
    lastAnswerCorrect: typeof raw?.lastAnswerCorrect === 'boolean' ? raw.lastAnswerCorrect : null,
    nextReviewAt: dateValue(raw?.nextReviewAt),
    lastSeenAt: dateValue(raw?.lastSeenAt) || new Date().toISOString(),
    masteredAt: status === 'mastered' ? dateValue(raw?.masteredAt) || new Date().toISOString() : null,
    metadata: safeMetadata(raw?.metadata)
  };
}

async function loadQuestionMastery(uid, subjectId) {
  await ensureSchema();
  const result = await pool.query(`
    SELECT question_id, status, attempts, correct_count, wrong_count, correct_streak,
      mastery_score, last_answer_correct, next_review_at, first_seen_at, last_seen_at,
      mastered_at, metadata, updated_at
    FROM neon_question_mastery
    WHERE firebase_uid=$1 AND subject_id=$2
    ORDER BY updated_at DESC
    LIMIT 10000
  `, [uid, subjectId]);

  return {
    ok: true,
    subjectId,
    serverNow: new Date().toISOString(),
    records: result.rows.map(row => ({
      questionId: row.question_id,
      status: row.status,
      attempts: Number(row.attempts || 0),
      correctCount: Number(row.correct_count || 0),
      wrongCount: Number(row.wrong_count || 0),
      correctStreak: Number(row.correct_streak || 0),
      masteryScore: Number(row.mastery_score || 0),
      lastAnswerCorrect: row.last_answer_correct,
      nextReviewAt: row.next_review_at,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      masteredAt: row.mastered_at,
      metadata: row.metadata || {},
      updatedAt: row.updated_at
    }))
  };
}

async function saveQuestionMastery(uid, body) {
  await ensureSchema();
  const subjectId = identifier(body?.subjectId, '', 100);
  if (!subjectId) throw Object.assign(new Error('SUBJECT_REQUIRED'), { statusCode: 400 });
  const records = (Array.isArray(body?.records) ? body.records : [])
    .slice(0, 250)
    .map(record => normalizeRecord(subjectId, record))
    .filter(record => record.questionId);
  if (!records.length) return { ok: true, subjectId, saved: 0 };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const record of records) {
      await client.query(`
        INSERT INTO neon_question_mastery (
          firebase_uid, subject_id, question_id, status, attempts, correct_count,
          wrong_count, correct_streak, mastery_score, last_answer_correct,
          next_review_at, last_seen_at, mastered_at, metadata, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,NOW())
        ON CONFLICT (firebase_uid, subject_id, question_id) DO UPDATE SET
          status=EXCLUDED.status,
          attempts=EXCLUDED.attempts,
          correct_count=EXCLUDED.correct_count,
          wrong_count=EXCLUDED.wrong_count,
          correct_streak=EXCLUDED.correct_streak,
          mastery_score=EXCLUDED.mastery_score,
          last_answer_correct=EXCLUDED.last_answer_correct,
          next_review_at=EXCLUDED.next_review_at,
          last_seen_at=EXCLUDED.last_seen_at,
          mastered_at=EXCLUDED.mastered_at,
          metadata=neon_question_mastery.metadata || EXCLUDED.metadata,
          updated_at=NOW()
      `, [
        uid, record.subjectId, record.questionId, record.status, record.attempts,
        record.correctCount, record.wrongCount, record.correctStreak, record.masteryScore,
        record.lastAnswerCorrect, record.nextReviewAt, record.lastSeenAt,
        record.masteredAt, JSON.stringify(record.metadata)
      ]);
    }
    await client.query('COMMIT');
    return { ok: true, subjectId, saved: records.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function publicError(error) {
  const code = error?.message || 'MASTERY_ERROR';
  if (code === 'AUTH_REQUIRED') return { status: 401, code, message: 'يجب تسجيل الدخول لحفظ مستوى إتقان الأسئلة.' };
  if (code.startsWith('INVALID_AUTH') || code === 'UNKNOWN_AUTH_KEY' || code === 'AUTH_TOKEN_EXPIRED') return { status: 401, code, message: 'تعذر التحقق من جلسة الحساب. أعد تسجيل الدخول.' };
  if (code === 'DATABASE_NOT_CONFIGURED') return { status: 503, code, message: 'قاعدة بيانات التقدم غير مرتبطة.' };
  if (code === 'SUBJECT_REQUIRED') return { status: 400, code, message: 'المادة مطلوبة.' };
  if (error?.statusCode) return { status: error.statusCode, code, message: 'تعذر تنفيذ الطلب.' };
  return { status: 500, code: 'MASTERY_ERROR', message: 'حدث خطأ أثناء حفظ إتقان الأسئلة.' };
}

export async function handleQuestionMasteryApi(req, res, requestPath, readJsonBody) {
  if (!requestPath.startsWith('/api/mastery')) return false;
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return true;
  }

  if (requestPath === '/api/mastery/status' && req.method === 'GET') {
    json(res, 200, {
      configured: Boolean(pool),
      database: pool ? 'postgresql' : null,
      firebaseProjectId,
      authentication: 'firebase-id-token'
    }, cors);
    return true;
  }

  try {
    const identity = await authenticate(req);
    if (requestPath === '/api/mastery/questions' && req.method === 'GET') {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const subjectId = identifier(url.searchParams.get('subject'), '', 100);
      if (!subjectId) throw Object.assign(new Error('SUBJECT_REQUIRED'), { statusCode: 400 });
      json(res, 200, await loadQuestionMastery(identity.uid, subjectId), cors);
      return true;
    }
    if (requestPath === '/api/mastery/questions' && req.method === 'POST') {
      const body = await readJsonBody(req);
      json(res, 200, await saveQuestionMastery(identity.uid, body), cors);
      return true;
    }
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { ...cors, Allow: 'GET, POST, OPTIONS' });
  } catch (error) {
    console.error('Question mastery API error:', error?.message, error?.code || '');
    const result = publicError(error);
    json(res, result.status, { error: result.code, message: result.message }, cors);
  }
  return true;
}

export async function closeQuestionMasteryDatabase() {
  if (pool) await pool.end();
}
