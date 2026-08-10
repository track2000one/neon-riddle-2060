import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = process.cwd();
const verifier = join(root, 'scripts/verify-manual-uat-signoff.mjs');
const ids = [
  'AUTH-01','AUTH-02','AUTH-03','AUTH-04','ACCESS-01','ACCESS-02','RBAC-01','RBAC-02','RBAC-03',
  'STATE-01','STEP-01','EXAM-01','CODING-01','MOBILE-01','DESKTOP-01'
];
const allPass = Object.fromEntries(ids.map(id => [id, 'PASS']));
const baseRecord = {
  schemaVersion: 1,
  candidate: '0.6.0-rc.1',
  status: 'APPROVED',
  testedSha: 'a'.repeat(40),
  tester: 'Automated Sign-off Contract Test',
  evidence: 'test-evidence',
  regressionClearance: { criticalOpen: 0, highOpen: 0 },
  cases: allPass,
  approvedCaseCount: 15,
  approvedAt: '2026-08-10T16:00:00.000Z'
};

function run(record) {
  const dir = mkdtempSync(join(tmpdir(), 'neon-uat-'));
  const input = join(dir, 'signoff.json');
  const envFile = join(dir, 'github-env.txt');
  writeFileSync(input, `${JSON.stringify(record, null, 2)}\n`);
  const result = spawnSync(process.execPath, [verifier, input], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ENV: envFile }
  });
  let exported = '';
  try { exported = readFileSync(envFile, 'utf8'); } catch {}
  rmSync(dir, { recursive: true, force: true });
  return { ...result, exported };
}

function expectSuccess(result, label) {
  if (result.status !== 0) throw new Error(`${label} unexpectedly failed:\n${result.stderr || result.stdout}`);
}
function expectFailure(result, label) {
  if (result.status === 0) throw new Error(`${label} unexpectedly passed`);
}

const valid = run(baseRecord);
expectSuccess(valid, '15/15 PASS sign-off');
if (!valid.exported.includes('NEON_MANUAL_UAT_APPROVED')) throw new Error('valid sign-off did not export approval state');
if (!valid.exported.includes('NEON_TESTED_SHA')) throw new Error('valid sign-off did not export tested SHA');

expectFailure(run({ ...baseRecord, cases: { ...allPass, 'RBAC-02': 'FAIL' } }), 'single FAIL case');
const missingCase = { ...allPass };
delete missingCase['MOBILE-01'];
expectFailure(run({ ...baseRecord, cases: missingCase }), 'missing case');
expectFailure(run({ ...baseRecord, cases: { ...allPass, 'UNKNOWN-99': 'PASS' } }), 'unknown case');
expectFailure(run({ ...baseRecord, testedSha: 'abc' }), 'invalid tested SHA');
expectFailure(run({ ...baseRecord, regressionClearance: { criticalOpen: 0, highOpen: 1 } }), 'open high severity regression');
expectFailure(run({ ...baseRecord, tester: '' }), 'missing tester');
expectFailure(run({ ...baseRecord, evidence: '' }), 'missing evidence');

console.log('Manual UAT sign-off contract passed: committed record requires 15/15 PASS, valid tested SHA, named tester/evidence, and zero Critical/High regressions.');
