import { spawn } from 'node:child_process';

const port = 4187;
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server-production.mjs'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });

function fail(message) {
  throw new Error(`${message}\n--- server log ---\n${logs}`);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${origin}/healthz`, { redirect: 'manual' });
      if (response.status === 200) return response;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  fail('Production server did not become healthy.');
}

async function expectStatus(path, status, options = {}) {
  const response = await fetch(`${origin}${path}`, { redirect: 'manual', ...options });
  if (response.status !== status) fail(`${path}: expected ${status}, received ${response.status}`);
  return response;
}

try {
  const health = await waitForServer();
  const healthJson = await health.json();
  if (healthJson.status !== 'ok' || healthJson.legacyRuntime !== false) fail('Health payload is not release-safe.');

  for (const header of ['x-content-type-options','x-frame-options','referrer-policy','permissions-policy']) {
    if (!health.headers.get(header)) fail(`Missing security header on health response: ${header}`);
  }

  for (const path of ['/', '/auth', '/step', '/exams', '/coding', '/learning', '/games', '/admin', '/data/step/content.json', '/data/exams/manifest.json']) {
    const response = await expectStatus(path, 200);
    if (response.headers.get('x-content-type-options') !== 'nosniff') fail(`${path}: missing nosniff`);
  }

  const legacyStep = await expectStatus('/legacy/step-academy-runtime.js', 404);
  if ((await legacyStep.text()).includes('NEON_STEP')) fail('Legacy STEP payload unexpectedly served.');

  const legacyAuth = await expectStatus('/legacy/auth.html?next=%2Fexams', 308);
  if (legacyAuth.headers.get('location') !== '/auth?next=%2Fexams') fail('Legacy auth compatibility redirect changed.');
  const legacyCoding = await expectStatus('/legacy/coding.html?embedded=1', 308);
  if (legacyCoding.headers.get('location') !== '/coding') fail('Legacy coding compatibility redirect changed.');

  const tutor = await expectStatus('/api/tutor/status', 410);
  if ((await tutor.json()).error !== 'FEATURE_RETIRED') fail('Retired tutor contract changed.');
  for (const path of ['/api/access/session', '/api/admin/status', '/api/progress/me', '/api/student-state/notebook']) {
    const response = await expectStatus(path, 401);
    const body = await response.json().catch(() => ({}));
    if (body.error !== 'AUTH_REQUIRED') fail(`${path}: expected AUTH_REQUIRED contract.`);
  }

  const headHealth = await expectStatus('/healthz', 200, { method: 'HEAD' });
  if (await headHealth.text()) fail('HEAD /healthz must not return a body.');

  console.log('Production release smoke gate passed: health, security headers, modern routes, zero Legacy, redirects, retired APIs, and auth boundaries validated.');
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 2000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}
