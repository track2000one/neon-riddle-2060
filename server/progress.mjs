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
  max: Math.max(2, Math.min(12, Number(process.env.PG_POOL_MAX || 6))),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
}) : null;

let schemaPromise;
let certificateCache = { expiresAt: 0, values: null };

const xpRules = {
  lesson_start: 0,
  lesson_progress: 0,
  lesson_complete: 30,
  exam_start: 0,
  exam_complete: 20,
  game_start: 0,
  game_complete: 15,
  step_training_complete: 25,
  coding_lesson_complete: 35,
  activity: 0,
  legacy_import: 0
};

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
  if (!Number.isFinite(payload.iat) || payload.iat > now + 300) throw Object.assign(new Error('INVALID_AUTH_TIME'), { statusCode: 401 });
  if (payload.auth_time && payload.auth_time > now + 300) throw Object.assign(new Error('INVALID_AUTH_TIME'), { statusCode: 401 });

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.slice(0, 320) : '',
    name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : '',
    emailVerified: payload.email_verified === true
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
      CREATE TABLE IF NOT EXISTS neon_users (
        firebase_uid TEXT PRIMARY KEY,
        email TEXT NOT NULL DEFAULT '',
        display_name TEXT NOT NULL DEFAULT '',
        xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
        last_active_date DATE,
        last_activity_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS neon_progress_items (
        firebase_uid TEXT NOT NULL REFERENCES neon_users(firebase_uid) ON DELETE CASCADE,
        center_id TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
        progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
        mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
        best_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 100),
        attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        xp_earned INTEGER NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
        last_position JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, center_id, item_type, item_id)
      );

      CREATE TABLE IF NOT EXISTS neon_assessment_attempts (
        id BIGSERIAL PRIMARY KEY,
        firebase_uid TEXT NOT NULL REFERENCES neon_users(firebase_uid) ON DELETE CASCADE,
        center_id TEXT NOT NULL,
        assessment_id TEXT NOT NULL,
        subject_id TEXT NOT NULL DEFAULT '',
        score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
        correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
        total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
        duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
        details JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS neon_xp_events (
        firebase_uid TEXT NOT NULL REFERENCES neon_users(firebase_uid) ON DELETE CASCADE,
        event_key TEXT NOT NULL,
        event_type TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, event_key)
      );

      CREATE TABLE IF NOT EXISTS neon_user_achievements (
        firebase_uid TEXT NOT NULL REFERENCES neon_users(firebase_uid) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL,
        achievement_type TEXT NOT NULL DEFAULT 'badge',
        title TEXT NOT NULL DEFAULT '',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (firebase_uid, achievement_id)
      );

      CREATE INDEX IF NOT EXISTS neon_progress_updated_idx ON neon_progress_items(firebase_uid, updated_at DESC);
      CREATE INDEX IF NOT EXISTS neon_progress_center_idx ON neon_progress_items(firebase_uid, center_id);
      CREATE INDEX IF NOT EXISTS neon_attempts_user_idx ON neon_assessment_attempts(firebase_uid, created_at DESC);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function cleanText(value, max = 160) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanIdentifier(value, fallback = 'unknown', max = 180) {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_:\-.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
  return cleaned || fallback;
}

function integer(value, minimum, maximum, fallback = 0) {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

function score(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number * 100) / 100)) : 0;
}

function safeObject(value, maxBytes = 12_000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized) > maxBytes) return {};
    return JSON.parse(serialized);
  } catch { return {}; }
}

function normalizeStatus(value, progressPercent) {
  if (value === 'completed' || progressPercent >= 100) return 'completed';
  if (value === 'in_progress' || progressPercent > 0) return 'in_progress';
  return 'not_started';
}

function xpForEvent(eventType, event) {
  const base = xpRules[eventType] ?? 0;
  const eventScore = score(event.score ?? event.masteryScore);
  let bonus = 0;
  if (eventType === 'lesson_complete' && eventScore >= 80) bonus = 10;
  if (eventType === 'exam_complete') bonus = eventScore >= 90 ? 20 : eventScore >= 75 ? 10 : 0;
  if (eventType === 'game_complete') bonus = eventScore >= 90 ? 10 : eventScore >= 70 ? 5 : 0;
  return Math.min(60, base + bonus);
}

async function upsertUser(client, identity) {
  await client.query(`
    INSERT INTO neon_users (firebase_uid, email, display_name, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email = CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE neon_users.email END,
      display_name = CASE WHEN EXCLUDED.display_name <> '' THEN EXCLUDED.display_name ELSE neon_users.display_name END,
      updated_at = NOW()
  `, [identity.uid, identity.email, identity.name]);
}

async function updateStreak(client, uid) {
  await client.query(`
    UPDATE neon_users SET
      streak = CASE
        WHEN last_active_date = (NOW() AT TIME ZONE 'Asia/Riyadh')::date THEN streak
        WHEN last_active_date = ((NOW() AT TIME ZONE 'Asia/Riyadh')::date - 1) THEN streak + 1
        ELSE 1
      END,
      last_active_date = (NOW() AT TIME ZONE 'Asia/Riyadh')::date,
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE firebase_uid = $1
  `, [uid]);
}

async function awardXp(client, uid, eventKey, eventType, event) {
  const xp = xpForEvent(eventType, event);
  if (!eventKey || xp <= 0) return 0;
  const inserted = await client.query(`
    INSERT INTO neon_xp_events (firebase_uid, event_key, event_type, xp, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    ON CONFLICT DO NOTHING
    RETURNING xp
  `, [uid, eventKey, eventType, xp, JSON.stringify(safeObject(event.metadata, 4_000))]);
  const awarded = Number(inserted.rows[0]?.xp || 0);
  if (awarded > 0) {
    await client.query('UPDATE neon_users SET xp = xp + $2, updated_at = NOW() WHERE firebase_uid = $1', [uid, awarded]);
  }
  return awarded;
}

async function upsertProgress(client, uid, event, awardedXp = 0) {
  const centerId = cleanIdentifier(event.centerId, 'general', 80);
  const itemType = cleanIdentifier(event.itemType, 'activity', 80);
  const itemId = cleanIdentifier(event.itemId, `${itemType}-${Date.now()}`, 180);
  const progressPercent = integer(event.progressPercent, 0, 100, event.status === 'completed' ? 100 : 0);
  const status = normalizeStatus(event.status, progressPercent);
  const attemptsDelta = ['exam_complete', 'game_complete', 'step_training_complete'].includes(event.eventType) ? 1 : 0;
  const masteryScore = score(event.masteryScore ?? event.score);
  const bestScore = score(event.score ?? event.masteryScore);
  const metadata = safeObject({ ...event.metadata, href: cleanText(event.href, 500) }, 12_000);
  const position = safeObject(event.position, 8_000);

  await client.query(`
    INSERT INTO neon_progress_items (
      firebase_uid, center_id, item_type, item_id, title, status, progress_percent,
      mastery_score, best_score, attempts, xp_earned, last_position, metadata,
      started_at, completed_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,
      CASE WHEN $6 <> 'not_started' THEN NOW() ELSE NULL END,
      CASE WHEN $6 = 'completed' THEN NOW() ELSE NULL END,
      NOW()
    )
    ON CONFLICT (firebase_uid, center_id, item_type, item_id) DO UPDATE SET
      title = CASE WHEN EXCLUDED.title <> '' THEN EXCLUDED.title ELSE neon_progress_items.title END,
      status = CASE WHEN
        (CASE neon_progress_items.status WHEN 'completed' THEN 2 WHEN 'in_progress' THEN 1 ELSE 0 END) >=
        (CASE EXCLUDED.status WHEN 'completed' THEN 2 WHEN 'in_progress' THEN 1 ELSE 0 END)
        THEN neon_progress_items.status ELSE EXCLUDED.status END,
      progress_percent = GREATEST(neon_progress_items.progress_percent, EXCLUDED.progress_percent),
      mastery_score = GREATEST(neon_progress_items.mastery_score, EXCLUDED.mastery_score),
      best_score = GREATEST(neon_progress_items.best_score, EXCLUDED.best_score),
      attempts = neon_progress_items.attempts + EXCLUDED.attempts,
      xp_earned = neon_progress_items.xp_earned + EXCLUDED.xp_earned,
      last_position = CASE WHEN EXCLUDED.last_position = '{}'::jsonb THEN neon_progress_items.last_position ELSE EXCLUDED.last_position END,
      metadata = neon_progress_items.metadata || EXCLUDED.metadata,
      started_at = COALESCE(neon_progress_items.started_at, EXCLUDED.started_at, NOW()),
      completed_at = CASE WHEN neon_progress_items.completed_at IS NOT NULL THEN neon_progress_items.completed_at ELSE EXCLUDED.completed_at END,
      updated_at = NOW()
  `, [
    uid, centerId, itemType, itemId, cleanText(event.title, 240), status, progressPercent,
    masteryScore, bestScore, attemptsDelta, awardedXp, JSON.stringify(position), JSON.stringify(metadata)
  ]);

  if (['exam_complete', 'game_complete', 'step_training_complete'].includes(event.eventType)) {
    await client.query(`
      INSERT INTO neon_assessment_attempts (
        firebase_uid, center_id, assessment_id, subject_id, score,
        correct_count, total_count, duration_seconds, details
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    `, [
      uid, centerId, itemId, cleanIdentifier(event.subjectId, '', 100), bestScore,
      integer(event.correct, 0, 100_000), integer(event.total, 0, 100_000),
      integer(event.durationSeconds, 0, 86_400), JSON.stringify(safeObject(event.details, 20_000))
    ]);
  }
}

async function saveActivity(identity, rawEvent) {
  await ensureSchema();
  const event = rawEvent && typeof rawEvent === 'object' ? rawEvent : {};
  const eventType = cleanIdentifier(event.eventType, 'activity', 80);
  const eventKey = cleanIdentifier(event.eventKey, `${eventType}:${event.centerId || 'general'}:${event.itemId || Date.now()}`, 220);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await upsertUser(client, identity);
    await updateStreak(client, identity.uid);
    const awardedXp = await awardXp(client, identity.uid, eventKey, eventType, { ...event, eventType });
    await upsertProgress(client, identity.uid, { ...event, eventType }, awardedXp);
    await client.query('COMMIT');
    return { ok: true, awardedXp };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function progressSummary(identity) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await upsertUser(client, identity);
    const userResult = await client.query(`
      SELECT u.xp, u.streak, u.last_activity_at,
        (SELECT COUNT(*)::int FROM neon_user_achievements a WHERE a.firebase_uid=u.firebase_uid AND a.achievement_type='certificate') AS certificates
      FROM neon_users u WHERE u.firebase_uid=$1
    `, [identity.uid]);
    const totalsResult = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='completed')::int AS completed_items,
        COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress_items,
        COALESCE(ROUND(AVG(NULLIF(mastery_score,0))),0)::int AS mastery,
        COALESCE(SUM(attempts),0)::int AS attempts
      FROM neon_progress_items WHERE firebase_uid=$1
    `, [identity.uid]);
    const centersResult = await client.query(`
      SELECT center_id,
        COUNT(*) FILTER (WHERE status='completed')::int AS completed,
        COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress,
        COALESCE(ROUND(AVG(NULLIF(mastery_score,0))),0)::int AS mastery,
        COALESCE(SUM(attempts),0)::int AS attempts,
        MAX(updated_at) AS updated_at
      FROM neon_progress_items WHERE firebase_uid=$1
      GROUP BY center_id ORDER BY MAX(updated_at) DESC
    `, [identity.uid]);
    const continueResult = await client.query(`
      SELECT center_id, item_type, item_id, title, status, progress_percent,
        mastery_score::float, last_position, metadata, updated_at
      FROM neon_progress_items
      WHERE firebase_uid=$1
      ORDER BY (status='in_progress') DESC, updated_at DESC
      LIMIT 1
    `, [identity.uid]);
    const recentResult = await client.query(`
      SELECT center_id, item_type, item_id, title, status, progress_percent,
        mastery_score::float, metadata, updated_at
      FROM neon_progress_items WHERE firebase_uid=$1
      ORDER BY updated_at DESC LIMIT 8
    `, [identity.uid]);
    await client.query('COMMIT');

    const user = userResult.rows[0] || {};
    const totals = totalsResult.rows[0] || {};
    const continuation = continueResult.rows[0] || null;
    return {
      ok: true,
      user: { uid: identity.uid, email: identity.email, name: identity.name },
      metrics: {
        xp: Number(user.xp || 0),
        completedItems: Number(totals.completed_items || 0),
        inProgressItems: Number(totals.in_progress_items || 0),
        mastery: Number(totals.mastery || 0),
        attempts: Number(totals.attempts || 0),
        streak: Number(user.streak || 0),
        certificates: Number(user.certificates || 0),
        lastActivityAt: user.last_activity_at || null
      },
      centers: centersResult.rows.map(row => ({
        centerId: row.center_id,
        completed: Number(row.completed || 0),
        inProgress: Number(row.in_progress || 0),
        mastery: Number(row.mastery || 0),
        attempts: Number(row.attempts || 0),
        updatedAt: row.updated_at
      })),
      continue: continuation ? {
        centerId: continuation.center_id,
        itemType: continuation.item_type,
        itemId: continuation.item_id,
        title: continuation.title,
        status: continuation.status,
        progressPercent: Number(continuation.progress_percent || 0),
        masteryScore: Number(continuation.mastery_score || 0),
        position: continuation.last_position || {},
        href: continuation.metadata?.href || null,
        updatedAt: continuation.updated_at
      } : null,
      recent: recentResult.rows.map(row => ({
        centerId: row.center_id,
        itemType: row.item_type,
        itemId: row.item_id,
        title: row.title,
        status: row.status,
        progressPercent: Number(row.progress_percent || 0),
        masteryScore: Number(row.mastery_score || 0),
        href: row.metadata?.href || null,
        updatedAt: row.updated_at
      }))
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function importLegacy(identity, body) {
  const events = Array.isArray(body?.events) ? body.events.slice(0, 500) : [];
  let imported = 0;
  for (const [index, event] of events.entries()) {
    if (!event || typeof event !== 'object') continue;
    await saveActivity(identity, {
      ...event,
      eventType: 'legacy_import',
      eventKey: `legacy:${cleanIdentifier(event.centerId, 'general', 80)}:${cleanIdentifier(event.itemType, 'item', 80)}:${cleanIdentifier(event.itemId, String(index), 180)}`
    });
    imported += 1;
  }
  return { ok: true, imported };
}

function publicError(error) {
  const code = error?.message || 'PROGRESS_ERROR';
  if (code === 'AUTH_REQUIRED') return { status: 401, code, message: 'يجب تسجيل الدخول لحفظ التقدم.' };
  if (code.startsWith('INVALID_AUTH') || code === 'UNKNOWN_AUTH_KEY' || code === 'AUTH_TOKEN_EXPIRED') return { status: 401, code, message: 'انتهت جلسة الحساب أو تعذر التحقق منها. أعد تسجيل الدخول.' };
  if (code === 'DATABASE_NOT_CONFIGURED') return { status: 503, code, message: 'لم يتم ربط DATABASE_URL بقاعدة PostgreSQL بعد.' };
  if (error?.statusCode) return { status: error.statusCode, code, message: 'تعذر تنفيذ الطلب.' };
  return { status: 500, code: 'PROGRESS_ERROR', message: 'حدث خطأ أثناء حفظ تقدم الطالب.' };
}

export async function handleProgressApi(req, res, requestPath, readJsonBody) {
  if (!requestPath.startsWith('/api/progress')) return false;
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return true;
  }

  if (requestPath === '/api/progress/status' && req.method === 'GET') {
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
    if (requestPath === '/api/progress/me' && req.method === 'GET') {
      json(res, 200, await progressSummary(identity), cors);
      return true;
    }
    if (requestPath === '/api/progress/activity' && req.method === 'POST') {
      const body = await readJsonBody(req);
      json(res, 200, await saveActivity(identity, body), cors);
      return true;
    }
    if (requestPath === '/api/progress/sync' && req.method === 'POST') {
      const body = await readJsonBody(req);
      json(res, 200, await importLegacy(identity, body), cors);
      return true;
    }
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { ...cors, Allow: 'GET, POST, OPTIONS' });
  } catch (error) {
    console.error('Progress API error:', error?.message, error?.code || '');
    const result = publicError(error);
    json(res, result.status, { error: result.code, message: result.message }, cors);
  }
  return true;
}

export async function closeProgressDatabase() {
  if (pool) await pool.end();
}
