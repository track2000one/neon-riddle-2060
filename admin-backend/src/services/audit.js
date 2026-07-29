import { adminDb } from '../config/firebase.js';

const firestoreAuditEnabled = String(process.env.ENABLE_FIRESTORE_AUDIT || '').toLowerCase() === 'true';

function sanitizeDetails(details = {}) {
  const clean = { ...details };
  delete clean.password;
  delete clean.privateKey;
  delete clean.token;
  return clean;
}

export async function writeAuditLog(req, action, targetUid = null, details = {}) {
  const event = {
    action,
    targetUid,
    actorUid: req.adminUser?.uid || null,
    actorEmail: req.adminUser?.email || null,
    ip: req.ip || null,
    userAgent: req.get('user-agent') || null,
    details: sanitizeDetails(details),
    createdAt: new Date().toISOString()
  };

  console.info(JSON.stringify({ type: 'admin_audit', ...event }));

  if (!firestoreAuditEnabled) return;

  try {
    await adminDb.collection('adminAuditLogs').add(event);
  } catch (error) {
    console.error('Unable to write Firestore audit log:', error.message);
  }
}
