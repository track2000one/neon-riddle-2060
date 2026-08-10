import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const projectId = 'neon-riddle-2060-admin';
process.env.FIREBASE_PROJECT_ID = projectId;
delete process.env.DATABASE_URL;
delete process.env.PROGRESS_DATABASE_URL;

function base64Url(value) {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64url');
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const kid = 'uat-test-key';

globalThis.fetch = async url => {
  assert.match(String(url), /securetoken@system\.gserviceaccount\.com/);
  return new Response(JSON.stringify({ [kid]: publicPem }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=3600' }
  });
};

function token(payloadOverrides = {}, signingKey = privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url({ alg: 'RS256', typ: 'JWT', kid });
  const payload = base64Url({
    aud: projectId,
    iss: `https://securetoken.google.com/${projectId}`,
    sub: 'uat-student-001',
    email: 'uat.student@example.test',
    name: 'UAT Student',
    iat: now - 5,
    exp: now + 900,
    ...payloadOverrides
  });
  const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), signingKey).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

function req(bearer = '') {
  return { headers: bearer ? { authorization: `Bearer ${bearer}` } : {} };
}

const { authenticatePlatformRequest } = await import('../server/platform-access.mjs?uat=1');

const identity = await authenticatePlatformRequest(req(token()));
assert.equal(identity.uid, 'uat-student-001');
assert.equal(identity.email, 'uat.student@example.test');
assert.equal(identity.name, 'UAT Student');

await assert.rejects(() => authenticatePlatformRequest(req()), error => error?.message === 'AUTH_REQUIRED');
await assert.rejects(() => authenticatePlatformRequest(req('not-a-jwt')), error => error?.message === 'INVALID_AUTH_TOKEN');
await assert.rejects(() => authenticatePlatformRequest(req(token({ exp: Math.floor(Date.now() / 1000) - 10 }))), error => error?.message === 'AUTH_TOKEN_EXPIRED');
await assert.rejects(() => authenticatePlatformRequest(req(token({ aud: 'wrong-project' }))), error => error?.message === 'INVALID_AUTH_AUDIENCE');

const { privateKey: wrongPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
await assert.rejects(() => authenticatePlatformRequest(req(token({}, wrongPrivateKey))), error => error?.message === 'INVALID_AUTH_SIGNATURE');

const adminSource = readFileSync(new URL('../server/admin-users.mjs', import.meta.url), 'utf8');
const capabilitiesMatch = adminSource.match(/const CAPABILITIES\s*=\s*(\{[\s\S]*?\});\s*let schemaPromise/);
assert.ok(capabilitiesMatch, 'Unable to locate admin capability matrix');
const capabilities = vm.runInNewContext(`(${capabilitiesMatch[1]})`, Object.create(null));

assert.deepEqual(Object.keys(capabilities).sort(), ['content-admin', 'student', 'super-admin', 'support'].sort());
assert.ok(capabilities['super-admin'].includes('users.manage'));
assert.ok(capabilities['super-admin'].includes('content.manage'));
assert.ok(capabilities['content-admin'].includes('content.manage'));
assert.ok(!capabilities['content-admin'].includes('users.manage'));
assert.ok(capabilities.support.includes('users.read'));
assert.ok(capabilities.support.includes('reports.manage'));
assert.ok(!capabilities.support.includes('users.manage'));
assert.ok(!capabilities.support.includes('content.manage'));
assert.deepEqual(Array.from(capabilities.student), []);

assert.match(adminSource, /SELF_MANAGEMENT_FORBIDDEN/);
assert.match(adminSource, /BOOTSTRAP_ADMIN_PROTECTED/);
assert.match(adminSource, /ACCOUNT_SUSPENDED/);
assert.match(adminSource, /CAPABILITY_REQUIRED/);

const authSource = readFileSync(new URL('../app/src/auth.js', import.meta.url), 'utf8');
assert.match(authSource, /claimLocalStateOwner\(localStorage,\s*user\.uid\)/);
assert.match(authSource, /ACCOUNT_SUSPENDED/);
assert.match(authSource, /\/auth\?next=/);

const localStateSource = readFileSync(new URL('../app/src/account-local-state.js', import.meta.url), 'utf8');
for (const legacyKey of ['neonStepProgressV1', 'msarCodingLearningProgressV2', 'neonOptimizedExamHistoryV1']) {
  assert.match(localStateSource, new RegExp(legacyKey));
}

const htmlEntries = ['index', 'auth', 'step', 'exams', 'games', 'kids-games', 'learning', 'coding', 'trust', 'admin'];
for (const entry of htmlEntries) {
  const html = readFileSync(new URL(`../app/${entry}.html`, import.meta.url), 'utf8');
  assert.match(html, /<meta\s+name=["']viewport["']/i, `${entry}.html must define a responsive viewport`);
  assert.doesNotMatch(html, /<(?:script|iframe)[^>]+(?:src|href)=["']\/legacy\//i, `${entry}.html must not load Legacy runtime`);
}

console.log('Automated UAT readiness passed: signed Firebase JWT validation, auth failure modes, RBAC matrix, suspension/lockout guards, account isolation contracts, responsive entries, and zero-Legacy HTML.');
