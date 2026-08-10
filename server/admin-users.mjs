import { createPublicKey, verify as verifySignature } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;
const databaseUrl = String(process.env.DATABASE_URL || process.env.PROGRESS_DATABASE_URL || '').trim();
const firebaseProjectId = String(process.env.FIREBASE_PROJECT_ID || 'neon-riddle-2060-admin').trim();
const firebaseCertUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const configuredAdminUids = new Set(String(process.env.NEON_ADMIN_UIDS || '').split(',').map(value => value.trim()).filter(Boolean));
const configuredAdminEmails = new Set(String(process.env.NEON_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  max: Math.max(2, Math.min(6, Number(process.env.ADMIN_USERS_PG_POOL_MAX || 3))),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
}) : null;

const ROLES = new Set(['super-admin', 'content-admin', 'support', 'student']);
const CAPABILITIES = {
  'super-admin': ['dashboard.read', 'content.read', 'content.manage', 'reports.manage', 'duplicates.read', 'audit.read', 'users.read', 'users.manage'],
  'content-admin': ['dashboard.read', 'content.read', 'content.manage', 'reports.manage', 'duplicates.read', 'audit.read'],
  support: ['dashboard.read', 'reports.manage', 'audit.read', 'users.read'],
  student: []
};

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
  const verified = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey(certificate), base64UrlDecode(parts[2]));
  if (!verified) throw Object.assign(new Error('INVALID_AUTH_SIGNATURE'), { statusCode: 401 });
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== firebaseProjectId || payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) throw Object.assign(new Error('INVALID_AUTH_AUDIENCE'), { statusCode: 401 });
  if (!payload.sub || Number(payload.exp || 0) <= now) throw Object.assign(new Error('AUTH_TOKEN_EXPIRED'), { statusCode: 401 });
  return {
    uid: String(payload.sub).slice(0, 128),
    email: typeof payload.email === 'string' ? payload.email.slice(0, 320) : '',
    name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : '',
    claimAdmin: payload.admin === true || ['admin', 'super-admin'].includes(String(payload.role || ''))
  };
}

function isBootstrapAdmin(identity) {
  return Boolean(identity?.claimAdmin || configuredAdminUids.has(identity?.uid) || configuredAdminEmails.has(String(identity?.email || '').toLowerCase()));
}

async function ensureSchema() {
  if (!pool) throw Object.assign(new Error('DATABASE_NOT_CONFIGURED'), { statusCode: 503 });
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
      CREATE TABLE IF NOT EXISTS neon_admin_audit (
        id BIGSERIAL PRIMARY KEY,
        firebase_uid TEXT NOT NULL,
        admin_email TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS neon_platform_users_last_seen_idx ON neon_platform_users(last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS neon_platform_users_role_idx ON neon_platform_users(role, account_status);
    `).catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function relationExists(relation) {
  const result = await pool.query('SELECT to_regclass($1) AS name', [`public.${relation}`]);
  return Boolean(result.rows[0]?.name);
}

async function ensureIdentityRow(identity) {
  await ensureSchema();
  await pool.query(`
    INSERT INTO neon_platform_users (firebase_uid, email, display_name, last_seen_at)
    VALUES ($1,$2,$3,NOW())
    ON CONFLICT (firebase_uid) DO UPDATE SET
      email=CASE WHEN EXCLUDED.email <> '' THEN EXCLUDED.email ELSE neon_platform_users.email END,
      display_name=CASE WHEN EXCLUDED.display_name <> '' THEN EXCLUDED.display_name ELSE neon_platform_users.display_name END,
      last_seen_at=NOW()
  `, [identity.uid, identity.email || '', identity.name || '']);
}

export async function resolveAdminAccess(req) {
  const identity = await authenticate(req);
  const bootstrap = isBootstrapAdmin(identity);
  if (!pool) {
    if (!bootstrap) throw Object.assign(new Error('ADMIN_REQUIRED'), { statusCode: 403 });
    return { ...identity, role: 'super-admin', capabilities: CAPABILITIES['super-admin'], bootstrap: true };
  }
  await ensureIdentityRow(identity);
  const result = await pool.query('SELECT role, account_status, status_reason FROM neon_platform_users WHERE firebase_uid=$1', [identity.uid]);
  const row = result.rows[0] || {};
  if (row.account_status === 'suspended') throw Object.assign(new Error('ACCOUNT_SUSPENDED'), { statusCode: 403 });
  const role = bootstrap ? 'super-admin' : ROLES.has(row.role) ? row.role : 'student';
  if (role === 'student') throw Object.assign(new Error('ADMIN_REQUIRED'), { statusCode: 403 });
  return { ...identity, role, capabilities: CAPABILITIES[role] || [], bootstrap };
}

export async function requireAdminCapability(req, capability) {
  const identity = await resolveAdminAccess(req);
  if (capability && !identity.capabilities.includes(capability)) throw Object.assign(new Error('CAPABILITY_REQUIRED'), { statusCode: 403 });
  return identity;
}

async function audit(identity, action, entityId, beforeState = {}, afterState = {}) {
  await pool.query(`
    INSERT INTO neon_admin_audit (firebase_uid, admin_email, action, entity_type, entity_id, before_state, after_state)
    VALUES ($1,$2,$3,'platform-user',$4,$5::jsonb,$6::jsonb)
  `, [identity.uid, identity.email || '', action, entityId, JSON.stringify(beforeState || {}), JSON.stringify(afterState || {})]);
}

async function backfillKnownUsers() {
  await ensureSchema();
  if (await relationExists('neon_student_goals')) {
    await pool.query(`
      INSERT INTO neon_platform_users (firebase_uid, last_seen_at)
      SELECT firebase_uid, COALESCE(updated_at, NOW()) FROM neon_student_goals
      WHERE firebase_uid <> ''
      ON CONFLICT (firebase_uid) DO UPDATE SET last_seen_at=GREATEST(neon_platform_users.last_seen_at, EXCLUDED.last_seen_at)
    `);
  }
  if (await relationExists('neon_assessment_attempts')) {
    await pool.query(`
      INSERT INTO neon_platform_users (firebase_uid, last_seen_at)
      SELECT firebase_uid, MAX(created_at) FROM neon_assessment_attempts
      WHERE firebase_uid <> '' GROUP BY firebase_uid
      ON CONFLICT (firebase_uid) DO UPDATE SET last_seen_at=GREATEST(neon_platform_users.last_seen_at, EXCLUDED.last_seen_at)
    `);
  }
}

async function userMetrics() {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE account_status='suspended')::int AS suspended,
      COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '7 days')::int AS active_7d,
      COUNT(*) FILTER (WHERE last_seen_at >= NOW() - INTERVAL '30 days')::int AS active_30d,
      COUNT(*) FILTER (WHERE role <> 'student')::int AS delegated_admins
    FROM neon_platform_users
  `);
  const row = result.rows[0] || {};
  return {
    total: Number(row.total || 0), suspended: Number(row.suspended || 0), active7d: Number(row.active_7d || 0),
    active30d: Number(row.active_30d || 0), delegatedAdmins: Number(row.delegated_admins || 0)
  };
}

async function listUsers(url) {
  await backfillKnownUsers();
  const query = String(url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 160);
  const role = url.searchParams.get('role') || 'all';
  const status = url.searchParams.get('status') || 'all';
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get('page') || 1)));
  const pageSize = Math.max(10, Math.min(100, Math.trunc(Number(url.searchParams.get('pageSize') || 40))));
  const conditions = [];
  const values = [];
  if (query) { values.push(`%${query}%`); conditions.push(`(LOWER(email) LIKE $${values.length} OR LOWER(display_name) LIKE $${values.length} OR LOWER(firebase_uid) LIKE $${values.length})`); }
  if (role !== 'all' && ROLES.has(role)) { values.push(role); conditions.push(`role=$${values.length}`); }
  if (status !== 'all' && ['active', 'suspended'].includes(status)) { values.push(status); conditions.push(`account_status=$${values.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM neon_platform_users ${where}`, values);
  const queryValues = [...values, pageSize, (page - 1) * pageSize];
  const result = await pool.query(`
    SELECT firebase_uid, email, display_name, role, account_status, status_reason, first_seen_at, last_seen_at, updated_at, updated_by
    FROM neon_platform_users ${where}
    ORDER BY CASE account_status WHEN 'suspended' THEN 0 ELSE 1 END, last_seen_at DESC
    LIMIT $${queryValues.length - 1} OFFSET $${queryValues.length}
  `, queryValues);
  const users = result.rows;
  const ids = users.map(row => row.firebase_uid);
  const stats = new Map();
  if (ids.length && await relationExists('neon_assessment_attempts')) {
    const attemptResult = await pool.query(`
      SELECT firebase_uid, COUNT(*)::int AS attempts, COALESCE(ROUND(AVG(score)),0)::int AS average_score, MAX(created_at) AS last_attempt_at
      FROM neon_assessment_attempts WHERE firebase_uid = ANY($1::text[]) GROUP BY firebase_uid
    `, [ids]);
    for (const row of attemptResult.rows) stats.set(row.firebase_uid, { attempts:Number(row.attempts || 0), averageScore:Number(row.average_score || 0), lastAttemptAt:row.last_attempt_at || null });
  }
  const goals = new Map();
  if (ids.length && await relationExists('neon_student_goals')) {
    const goalResult = await pool.query(`SELECT firebase_uid, exam_track, target_score, exam_date FROM neon_student_goals WHERE firebase_uid = ANY($1::text[])`, [ids]);
    for (const row of goalResult.rows) goals.set(row.firebase_uid, { examTrack:row.exam_track, targetScore:Number(row.target_score || 0), examDate:row.exam_date || null });
  }
  const items = users.map(row => ({
    uid: row.firebase_uid,
    email: row.email,
    name: row.display_name,
    role: isBootstrapAdmin({ uid:row.firebase_uid, email:row.email }) ? 'super-admin' : row.role,
    storedRole: row.role,
    status: row.account_status,
    statusReason: row.status_reason,
    bootstrapAdmin: isBootstrapAdmin({ uid:row.firebase_uid, email:row.email }),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    updatedAt: row.updated_at,
    ...stats.get(row.firebase_uid),
    goal: goals.get(row.firebase_uid) || null
  }));
  const total = Number(countResult.rows[0]?.count || 0);
  return { ok:true, page, pageSize, total, pages:Math.max(1, Math.ceil(total / pageSize)), metrics:await userMetrics(), items };
}

async function userDetail(uid) {
  await ensureSchema();
  const result = await pool.query(`SELECT * FROM neon_platform_users WHERE firebase_uid=$1`, [uid]);
  const user = result.rows[0];
  if (!user) throw Object.assign(new Error('USER_NOT_FOUND'), { statusCode:404 });
  const detail = {
    uid:user.firebase_uid, email:user.email, name:user.display_name,
    role:isBootstrapAdmin({ uid:user.firebase_uid, email:user.email }) ? 'super-admin' : user.role,
    storedRole:user.role, status:user.account_status, statusReason:user.status_reason,
    bootstrapAdmin:isBootstrapAdmin({ uid:user.firebase_uid, email:user.email }), firstSeenAt:user.first_seen_at, lastSeenAt:user.last_seen_at
  };
  if (await relationExists('neon_student_goals')) {
    const goal = await pool.query(`SELECT exam_track, exam_date, target_score, daily_minutes, onboarding_complete, updated_at FROM neon_student_goals WHERE firebase_uid=$1`, [uid]);
    detail.goal = goal.rows[0] || null;
  }
  if (await relationExists('neon_assessment_attempts')) {
    const attempts = await pool.query(`
      SELECT subject_id, mode, score, correct_count, total_count, duration_seconds, created_at
      FROM neon_assessment_attempts WHERE firebase_uid=$1 ORDER BY created_at DESC LIMIT 12
    `, [uid]);
    detail.recentAttempts = attempts.rows;
    const summary = await pool.query(`SELECT COUNT(*)::int AS attempts, COALESCE(ROUND(AVG(score)),0)::int AS average_score, COALESCE(MAX(score),0)::int AS best_score FROM neon_assessment_attempts WHERE firebase_uid=$1`, [uid]);
    detail.assessmentSummary = summary.rows[0] || {};
  }
  if (await relationExists('neon_question_reports')) {
    const reports = await pool.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('new','reviewing'))::int AS open FROM neon_question_reports WHERE firebase_uid=$1`, [uid]);
    detail.reportSummary = reports.rows[0] || {};
  }
  return { ok:true, user:detail };
}

async function updateUser(identity, body) {
  await ensureSchema();
  const uid = String(body?.uid || '').trim().slice(0, 128);
  if (!uid) throw Object.assign(new Error('INVALID_USER_ID'), { statusCode:400 });
  if (uid === identity.uid) throw Object.assign(new Error('SELF_MANAGEMENT_FORBIDDEN'), { statusCode:409 });
  const beforeResult = await pool.query('SELECT * FROM neon_platform_users WHERE firebase_uid=$1', [uid]);
  const before = beforeResult.rows[0];
  if (!before) throw Object.assign(new Error('USER_NOT_FOUND'), { statusCode:404 });
  if (isBootstrapAdmin({ uid:before.firebase_uid, email:before.email })) throw Object.assign(new Error('BOOTSTRAP_ADMIN_PROTECTED'), { statusCode:409 });
  const role = ROLES.has(body?.role) ? body.role : before.role;
  const status = ['active', 'suspended'].includes(body?.status) ? body.status : before.account_status;
  const reason = status === 'suspended' ? String(body?.reason || '').replace(/\s+/g, ' ').trim().slice(0, 600) : '';
  const result = await pool.query(`
    UPDATE neon_platform_users SET role=$2, account_status=$3, status_reason=$4, updated_by=$5, updated_at=NOW()
    WHERE firebase_uid=$1 RETURNING *
  `, [uid, role, status, reason, identity.uid]);
  const after = result.rows[0];
  await audit(identity, 'user.access.update', uid, before, after);
  return { ok:true, user:{ uid:after.firebase_uid, email:after.email, name:after.display_name, role:after.role, status:after.account_status, statusReason:after.status_reason, updatedAt:after.updated_at } };
}

function publicFailure(error) {
  const code = String(error?.message || 'ADMIN_USERS_ERROR');
  if (code === 'AUTH_REQUIRED' || code.startsWith('INVALID_AUTH') || code === 'AUTH_TOKEN_EXPIRED' || code === 'UNKNOWN_AUTH_KEY') return { status:401, code, message:'يلزم تسجيل الدخول.' };
  if (code === 'ADMIN_REQUIRED') return { status:403, code, message:'هذا الحساب لا يملك صلاحية إدارة المنصة.' };
  if (code === 'CAPABILITY_REQUIRED') return { status:403, code, message:'الدور الحالي لا يملك الصلاحية المطلوبة.' };
  if (code === 'ACCOUNT_SUSPENDED') return { status:403, code, message:'الحساب موقوف على مستوى المنصة.' };
  if (code === 'DATABASE_NOT_CONFIGURED') return { status:503, code, message:'قاعدة البيانات غير مهيأة لإدارة المستخدمين.' };
  if (code === 'SELF_MANAGEMENT_FORBIDDEN') return { status:409, code, message:'لا يمكن تغيير دور حسابك أو إيقافه من الجلسة نفسها.' };
  if (code === 'BOOTSTRAP_ADMIN_PROTECTED') return { status:409, code, message:'المسؤول الأساسي المعرّف في بيئة الخادم محمي من التعديل داخل اللوحة.' };
  return { status:Number(error?.statusCode || 500), code, message:'تعذر تنفيذ طلب إدارة المستخدمين.' };
}

export async function handleAdminUsersApi(req, res, requestPath, readJsonBody) {
  if (!requestPath.startsWith('/api/admin/users') && !requestPath.startsWith('/api/admin/user') && requestPath !== '/api/admin/access') return false;
  try {
    if (requestPath === '/api/admin/access' && req.method === 'GET') {
      const identity = await resolveAdminAccess(req);
      json(res, 200, { ok:true, role:identity.role, capabilities:identity.capabilities, bootstrap:identity.bootstrap, identity:{ uid:identity.uid, email:identity.email, name:identity.name } });
      return true;
    }
    if (requestPath === '/api/admin/users' && req.method === 'GET') {
      await requireAdminCapability(req, 'users.read');
      const url = new URL(req.url || '/', 'http://localhost');
      json(res, 200, await listUsers(url));
      return true;
    }
    if (requestPath === '/api/admin/user/detail' && req.method === 'GET') {
      await requireAdminCapability(req, 'users.read');
      const url = new URL(req.url || '/', 'http://localhost');
      json(res, 200, await userDetail(String(url.searchParams.get('uid') || '').slice(0, 128)));
      return true;
    }
    if (requestPath === '/api/admin/user' && req.method === 'PUT') {
      const identity = await requireAdminCapability(req, 'users.manage');
      json(res, 200, await updateUser(identity, await readJsonBody(req)));
      return true;
    }
    json(res, 405, { error:'METHOD_NOT_ALLOWED' });
  } catch (error) {
    const failure = publicFailure(error);
    console.error('Admin users API error:', failure.code, error?.message || error);
    json(res, failure.status, { error:failure.code, message:failure.message });
  }
  return true;
}

export async function closeAdminUsersDatabase() {
  if (pool) await pool.end().catch(() => {});
}
