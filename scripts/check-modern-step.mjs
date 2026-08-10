import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const stepPath = join(root, 'app', 'src', 'step.js');
const buildPath = join(root, 'scripts', 'build-step-content.mjs');
const packagePath = join(root, 'package.json');
const statePath = join(root, 'app', 'src', 'account-local-state.js');

for (const path of [stepPath, buildPath, packagePath, statePath]) {
  if (!existsSync(path)) throw new Error(`Modern STEP prerequisite missing: ${path}`);
}

const step = readFileSync(stepPath, 'utf8');
const build = readFileSync(buildPath, 'utf8');
const pkg = readFileSync(packagePath, 'utf8');
const accountState = readFileSync(statePath, 'utf8');

const forbidden = [
  /loadClassicScript\s*\(/,
  /\/legacy\/[A-Za-z0-9._/-]+\.js\b/,
  /NEON_STEP_(?:BOOK|MASTERY|DATA|ACADEMY)/,
  /document\.createElement\(['"]script['"]\)/
];
for (const pattern of forbidden) {
  if (pattern.test(step)) throw new Error(`Modern STEP runtime contains forbidden Legacy pattern: ${pattern}`);
}

if (!step.includes('/data/step/content.json')) throw new Error('Modern STEP must load /data/step/content.json.');
if (!step.includes('neonStepProgressV2:')) throw new Error('Modern STEP must use UID-scoped progress storage.');
if (!step.includes('session.user.uid')) throw new Error('Modern STEP progress must be scoped to the authenticated Firebase UID.');
if (!step.includes('speechSynthesis')) throw new Error('Modern STEP listening helper is missing.');
if (!accountState.includes("'neonStepProgressV1'")) throw new Error('Legacy STEP progress key must be cleared on account switch.');
if (!pkg.includes('build-step-content.mjs')) throw new Error('STEP content builder is not part of build:data.');
if (!build.includes('NEON_STEP_BOOK_KAFAYAT_MODELS') || !build.includes('NEON_STEP_MASTERY_QUESTIONS')) {
  throw new Error('STEP builder is not preserving model/mastery data sources.');
}

console.log('Modern STEP runtime guard passed: JSON content, ES modules, UID-scoped state, no Legacy runtime.');
