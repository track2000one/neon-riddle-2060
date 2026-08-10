import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const checklist = JSON.parse(readFileSync(join(root, 'release/rc-checklist.json'), 'utf8'));
const finalMode = process.argv.includes('--final');

function fail(message) {
  throw new Error(`RC readiness failed: ${message}`);
}

if (!/^\d+\.\d+\.\d+-rc\.\d+$/.test(String(pkg.version || ''))) fail(`package version is not an RC version: ${pkg.version}`);
if (checklist.candidate !== pkg.version) fail(`candidate mismatch: checklist=${checklist.candidate}, package=${pkg.version}`);
if (checklist.schemaVersion !== 1) fail(`unsupported checklist schema ${checklist.schemaVersion}`);

const requiredIds = [
  'AUTH-01','AUTH-02','AUTH-03','AUTH-04','ACCESS-01','ACCESS-02','RBAC-01','RBAC-02','RBAC-03',
  'STATE-01','STEP-01','EXAM-01','CODING-01','MOBILE-01','DESKTOP-01'
];
const actualIds = Array.isArray(checklist.requiredManualTests) ? checklist.requiredManualTests : [];
for (const id of requiredIds) if (!actualIds.includes(id)) fail(`missing manual UAT case ${id}`);
if (new Set(actualIds).size !== actualIds.length) fail('duplicate manual UAT case IDs');

const requiredChecks = ['Vite Performance Build','Production Release Gate','Automated UAT Gate','Railway Preview'];
for (const check of requiredChecks) if (!checklist.requiredExternalChecks?.includes(check)) fail(`missing external gate ${check}`);

if (checklist.mergeRequirements?.criticalRegressionsOpen !== 0 || checklist.mergeRequirements?.highRegressionsOpen !== 0) {
  fail('merge policy must require zero critical/high regressions');
}

if (finalMode) {
  const manualApproved = String(process.env.NEON_MANUAL_UAT_APPROVED || '').toLowerCase() === 'true';
  const regressionApproved = String(process.env.NEON_NO_HIGH_SEVERITY_REGRESSIONS || '').toLowerCase() === 'true';
  const railwayStatus = String(process.env.NEON_RAILWAY_STATUS || '').toLowerCase();
  const owner = String(process.env.NEON_SIGNOFF_OWNER || '').trim();
  const candidateSha = String(process.env.NEON_CANDIDATE_SHA || '').trim();
  if (!manualApproved) fail('manual UAT approval was not supplied');
  if (!regressionApproved) fail('critical/high regression clearance was not supplied');
  if (railwayStatus !== 'success') fail(`Railway status is not success: ${railwayStatus || 'missing'}`);
  if (!owner) fail('sign-off owner is missing');
  if (!/^[0-9a-f]{40}$/i.test(candidateSha)) fail('candidate SHA must be a full 40-character commit SHA');
  console.log(`Final RC merge policy passed for ${pkg.version} at ${candidateSha} by ${owner}.`);
} else {
  console.log(`RC preparation policy passed for ${pkg.version}: ${requiredIds.length} manual UAT cases and ${requiredChecks.length} external gates are defined.`);
}
