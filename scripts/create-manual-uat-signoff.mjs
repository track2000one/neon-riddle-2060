import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ids = [
  'AUTH-01','AUTH-02','AUTH-03','AUTH-04','ACCESS-01','ACCESS-02','RBAC-01','RBAC-02','RBAC-03',
  'STATE-01','STEP-01','EXAM-01','CODING-01','MOBILE-01','DESKTOP-01'
];

function fail(message) {
  throw new Error(`Manual UAT sign-off failed: ${message}`);
}

function parseResults() {
  const raw = String(process.env.NEON_UAT_RESULTS_JSON || '').trim();
  if (raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      fail('NEON_UAT_RESULTS_JSON must be valid JSON');
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail('UAT results must be a JSON object');
    return parsed;
  }
  const fallback = {};
  for (const id of ids) fallback[id] = process.env[`NEON_UAT_${id.replaceAll('-', '_')}`] || '';
  return fallback;
}

const candidateSha = String(process.env.NEON_CANDIDATE_SHA || '').trim();
const tester = String(process.env.NEON_UAT_TESTER || '').trim();
const evidence = String(process.env.NEON_UAT_EVIDENCE || '').trim();
const railwayStatus = String(process.env.NEON_RAILWAY_STATUS || '').trim().toLowerCase();
const noHighSeverityRegressions = String(process.env.NEON_NO_HIGH_SEVERITY_REGRESSIONS || '').trim().toLowerCase() === 'true';

if (!/^[0-9a-f]{40}$/i.test(candidateSha)) fail('candidate SHA must be a full 40-character SHA');
if (!tester) fail('tester identity is required');
if (tester.length > 160) fail('tester identity is too long');
if (!evidence) fail('evidence reference/notes are required');
if (evidence.length > 2000) fail('evidence reference is too long');
if (railwayStatus !== 'success') fail(`Railway must be success on candidate SHA; received ${railwayStatus || 'missing'}`);
if (!noHighSeverityRegressions) fail('critical/high regression clearance must be explicitly approved');

const suppliedResults = parseResults();
const unknownIds = Object.keys(suppliedResults).filter(id => !ids.includes(id));
if (unknownIds.length) fail(`unknown UAT case IDs: ${unknownIds.join(', ')}`);

const cases = {};
for (const id of ids) {
  const status = String(suppliedResults[id] || '').trim().toUpperCase();
  if (status !== 'PASS') fail(`${id} must be PASS; received ${status || 'missing'}`);
  cases[id] = 'PASS';
}

const signoff = {
  schemaVersion: 1,
  candidate: '0.6.0-rc.1',
  candidateSha,
  status: 'APPROVED',
  tester,
  evidence,
  railwayPreview: 'success',
  regressionClearance: {
    criticalOpen: 0,
    highOpen: 0
  },
  cases,
  approvedCaseCount: ids.length,
  approvedAt: new Date().toISOString(),
  github: {
    repository: process.env.GITHUB_REPOSITORY || '',
    workflow: process.env.GITHUB_WORKFLOW || '',
    runId: process.env.GITHUB_RUN_ID || '',
    actor: process.env.GITHUB_ACTOR || ''
  }
};

mkdirSync(join(process.cwd(), 'artifacts'), { recursive: true });
writeFileSync(join(process.cwd(), 'artifacts/manual-uat-signoff.json'), `${JSON.stringify(signoff, null, 2)}\n`);
console.log(`Manual UAT sign-off APPROVED: ${ids.length}/${ids.length} cases PASS for ${candidateSha} by ${tester}.`);
