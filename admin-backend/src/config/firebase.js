import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function parseServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const base64Json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;

  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      parsed.private_key = normalizePrivateKey(parsed.private_key);
      return parsed;
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${error.message}`);
    }
  }

  if (base64Json) {
    try {
      const decoded = Buffer.from(base64Json, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      parsed.private_key = normalizePrivateKey(parsed.private_key);
      return parsed;
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 is invalid: ${error.message}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, ' +
      'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64, or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.'
    );
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey
  };
}

const serviceAccount = parseServiceAccount();

const firebaseApp = getApps()[0] || initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id
});

export const adminAuth = getAuth(firebaseApp);
export const adminDb = getFirestore(firebaseApp);
export const firebaseProjectId = serviceAccount.project_id;
