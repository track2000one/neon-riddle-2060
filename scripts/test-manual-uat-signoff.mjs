import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const script = join(root, 'scripts/create-manual-uat-signoff.mjs');
const output = join(root, 'artifacts/manual-uat-signoff.json');
const ids = [
  'AUTH-01','AUTH-02','AUTH-03','AUTH-04','ACCESS-01','ACCESS-02','RBAC-01','RBAC-02','RBAC-03',
  'STATE-01','STEP-01','EXAM-01','CODING-01','MOBILE-01','DESKTOP-01'
];
const allPass = Object.fromEntries(ids.map(id => [id, 'PASS']));

function run(overrides = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      NEON_CANDIDATE_SHA: 'a'.repeat(40),
      NEON_UAT_TESTER: 'Automated Sign-off Contract Test',
      NEON_UAT_EVIDENCE: 'test-evidence',
      NEON_RAILWAY_STATUS: 'success',
      NEON_NO_HIGH_SEVERITY_REGRESSIONS: 'true',
      NEON_UAT_RESULTS_JSON: JSON.stringify(allPass),
      ...overrides
    }
  });
}

function expectSuccess(result, label) {
  if (result.status !== 0) throw new Error(`${label} unexpectedly failed:\n${result.stderr || result.stdout}`);
}
function expectFailure(result, label) {
  if (result.status === 0) throw new Error(`${label} unexpectedly passed`);
}

expectSuccess(run(), 'all PASS sign-off');
const record = JSON.parse(readFileSync(output, 'utf8'));
if (record.status !== 'APPROVED' || record.approvedCaseCount !== 15) throw new Error('approved sign-off artifact is malformed');

const oneFail = { ...allPass, 'RBAC-02': 'FAIL' };
expectFailure(run({ NEON_UAT_RESULTS_JSON: JSON.stringify(oneFail) }), 'single FAIL case');

const missingCase = { ...allPass };
delete missingCase['MOBILE-01'];
expectFailure(run({ NEON_UAT_RESULTS_JSON: JSON.stringify(missingCase) }), 'missing case');

expectFailure(run({ NEON_RAILWAY_STATUS: 'pending' }), 'Railway pending');
expectFailure(run({ NEON_NO_HIGH_SEVERITY_REGRESSIONS: 'false' }), 'open high severity regression');
expectFailure(run({ NEON_UAT_RESULTS_JSON: JSON.stringify({ ...allPass, 'UNKNOWN-99': 'PASS' }) }), 'unknown case');

console.log('Manual UAT sign-off contract passed: 15/15 PASS required; FAIL/missing/unknown cases, Railway pending, and high-severity regressions are rejected.');
