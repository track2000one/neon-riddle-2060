import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredIds = [
  'AUTH-01','AUTH-02','AUTH-03','AUTH-04','ACCESS-01','ACCESS-02','RBAC-01','RBAC-02','RBAC-03',
  'STATE-01','STEP-01','EXAM-01','CODING-01','MOBILE-01','DESKTOP-01'
];

function fail(message) {
  throw new Error(`Manual UAT artifact verification failed: ${message}`);
}

function exportEnv(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) return;
  const delimiter = `NEON_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  appendFileSync(envFile, `${name}<<${delimiter}\n${String(value)}\n${delimiter}\n`);
}

const candidateSha = String(process.env.NEON_CANDIDATE_SHA || '').trim();
const path = resolve(process.argv[2] || 'artifacts/manual-uat/manual-uat-signoff.json');
if (!/^[0-9a-f]{40}$/i.test(candidateSha)) fail('candidate SHA is invalid');

let record;
try {
  record = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  fail(`cannot read sign-off JSON at ${path}: ${error.message}`);
}

if (record.schemaVersion !== 1) fail(`unsupported schema ${record.schemaVersion}`);
if (record.candidate !== '0.6.0-rc.1') fail(`candidate version mismatch: ${record.candidate}`);
if (String(record.candidateSha || '').toLowerCase() !== candidateSha.toLowerCase()) fail('candidate SHA mismatch');
if (record.status !== 'APPROVED') fail(`sign-off status is ${record.status || 'missing'}`);
if (record.railwayPreview !== 'success') fail('Railway was not recorded as success');
if (Number(record.regressionClearance?.criticalOpen) !== 0 || Number(record.regressionClearance?.highOpen) !== 0) fail('critical/high regression clearance is not zero');
if (!record.tester || typeof record.tester !== 'string') fail('tester identity is missing');
if (!record.evidence || typeof record.evidence !== 'string') fail('evidence reference is missing');
if (Number(record.approvedCaseCount) !== requiredIds.length) fail(`approvedCaseCount must be ${requiredIds.length}`);

const suppliedIds = Object.keys(record.cases || {});
for (const id of requiredIds) {
  if (String(record.cases?.[id] || '').toUpperCase() !== 'PASS') fail(`${id} is not PASS`);
}
const extras = suppliedIds.filter(id => !requiredIds.includes(id));
if (extras.length) fail(`unexpected UAT case IDs: ${extras.join(', ')}`);

exportEnv('NEON_MANUAL_UAT_APPROVED', 'true');
exportEnv('NEON_NO_HIGH_SEVERITY_REGRESSIONS', 'true');
exportEnv('NEON_SIGNOFF_OWNER', record.tester.trim());
exportEnv('NEON_UAT_EVIDENCE', record.evidence.trim());
exportEnv('NEON_UAT_SIGNOFF_RUN_ID', String(record.github?.runId || ''));
console.log(`Manual UAT artifact verified: ${requiredIds.length}/${requiredIds.length} PASS for ${candidateSha} by ${record.tester}.`);
