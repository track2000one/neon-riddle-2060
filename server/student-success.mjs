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
  max: Math.max(2, Math.min(8, Number(process.env.SUCCESS_PG_POOL_MAX || 4))),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
}) : null;

let schemaPromise;
let certificateCache = { expiresAt: 0, values: null };

const trackMeta = {
  tahsili: { title: 'التحصيلي العلمي', href: '/exams', subjectId: 'tahsili-biology' },
  qudurat: { title: 'اختبار القدرات', href: '/exams', subjectId: 'qudurat-quant' },
  step: { title: 'اختبار STEP', href: '/step', subjectId: 'step' },
  mixed: { title: 'خطة متعددة المسارات', href: '/exams', subjectId: '' }
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
  if (!payload.sub || payload.exp <= now) throw Object.assign(new Error('AUTH_TOKEN_EXPIRED'), { statusCode: 401 });
  return {
    uid: String(payload.sub).slice(0, 128),
    email: typeof payload.email === 'string' ? payload.email.slice(0, 320) : '',
    name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : ''
  };
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanId(value, fallback = '', max = 180) {
  const cleaned = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_:\-.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
  return cleaned || fallback;
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
}

function safeObject(value, maxBytes = 8_000) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized) > maxBytes) return {};
    return JSON.parse(serialized);
  } catch { return {}; }
}

async function ensureSchema() {
  if (!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { statusCode: 503 });
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS neon_student_goals (
        firebase_uid TEXT PRIMARY KEY,
        exam_track TEXT NOT NULL DEFAULT 'tahsili',
        exam_date DATE,
        target_score INTEGER NOT NULL DEFAULT 80 CHECK (target_score BETWEEN 50 AND 100),
        daily_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_minutes BETWEEN 10 AND 180),
        onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS neon_question_reports (
        id BIGSERIAL PRIMARY KEY,
        firebase_uid TEXT NOT NULL,
        question_id TEXT NOT NULL DEFAULT '',
        subject_id TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT 'other',
        note TEXT NOT NULL DEFAULT '',
        question_text TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'new',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS neon_product_events (
        id BIGSERIAL PRIMARY KEY,
        firebase_uid TEXT NOT NULL,
        event_name TEXT NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS neon_question_reports_status_idx ON neon_question_reports(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS neon_product_events_user_idx ON neon_product_events(firebase_uid, created_at DESC);
      CREATE INDEX IF NOT EXISTS neon_product_events_name_idx ON neon_product_events(event_name, created_at DESC);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function profileFromRow(row = {}) {
  return {
    examTrack: trackMeta[row.exam_track] ? row.exam_track : 'tahsili',
    examDate: row.exam_date ? new Date(row.exam_date).toISOString().slice(0, 10) : '',
    targetScore: Number(row.target_score || 80),
    dailyMinutes: Number(row.daily_minutes || 30),
    onboardingComplete: row.onboarding_complete === true,
    updatedAt: row.updated_at || null
  };
}

async function getProfile(identity) {
  await ensureSchema();
  const result = await pool.query('SELECT * FROM neon_student_goals WHERE firebase_uid=$1', [identity.uid]);
  return profileFromRow(result.rows[0]);
}

async function saveProfile(identity, body) {
  await ensureSchema();
  const examTrack = trackMeta[body?.examTrack] ? body.examTrack : 'tahsili';
  const targetScore = boundedInteger(body?.targetScore, 50, 100, 80);
  const dailyMinutes = boundedInteger(body?.dailyMinutes, 10, 180, 30);
  let examDate = null;
  if (body?.examDate) {
    const parsed = new Date(`${String(body.examDate).slice(0, 10)}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) examDate = parsed.toISOString().slice(0, 10);
  }
  const onboardingComplete = Boolean(examDate && examTrack && targetScore && dailyMinutes);
  const result = await pool.query(`
    INSERT INTO neon_student_goals (
      firebase_uid, exam_track, exam_date, target_score, daily_minutes, onboarding_complete, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      exam_track=EXCLUDED.exam_track,
      exam_date=EXCLUDED.exam_date,
      target_score=EXCLUDED.target_score,
      daily_minutes=EXCLUDED.daily_minutes,
      onboarding_complete=EXCLUDED.onboarding_complete,
      updated_at=NOW()
    RETURNING *
  `, [identity.uid, examTrack, examDate, targetScore, dailyMinutes, onboardingComplete]);
  return profileFromRow(result.rows[0]);
}

async function relationExists(client, relation) {
  const result = await client.query('SELECT to_regclass($1) AS name', [`public.${relation}`]);
  return Boolean(result.rows[0]?.name);
}

function readinessLabel(value) {
  if (value >= 85) return 'جاهزية مرتفعة';
  if (value >= 70) return 'جاهزية جيدة';
  if (value >= 50) return 'جاهزية متوسطة';
  if (value > 0) return 'تحتاج خطة مركزة';
  return 'ابدأ بالتشخيص';
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const target = new Date(`${dateValue}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil((target - today) / 86_400_000));
}

function subjectName(subjectId) {
  return {
    'tahsili-math': 'رياضيات التحصيلي',
    'tahsili-physics': 'فيزياء التحصيلي',
    'tahsili-chemistry': 'كيمياء التحصيلي',
    'tahsili-biology': 'أحياء التحصيلي',
    'qudurat-verbal': 'القدرات اللفظية',
    'qudurat-quant': 'القدرات الكمية',
    step: 'اللغة الإنجليزية STEP'
  }[subjectId] || subjectId || 'المسار المستهدف';
}

function buildPlan(profile, stats, weakSubjects) {
  const minutes = profile.dailyMinutes || 30;
  const meta = trackMeta[profile.examTrack] || trackMeta.tahsili;
  if (!stats.sessions) {
    return [
      { id: 'diagnostic', title: `اختبار تشخيصي في ${meta.title}`, description: 'ابدأ بقياس المستوى حتى تبنى الخطة على بياناتك الفعلية.', minutes: Math.min(25, minutes), href: meta.href, type: 'diagnostic' },
      { id: 'orientation', title: 'استكشف تقرير نقاط القوة والضعف', description: 'بعد التشخيص ستظهر أولوياتك ومؤشر الجاهزية.', minutes: 5, href: meta.href, type: 'report' }
    ];
  }

  const weak = weakSubjects[0]?.subjectId || meta.subjectId;
  const focusedMinutes = Math.max(10, Math.round(minutes * 0.5));
  const reviewMinutes = Math.max(5, Math.round(minutes * 0.25));
  const simulationMinutes = Math.max(5, minutes - focusedMinutes - reviewMinutes);
  return [
    { id: 'review-errors', title: 'مراجعة دفتر الأخطاء', description: 'راجع الأسئلة المستحقة وسبب الخطأ قبل بدء أسئلة جديدة.', minutes: reviewMinutes, href: '/exams#notebook', type: 'review' },
    { id: 'focused-practice', title: `تدريب مركز: ${subjectName(weak)}`, description: 'جلسة ذكية تعطي الأولوية للمهارات الأقل أداءً.', minutes: focusedMinutes, href: weak === 'step' ? '/step' : `/exams?subject=${encodeURIComponent(weak)}`, type: 'practice' },
    { id: 'mini-simulation', title: 'محاكاة قصيرة', description: 'اختبار قصير لقياس ثبات المعلومة والسرعة تحت الوقت.', minutes: simulationMinutes, href: meta.href, type: 'simulation' }
  ];
}

async function dashboard(identity) {
  await ensureSchema();
  const profile = await getProfile(identity);
  const client = await pool.connect();
  try {
    const hasAttempts = await relationExists(client, 'neon_assessment_attempts');
    const hasProgress = await relationExists(client, 'neon_progress_items');
    let current = { sessions: 0, questions: 0, correct: 0, minutes: 0, average: 0, latest: 0 };
    let previousAverage = 0;
    let weakSubjects = [];
    let mastery = 0;

    if (hasAttempts) {
      const currentResult = await client.query(`
        SELECT COUNT(*)::int AS sessions,
          COALESCE(SUM(total_count),0)::int AS questions,
          COALESCE(SUM(correct_count),0)::int AS correct,
          COALESCE(ROUND(SUM(duration_seconds)/60.0),0)::int AS minutes,
          COALESCE(ROUND(AVG(score)),0)::int AS average,
          COALESCE((ARRAY_AGG(score ORDER BY created_at DESC))[1],0)::int AS latest
        FROM neon_assessment_attempts
        WHERE firebase_uid=$1 AND created_at >= NOW() - INTERVAL '7 days'
      `, [identity.uid]);
      current = { ...current, ...(currentResult.rows[0] || {}) };
      const previousResult = await client.query(`
        SELECT COALESCE(ROUND(AVG(score)),0)::int AS average
        FROM neon_assessment_attempts
        WHERE firebase_uid=$1
          AND created_at >= NOW() - INTERVAL '14 days'
          AND created_at < NOW() - INTERVAL '7 days'
      `, [identity.uid]);
      previousAverage = Number(previousResult.rows[0]?.average || 0);
      const weakResult = await client.query(`
        SELECT subject_id, COUNT(*)::int AS sessions, COALESCE(ROUND(AVG(score)),0)::int AS average
        FROM neon_assessment_attempts
        WHERE firebase_uid=$1 AND subject_id <> ''
        GROUP BY subject_id
        ORDER BY AVG(score) ASC, COUNT(*) DESC
        LIMIT 3
      `, [identity.uid]);
      weakSubjects = weakResult.rows.map(row => ({
        subjectId: row.subject_id,
        title: subjectName(row.subject_id),
        average: Number(row.average || 0),
        sessions: Number(row.sessions || 0)
      }));
    }

    if (hasProgress) {
      const masteryResult = await client.query(`
        SELECT COALESCE(ROUND(AVG(NULLIF(mastery_score,0))),0)::int AS mastery
        FROM neon_progress_items WHERE firebase_uid=$1
      `, [identity.uid]);
      mastery = Number(masteryResult.rows[0]?.mastery || 0);
    }

    const average = Number(current.average || 0);
    const latest = Number(current.latest || 0);
    const sessions = Number(current.sessions || 0);
    const readiness = sessions
      ? Math.max(0, Math.min(100, Math.round(average * 0.55 + latest * 0.25 + mastery * 0.20)))
      : mastery ? Math.round(mastery * 0.7) : 0;
    const trend = previousAverage ? average - previousAverage : 0;
    const stats = {
      sessions,
      questions: Number(current.questions || 0),
      correct: Number(current.correct || 0),
      minutes: Number(current.minutes || 0),
      average,
      previousAverage,
      trend
    };

    return {
      ok: true,
      profile,
      target: {
        title: trackMeta[profile.examTrack]?.title || trackMeta.tahsili.title,
        daysRemaining: daysUntil(profile.examDate),
        score: profile.targetScore
      },
      readiness: { value: readiness, label: readinessLabel(readiness), mastery },
      week: stats,
      weakSubjects,
      plan: buildPlan(profile, stats, weakSubjects)
    };
  } finally {
    client.release();
  }
}

async function reportQuestion(identity, body) {
  await ensureSchema();
  const reasons = new Set(['wrong-answer', 'unclear', 'duplicate', 'typo', 'other']);
  const reason = reasons.has(body?.reason) ? body.reason : 'other';
  const result = await pool.query(`
    INSERT INTO neon_question_reports (
      firebase_uid, question_id, subject_id, reason, note, question_text
    ) VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id, created_at
  `, [
    identity.uid,
    cleanId(body?.questionId, '', 180),
    cleanId(body?.subjectId, '', 100),
    reason,
    cleanText(body?.note, 1_000),
    cleanText(body?.questionText, 1_500)
  ]);
  return { ok: true, reportId: Number(result.rows[0].id), createdAt: result.rows[0].created_at };
}

async function recordEvent(identity, body) {
  await ensureSchema();
  const eventName = cleanId(body?.eventName, 'activity', 100);
  await pool.query(`
    INSERT INTO neon_product_events (firebase_uid, event_name, properties)
    VALUES ($1,$2,$3::jsonb)
  `, [identity.uid, eventName, JSON.stringify(safeObject(body?.properties, 8_000))]);
  return { ok: true };
}

function publicError(error) {
  const code = error?.message || 'SUCCESS_ERROR';
  if (code === 'AUTH_REQUIRED' || code.startsWith('INVALID_AUTH') || code === 'UNKNOWN_AUTH_KEY' || code === 'AUTH_TOKEN_EXPIRED') {
    return { status: 401, code, message: 'انتهت جلسة الحساب أو تعذر التحقق منها.' };
  }
  if (code === 'DATABASE_NOT_CONFIGURED') return { status: 503, code, message: 'قاعدة البيانات غير مهيأة بعد.' };
  if (error?.statusCode) return { status: error.statusCode, code, message: 'تعذر تنفيذ الطلب.' };
  return { status: 500, code: 'SUCCESS_ERROR', message: 'تعذر تحميل لوحة النجاح مؤقتًا.' };
}

export async function handleStudentSuccessApi(req, res, requestPath, readJsonBody) {
  if (!requestPath.startsWith('/api/success')) return false;
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return true;
  }
  if (requestPath === '/api/success/status' && req.method === 'GET') {
    json(res, 200, { configured: Boolean(pool), features: ['goals', 'readiness', 'daily-plan', 'weekly-report', 'question-reports', 'analytics'] }, cors);
    return true;
  }

  try {
    const identity = await authenticate(req);
    if (requestPath === '/api/success/profile' && req.method === 'GET') {
      json(res, 200, { ok: true, profile: await getProfile(identity) }, cors);
      return true;
    }
    if (requestPath === '/api/success/profile' && req.method === 'PUT') {
      json(res, 200, { ok: true, profile: await saveProfile(identity, await readJsonBody(req)) }, cors);
      return true;
    }
    if (requestPath === '/api/success/dashboard' && req.method === 'GET') {
      json(res, 200, await dashboard(identity), cors);
      return true;
    }
    if (requestPath === '/api/success/question-report' && req.method === 'POST') {
      json(res, 201, await reportQuestion(identity, await readJsonBody(req)), cors);
      return true;
    }
    if (requestPath === '/api/success/event' && req.method === 'POST') {
      json(res, 200, await recordEvent(identity, await readJsonBody(req)), cors);
      return true;
    }
    json(res, 405, { error: 'METHOD_NOT_ALLOWED' }, { ...cors, Allow: 'GET, POST, PUT, OPTIONS' });
  } catch (error) {
    console.error('Student success API error:', error?.message || error);
    const result = publicError(error);
    json(res, result.status, { error: result.code, message: result.message }, cors);
  }
  return true;
}

export async function closeStudentSuccessDatabase() {
  if (pool) await pool.end();
}
