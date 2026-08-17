import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const outputDir = join(root, 'artifacts');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const checklist = JSON.parse(readFileSync(join(root, 'release/rc-checklist.json'), 'utf8'));
const finalMode = process.argv.includes('--final');

if (!existsSync(dist)) throw new Error('RC manifest requires a completed dist build.');

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else files.push(path);
  }
}
walk(dist);
files.sort();

const aggregate = createHash('sha256');
let totalBytes = 0;
for (const file of files) {
  const rel = relative(dist, file).replaceAll('\\', '/');
  const bytes = readFileSync(file);
  totalBytes += statSync(file).size;
  aggregate.update(rel);
  aggregate.update('\0');
  aggregate.update(bytes);
  aggregate.update('\0');
}

function gitValue(args, fallback = '') {
  try { return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim(); }
  catch { return fallback; }
}

const commitSha = String(process.env.NEON_CANDIDATE_SHA || process.env.GITHUB_SHA || gitValue(['rev-parse', 'HEAD'])).trim();
const branch = String(process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || gitValue(['branch', '--show-current'], 'performance-vite')).trim();
const owner = String(process.env.NEON_SIGNOFF_OWNER || '').trim();
const evidence = String(process.env.NEON_UAT_EVIDENCE || '').trim();
const manualApproved = String(process.env.NEON_MANUAL_UAT_APPROVED || '').toLowerCase() === 'true';
const regressionApproved = String(process.env.NEON_NO_HIGH_SEVERITY_REGRESSIONS || '').toLowerCase() === 'true';
const railwayStatus = String(process.env.NEON_RAILWAY_STATUS || '').toLowerCase();
const approved = finalMode && manualApproved && regressionApproved && railwayStatus === 'success' && Boolean(owner);

const manifest = {
  schemaVersion: 1,
  candidate: pkg.version,
  status: approved ? 'APPROVED' : 'PREPARED',
  source: { commitSha, branch },
  generatedAt: new Date().toISOString(),
  artifact: {
    fileCount: files.length,
    totalBytes,
    sha256: aggregate.digest('hex')
  },
  gates: {
    automatedUat: 'required',
    productionRelease: 'required',
    railwayPreview: railwayStatus || 'external-pending',
    manualUat: manualApproved ? 'approved' : 'pending',
    criticalHighRegressionClearance: regressionApproved ? 'approved' : 'pending'
  },
  signoff: approved ? { owner, evidence: evidence || null } : null,
  manualTestIds: checklist.requiredManualTests
};

mkdirSync(outputDir, { recursive: true });
const output = join(outputDir, 'release-candidate-manifest.json');
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`RC manifest ${manifest.status}: ${pkg.version}, ${files.length} files, ${totalBytes} bytes, sha256=${manifest.artifact.sha256}`);
console.log(`Manifest: ${relative(root, output)}`);
