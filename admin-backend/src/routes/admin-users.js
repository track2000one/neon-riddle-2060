import { Router } from 'express';
import { adminAuth } from '../config/firebase.js';
import { requireAdmin } from '../middleware/auth.js';
import { writeAuditLog } from '../services/audit.js';

const router = Router();
const roles = new Set(['student', 'teacher', 'content_manager', 'admin']);

router.use(...requireAdmin);

function serializeUser(user) {
  return {
    uid: user.uid,
    email: user.email || null,
    emailVerified: user.emailVerified,
    displayName: user.displayName || null,
    phoneNumber: user.phoneNumber || null,
    photoURL: user.photoURL || null,
    disabled: user.disabled,
    providerIds: user.providerData.map(provider => provider.providerId),
    customClaims: user.customClaims || {},
    metadata: {
      creationTime: user.metadata.creationTime || null,
      lastSignInTime: user.metadata.lastSignInTime || null,
      lastRefreshTime: user.metadata.lastRefreshTime || null
    }
  };
}

function parseLimit(value) {
  const parsed = Number.parseInt(String(value || '50'), 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(parsed, 1), 1000);
}

function compactUpdatePayload(body = {}) {
  const allowedFields = [
    'email',
    'displayName',
    'phoneNumber',
    'photoURL',
    'emailVerified',
    'disabled',
    'password'
  ];

  return Object.fromEntries(
    allowedFields
      .filter(field => Object.prototype.hasOwnProperty.call(body, field))
      .map(field => [field, body[field]])
  );
}

async function setRole(uid, role) {
  if (!roles.has(role)) {
    const error = new Error('الدور المطلوب غير مدعوم.');
    error.status = 400;
    error.code = 'ROLE_INVALID';
    throw error;
  }

  const user = await adminAuth.getUser(uid);
  const claims = { ...(user.customClaims || {}) };
  claims.role = role;

  if (role === 'admin') {
    claims.admin = true;
  } else {
    delete claims.admin;
  }

  await adminAuth.setCustomUserClaims(uid, claims);
  return claims;
}

router.get('/', async (req, res, next) => {
  try {
    const result = await adminAuth.listUsers(parseLimit(req.query.limit), req.query.pageToken || undefined);
    res.json({
      ok: true,
      users: result.users.map(serializeUser),
      nextPageToken: result.pageToken || null
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:uid', async (req, res, next) => {
  try {
    const user = await adminAuth.getUser(req.params.uid);
    res.json({ ok: true, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, password, displayName, phoneNumber, emailVerified = false, disabled = false, role = 'student' } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ ok: false, code: 'EMAIL_REQUIRED', message: 'البريد الإلكتروني مطلوب.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ ok: false, code: 'PASSWORD_INVALID', message: 'كلمة المرور يجب ألا تقل عن 6 أحرف.' });
    }

    const user = await adminAuth.createUser({
      email: email.trim(),
      password,
      displayName: displayName?.trim() || undefined,
      phoneNumber: phoneNumber || undefined,
      emailVerified: Boolean(emailVerified),
      disabled: Boolean(disabled)
    });

    await setRole(user.uid, role);
    const createdUser = await adminAuth.getUser(user.uid);
    await writeAuditLog(req, 'user.create', user.uid, { email: user.email, displayName, role });

    res.status(201).json({ ok: true, user: serializeUser(createdUser) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:uid', async (req, res, next) => {
  try {
    const uid = req.params.uid;
    const updates = compactUpdatePayload(req.body);

    if (!Object.keys(updates).length) {
      return res.status(400).json({ ok: false, code: 'NO_UPDATES', message: 'لم يتم إرسال أي بيانات قابلة للتعديل.' });
    }
    if (uid === req.adminUser.uid && updates.disabled === true) {
      return res.status(400).json({ ok: false, code: 'SELF_DISABLE_BLOCKED', message: 'لا يمكن للمسؤول تعطيل حسابه أثناء الجلسة الحالية.' });
    }
    if (typeof updates.password === 'string' && updates.password.length < 6) {
      return res.status(400).json({ ok: false, code: 'PASSWORD_INVALID', message: 'كلمة المرور يجب ألا تقل عن 6 أحرف.' });
    }

    const updated = await adminAuth.updateUser(uid, updates);
    const auditUpdates = { ...updates };
    delete auditUpdates.password;
    await writeAuditLog(req, 'user.update', uid, { fields: Object.keys(auditUpdates) });

    res.json({ ok: true, user: serializeUser(updated) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:uid/role', async (req, res, next) => {
  try {
    const uid = req.params.uid;
    const role = String(req.body?.role || '').trim();

    if (uid === req.adminUser.uid && role !== 'admin') {
      return res.status(400).json({ ok: false, code: 'SELF_DEMOTION_BLOCKED', message: 'لا يمكن للمسؤول إزالة صلاحية الإدارة من حسابه أثناء الجلسة الحالية.' });
    }

    const customClaims = await setRole(uid, role);
    await adminAuth.revokeRefreshTokens(uid);
    await writeAuditLog(req, 'user.role.update', uid, { role });
    res.json({ ok: true, uid, customClaims, sessionsRevoked: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:uid/revoke-sessions', async (req, res, next) => {
  try {
    const uid = req.params.uid;
    await adminAuth.revokeRefreshTokens(uid);
    await writeAuditLog(req, 'user.sessions.revoke', uid);
    res.json({ ok: true, uid, message: 'تم إلغاء الجلسات النشطة للمستخدم.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:uid', async (req, res, next) => {
  try {
    const uid = req.params.uid;

    if (uid === req.adminUser.uid) {
      return res.status(400).json({ ok: false, code: 'SELF_DELETE_BLOCKED', message: 'لا يمكن للمسؤول حذف حسابه من الجلسة الحالية.' });
    }
    if (req.body?.confirmUid !== uid) {
      return res.status(400).json({
        ok: false,
        code: 'DELETE_CONFIRMATION_REQUIRED',
        message: 'لتأكيد الحذف، أرسل confirmUid مطابقًا لمعرف المستخدم.'
      });
    }

    const existing = await adminAuth.getUser(uid);
    await adminAuth.deleteUser(uid);
    await writeAuditLog(req, 'user.delete', uid, { email: existing.email || null });
    res.json({ ok: true, uid, message: 'تم حذف حساب المستخدم نهائيًا.' });
  } catch (error) {
    next(error);
  }
});

export default router;
