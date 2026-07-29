import { adminAuth } from '../config/firebase.js';

const bootstrapAdminUids = new Set(
  String(process.env.ADMIN_UIDS || process.env.ADMIN_UID || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
);

function getBearerToken(req) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

export async function authenticate(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      ok: false,
      code: 'AUTH_TOKEN_REQUIRED',
      message: 'رمز تسجيل الدخول مطلوب.'
    });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    req.authUser = decodedToken;
    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      code: 'AUTH_TOKEN_INVALID',
      message: 'جلسة تسجيل الدخول غير صالحة أو منتهية.',
      detail: error.code || undefined
    });
  }
}

export function authorizeAdmin(req, res, next) {
  const user = req.authUser;
  const hasAdminClaim = user?.admin === true || user?.role === 'admin';
  const isBootstrapAdmin = user?.uid && bootstrapAdminUids.has(user.uid);

  if (!hasAdminClaim && !isBootstrapAdmin) {
    return res.status(403).json({
      ok: false,
      code: 'ADMIN_ACCESS_REQUIRED',
      message: 'هذه العملية متاحة لحساب المسؤول فقط.'
    });
  }

  req.adminUser = {
    uid: user.uid,
    email: user.email || '',
    role: user.role || (hasAdminClaim ? 'admin' : 'bootstrap-admin')
  };
  return next();
}

export const requireAdmin = [authenticate, authorizeAdmin];
