const baseUrl = String(process.env.NEON_LIVE_URL || '').trim().replace(/\/+$/, '');
const expectedSha = String(process.env.NEON_EXPECTED_SHA || '').trim().toLowerCase();
const waitAttempts = Math.max(1, Math.min(90, Number(process.env.NEON_LIVE_WAIT_ATTEMPTS || 60)));
const waitDelayMs = Math.max(1000, Math.min(15000, Number(process.env.NEON_LIVE_WAIT_DELAY_MS || 5000)));

function fail(message) {
  throw new Error(`Live preview gate failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: options.redirect || 'manual',
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'NEON-Live-UAT-Gate/1.0',
        Accept: options.accept || '*/*',
        ...(options.headers || {})
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function verifySecurityHeaders(response, label) {
  assert(response.headers.get('x-content-type-options') === 'nosniff', `${label}: X-Content-Type-Options must be nosniff`);
  assert(String(response.headers.get('x-frame-options') || '').toUpperCase() === 'SAMEORIGIN', `${label}: X-Frame-Options must be SAMEORIGIN`);
  assert(response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', `${label}: Referrer-Policy mismatch`);
  const permissions = response.headers.get('permissions-policy') || '';
  for (const directive of ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()']) {
    assert(permissions.includes(directive), `${label}: Permissions-Policy missing ${directive}`);
  }
}

async function waitForCandidateDeployment() {
  let last = 'not requested';
  for (let attempt = 1; attempt <= waitAttempts; attempt += 1) {
    try {
      const response = await request('/healthz', { accept: 'application/json' });
      const text = await response.text();
      let body = null;
      try { body = JSON.parse(text); } catch {}
      const actualSha = String(body?.commitSha || '').toLowerCase();
      last = `HTTP ${response.status}, commit=${actualSha || 'missing'}`;
      if (
        response.status === 200 &&
        body?.status === 'ok' &&
        body?.service === 'neon-learning-platform' &&
        body?.runtime === 'modern' &&
        body?.legacyRuntime === false &&
        actualSha === expectedSha
      ) {
        verifySecurityHeaders(response, '/healthz');
        assert(String(response.headers.get('cache-control') || '').includes('no-store'), '/healthz must be no-store');
        console.log(`Live candidate reached on attempt ${attempt}: ${expectedSha}`);
        return;
      }
    } catch (error) {
      last = error?.name === 'AbortError' ? 'request timeout' : String(error?.message || error);
    }
    console.log(`Waiting for Railway candidate ${expectedSha}: attempt ${attempt}/${waitAttempts} (${last})`);
    if (attempt < waitAttempts) await sleep(waitDelayMs);
  }
  fail(`Railway never exposed expected commit ${expectedSha}; last state: ${last}`);
}

async function verifyModernPage(path, marker) {
  const response = await request(path, { accept: 'text/html' });
  const body = await response.text();
  assert(response.status === 200, `${path}: expected 200, received ${response.status}`);
  assert(String(response.headers.get('content-type') || '').includes('text/html'), `${path}: expected text/html`);
  assert(/<!doctype html|<html/i.test(body), `${path}: HTML document marker missing`);
  if (marker) assert(body.includes(marker), `${path}: expected marker ${marker} missing`);
  assert(!/<script\b[^>]*\bsrc=["'][^"']*\/legacy\//i.test(body), `${path}: Legacy script reference detected`);
  assert(!/<iframe\b[^>]*\bsrc=["'][^"']*\/legacy\//i.test(body), `${path}: Legacy iframe reference detected`);
  verifySecurityHeaders(response, path);
  return response;
}

async function verifyRedirect(path, expectedLocation) {
  const response = await request(path);
  assert(response.status === 308, `${path}: expected 308, received ${response.status}`);
  assert(response.headers.get('location') === expectedLocation, `${path}: expected Location=${expectedLocation}, received ${response.headers.get('location') || 'missing'}`);
}

async function main() {
  assert(baseUrl, 'NEON_LIVE_URL is required');
  let parsed;
  try { parsed = new URL(baseUrl); } catch { fail('NEON_LIVE_URL must be a valid URL'); }
  assert(parsed.protocol === 'https:', 'live preview must use HTTPS');
  assert(/^[0-9a-f]{40}$/.test(expectedSha), 'NEON_EXPECTED_SHA must be a full 40-character SHA');

  await waitForCandidateDeployment();

  const root = await verifyModernPage('/', 'NEON');
  assert(String(root.headers.get('cache-control') || '').includes('must-revalidate'), '/ must require revalidation');

  const auth = await verifyModernPage('/auth', 'auth');
  assert(String(auth.headers.get('cache-control') || '').includes('no-store'), '/auth must be no-store');

  for (const path of ['/step', '/exams', '/coding', '/admin', '/games', '/learning']) {
    await verifyModernPage(path);
  }

  await verifyRedirect('/legacy/auth.html?next=%2Fexams', '/auth?next=%2Fexams');
  await verifyRedirect('/legacy/coding.html?embedded=1', '/coding');

  const legacy = await request('/legacy/step-academy-runtime.js');
  assert(legacy.status === 404, `Legacy runtime must be 404; received ${legacy.status}`);

  const retired = await request('/api/tutor', { accept: 'application/json' });
  const retiredBody = await retired.json().catch(() => ({}));
  assert(retired.status === 410, `/api/tutor must be 410; received ${retired.status}`);
  assert(retiredBody.error === 'FEATURE_RETIRED', '/api/tutor must return FEATURE_RETIRED');

  const access = await request('/api/access/session', { accept: 'application/json' });
  const accessBody = await access.json().catch(() => ({}));
  assert(access.status === 401, `/api/access/session without token must be 401; received ${access.status}`);
  assert(accessBody.error === 'AUTH_REQUIRED', '/api/access/session must return AUTH_REQUIRED without token');

  console.log(`Live Railway preview gate passed for ${expectedSha}: health SHA, HTTPS, security headers, modern pages, auth cache policy, redirects, zero Legacy, retired API, and auth boundary validated.`);
}

main().catch(error => {
  console.error(error?.stack || error);
  process.exit(1);
});
