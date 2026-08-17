import { appendFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const requiredIds = [
  'AUTH-01','AUTH-02','AUTH-03','AUTH-04','ACCESS-01','ACCESS-02','RBAC-01','RBAC-02','RBAC-03',
  'STATE-01','STEP-01','EXAM-01','CODING-01','MOBILE-01','DESKTOP-01'
];

function fail(message) {
  throw new Error(`Manual UAT sign-off verification failed: ${message}`);
}

function exportEnv(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) return;
  const delimiter = `NEON_${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  appendFileSync(envFile, `${name}<<${delimiter}\n${String(value)}\n${delimiter}\n`);
}

const path = resolve(process.argv[2] || 'release/manual-uat-signoff.json');
let record;
try {
  record = JSON.parse(readFileSync(path, 'utf8'));
} catch (error) {
  fail(`cannot read sign-off JSON at ${path}: ${error.message}`);
}

if (record.schemaVersion !== 1) fail(`unsupported schema ${record.schemaVersion}`);
if (record.candidate !== '0.6.0-rc.1') fail(`candidate version mismatch: ${record.candidate}`);
if (record.status !== 'APPROVED') fail(`sign-off status is ${record.status || 'missing'}`);
if (!/^[0-9a-f]{40}$/i.test(String(record.testedSha || ''))) fail('testedSha must be a full 40-character SHA');
if (Number(record.regressionClearance?.criticalOpen) !== 0 || Number(record.regressionClearance?.highOpen) !== 0) fail('critical/high regression clearance is not zero');
if (!record.tester || typeof record.tester !== 'string') fail('tester identity is missing');
if (record.tester.trim().length > 160) fail('tester identity is too long');
if (!record.evidence || typeof record.evidence !== 'string') fail('evidence reference is missing');
if (record.evidence.trim().length > 2000) fail('evidence reference is too long');
if (!record.approvedAt || Number.isNaN(Date.parse(record.approvedAt))) fail('approvedAt must be a valid timestamp');
if (Number(record.approvedCaseCount) !== requiredIds.length) fail(`approvedCaseCount must be ${requiredIds.length}`);

const suppliedIds = Object.keys(record.cases || {});
for (const id of requiredIds) {
  if (String(record.cases?.[id] || '').toUpperCase() !== 'PASS') fail(`${id} is not PASS`);
}
const extras = suppliedIds.filter(id => !requiredIds.includes(id));
if (extras.length) fail(`unexpected UAT case IDs: ${extras.join(', ')}`);

exportEnv('NEON_TESTED_SHA', String(record.testedSha).toLowerCase());
exportEnv('NEON_MANUAL_UAT_APPROVED', 'true');
exportEnv('NEON_NO_HIGH_SEVERITY_REGRESSIONS', 'true');
exportEnv('NEON_SIGNOFF_OWNER', record.tester.trim());
exportEnv('NEON_UAT_EVIDENCE', record.evidence.trim());
console.log(`Committed Manual UAT sign-off verified: ${requiredIds.length}/${requiredIds.length} PASS for tested SHA ${record.testedSha} by ${record.tester}.`);
