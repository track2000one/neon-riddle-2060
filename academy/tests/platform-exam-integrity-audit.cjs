const fs = require('fs');
const vm = require('vm');
const path = require('path');

global.window = global;
const academyDir = path.resolve(__dirname, '..');

function run(file) {
  const full = path.join(academyDir, file);
  try {
    vm.runInThisContext(fs.readFileSync(full, 'utf8'), { filename: file });
  } catch (error) {
    throw new Error(`Runtime failure in ${file}: ${error.message}`, { cause: error });
  }
}

function fail(message) {
  console.error(`INTEGRITY ERROR: ${message}`);
  process.exitCode = 1;
}

run('catalog.js');
run('exam-assets-manifest.js');

const revision = String(window.NEON_ASSET_REV || '');
const dataAssets = Array.from(window.NEON_EXAM_DATA_ASSETS || []);
const runtimeAssets = Array.from(window.NEON_EXAM_RUNTIME_ASSETS || []);

if (revision !== '20260817-2030-r3') fail(`Unexpected build revision: ${revision}`);
if (dataAssets.length < 85) fail(`Expected at least 85 exam data assets; got ${dataAssets.length}`);
for (const required of [
  'exam-option-semantics-guard.js',
  'exam-dedupe-enhanced.js',
  'exam-option-semantics-restore.js',
  'exam-center-shell-reset.js',
  'exam-center-ui.js',
  'exam-center-runtime-fix.js'
]) {
  if (!runtimeAssets.includes(required)) fail(`Runtime manifest is missing ${required}`);
}
for (const file of [...dataAssets, ...runtimeAssets]) {
  if (!fs.existsSync(path.join(academyDir, file))) fail(`Manifest references a missing file: ${file}`);
}

const requiredSources = [
  'exam-bank-uploaded-images-arithmetic-20260808-a.js',
  'exam-bank-uploaded-images-arithmetic-20260808-b.js',
  'exam-bank-uploaded-images-arithmetic-20260808-c.js',
  'exam-bank-uploaded-images-arithmetic-20260808-d.js',
  'exam-bank-uploaded-images-arithmetic-20260808.js',
  'exam-bank-uploaded-video-arithmetic-20260808-v1.js',
  'exam-bank-uploaded-video-arithmetic-20260808-v2.js',
  'exam-bank-uploaded-video-arithmetic-20260808-v3.js',
  'exam-bank-uploaded-zip8887777-20260808-1.js',
  'exam-bank-uploaded-zip8887777-20260808-2.js',
  'exam-bank-uploaded-zip8887777-20260808-3.js',
  'exam-bank-uploaded-zip8887777-20260808-4.js',
  'exam-bank-uploaded-zip8887777-20260808-5.js',
  'exam-bank-uploaded-pdf-qqtahsili-00004-chemistry-2026.js'
];
for (const file of requiredSources) {
  if (!dataAssets.includes(file)) fail(`Canonical exam manifest is missing ${file}`);
}

// Load every data and visual asset exactly as the browser loader does.
for (const file of dataAssets) run(file);

const visuals = window.NEON_EXAM_VISUALS || {};
const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
const zipImported = window.NEON_IMPORTED_ZIP8887777_20260808 || [];
const imageImported = window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808 || [];
const arithmeticVideos = [1,2,3].reduce((sum, n) => sum + (window[`NEON_IMPORTED_ARITHMETIC_VIDEO_V${n}_20260808`] || []).length, 0);
const recentImported = imported.filter(q => /(?:ناصر 2026|QqTahsili-00004\.pdf)/i.test(String(q.source || '')));

if (Object.keys(visuals).length < 140) fail(`Visual registry unexpectedly small: ${Object.keys(visuals).length}`);
if (zipImported.length !== 215) fail(`ZIP source should expose 215 questions; got ${zipImported.length}`);
if (imageImported.length < 300) fail(`Arithmetic image source unexpectedly low: ${imageImported.length}`);
if (arithmeticVideos < 100) fail(`Arithmetic video sources unexpectedly low: ${arithmeticVideos}`);
if (recentImported.length !== 126) fail(`Recent chemistry batches should expose 126 questions; got ${recentImported.length}`);

run('exam-bank.js');
const bank = window.NEON_EXAM_BANK;
const academy = window.NEON_ACADEMY;
if (!bank || !academy) fail('Central exam bank did not assemble.');

const bankZip = bank.questions.filter(q => String(q.id || '').startsWith('zip8887777-')).length;
const bankUniqueBeforeAudit = bank.questions.length;
const academyExamBeforeAudit = academy.questionBank.filter(q => q.area === 'exams').length;
if (bankZip < 200) fail(`Central bank dropped too many ZIP questions: ${bankZip}`);
if (academyExamBeforeAudit < 1900) fail(`Academy exam bank unexpectedly small before enhanced audit: ${academyExamBeforeAudit}`);

// Minimal DOM needed by the audit's non-data health UI.
global.Element = class Element {};
global.document = {
  documentElement: { dataset: {} },
  head: { appendChild() {} },
  getElementById() { return null; },
  createElement() {
    return {
      id: '', className: '', textContent: '', innerHTML: '', dataset: {}, style: {},
      appendChild() {}, setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; }
    };
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  dispatchEvent() {}
};
global.MutationObserver = class MutationObserver { observe() {} disconnect() {} };

run('exam-option-semantics-guard.js');
run('exam-dedupe-enhanced.js');
run('exam-option-semantics-restore.js');

const audit = window.NEON_PLATFORM_AUDIT_REPORT || {};
const semanticGuard = window.NEON_EXAM_OPTION_SEMANTICS_GUARD_REPORT || {};
const activeExam = Number(audit.activeExamQuestions || 0);
if (activeExam < 1930) fail(`Active unique exam count unexpectedly low after full audit: ${activeExam}`);
if (Number(audit.invalidQuestionsRemoved || 0) !== 0) fail(`Valid content was removed as invalid: ${audit.invalidQuestionsRemoved}`);
if (Number(audit.missingVisualQuestionsRemoved || 0) !== 0) fail(`Visual questions were removed because their visuals failed to register: ${audit.missingVisualQuestionsRemoved}`);
if (!semanticGuard.restored) fail('Option semantic guard did not restore user-facing option text.');

const pythonSymbol = academy.questionBank.find(q => q.id === 'q23');
if (!pythonSymbol || !pythonSymbol.options.includes('#') || pythonSymbol.answer !== 1) {
  fail('Python symbol-only option was corrupted by dedupe normalization.');
}
const genotype = bank.questions.find(q => q.id === 'up-pdf001-q109');
if (!genotype || genotype.options.length !== 4 || !genotype.options.includes('BB×BB') || !genotype.options.includes('Bb×bb') || genotype.answer !== 3) {
  fail('Case-sensitive genetics options were corrupted by dedupe normalization.');
}

const runtimeFixSource = fs.readFileSync(path.join(academyDir, 'exam-center-runtime-fix.js'), 'utf8');
const centerPageSource = fs.readFileSync(path.join(academyDir, 'center-page.js'), 'utf8');
const authGuardSource = fs.readFileSync(path.join(academyDir, 'auth-guard.js'), 'utf8');
const shellResetSource = fs.readFileSync(path.join(academyDir, 'exam-center-shell-reset.js'), 'utf8');
if (!runtimeFixSource.includes('NEON_EXAM_CENTER_DIAGNOSTICS')) fail('Exam runtime diagnostics are missing.');
if (!centerPageSource.includes('NEON_EXAM_DATA_ASSETS')) fail('Standalone center is not using the canonical exam manifest.');
if (!authGuardSource.includes('NEON_EXAM_DATA_ASSETS')) fail('Main academy is not using the canonical exam manifest.');
if (!shellResetSource.includes('existing.remove()')) fail('Legacy exam shell reset is not active.');

for (const phrase of ['ADAPTIVE MASTERY EXAM CENTER', '٢,٦١٥']) {
  for (const file of ['index.html','exams.html','exam-center.html','center-page.js','exam-center-runtime-fix.js','portal-cards.js']) {
    const text = fs.readFileSync(path.join(academyDir, file), 'utf8');
    if (text.includes(phrase)) fail(`Legacy exam UI marker "${phrase}" remains in ${file}`);
  }
}

for (const page of ['exams.html','exam-center.html']) {
  const text = fs.readFileSync(path.join(academyDir, page), 'utf8');
  if (!text.includes(revision)) fail(`${page} does not reference current build revision ${revision}`);
  if (!text.includes('exam-assets-manifest.js')) fail(`${page} does not load the canonical asset manifest.`);
}

for (const page of fs.readdirSync(academyDir).filter(name => name.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(academyDir, page), 'utf8');
  const ids = [...text.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) fail(`${page} contains duplicate static IDs: ${[...new Set(duplicateIds)].join(', ')}`);
  for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = match[1];
    if (!ref || /^(?:https?:|data:|mailto:|tel:|#)/i.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean || clean.startsWith('../')) continue;
    if (!fs.existsSync(path.resolve(academyDir, clean))) fail(`${page} references missing local asset: ${ref}`);
  }
}

console.log(JSON.stringify({
  revision,
  dataAssets: dataAssets.length,
  registeredVisuals: Object.keys(visuals).length,
  imported2026: imported.length,
  zipImported: zipImported.length,
  arithmeticImages: imageImported.length,
  arithmeticVideos,
  recentImported: recentImported.length,
  bankUniqueBeforeEnhancedAudit: bankUniqueBeforeAudit,
  academyExamBeforeEnhancedAudit: academyExamBeforeAudit,
  activeUniqueExamQuestions: activeExam,
  exactDuplicatesRemoved: audit.exactDuplicatesRemoved,
  nearDuplicatesRemoved: audit.nearDuplicatesRemoved,
  invalidRemoved: audit.invalidQuestionsRemoved,
  missingVisualRemoved: audit.missingVisualQuestionsRemoved,
  semanticOptionsProtected: semanticGuard.protectedOptions
}, null, 2));

if (process.exitCode) process.exit(process.exitCode);
