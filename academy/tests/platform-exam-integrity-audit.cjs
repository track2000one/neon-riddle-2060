const fs = require('fs');
const vm = require('vm');
const path = require('path');

global.window = global;
const academyDir = path.resolve(__dirname, '..');

function run(file) {
  const full = path.join(academyDir, file);
  vm.runInThisContext(fs.readFileSync(full, 'utf8'), { filename: file });
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

if (!revision) fail('Build revision is missing from exam-assets-manifest.js');
if (dataAssets.length < 85) fail(`Expected at least 85 exam data assets; got ${dataAssets.length}`);
if (!runtimeAssets.includes('exam-center-shell-reset.js')) fail('Runtime manifest must reset legacy exam-center markup before rendering.');
if (!runtimeAssets.includes('exam-center-ui.js')) fail('Runtime manifest is missing exam-center-ui.js.');
if (!runtimeAssets.includes('exam-center-runtime-fix.js')) fail('Runtime manifest is missing exam-center-runtime-fix.js.');

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

for (const file of dataAssets) {
  if (file.startsWith('exam-visuals')) continue;
  run(file);
}

const imported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
const zipImported = window.NEON_IMPORTED_ZIP8887777_20260808 || [];
const imageImported = window.NEON_UPLOADED_IMAGES_ARITHMETIC_20260808 || [];
const arithmeticVideos = [1,2,3].reduce((sum, n) => sum + (window[`NEON_IMPORTED_ARITHMETIC_VIDEO_V${n}_20260808`] || []).length, 0);
const recentImported = imported.filter(q => /(?:ناصر 2026|QqTahsili-00004\.pdf)/i.test(String(q.source || '')));

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
if (academyExamBeforeAudit < 1900) fail(`Academy exam bank is unexpectedly small before enhanced audit: ${academyExamBeforeAudit}`);

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
run('exam-dedupe-enhanced.js');

const audit = window.NEON_PLATFORM_AUDIT_REPORT || {};
const activeExam = Number(audit.activeExamQuestions || 0);
if (activeExam < 1800) fail(`Active unique exam count unexpectedly low after audit: ${activeExam}`);

const runtimeFixSource = fs.readFileSync(path.join(academyDir, 'exam-center-runtime-fix.js'), 'utf8');
const centerPageSource = fs.readFileSync(path.join(academyDir, 'center-page.js'), 'utf8');
const authGuardSource = fs.readFileSync(path.join(academyDir, 'auth-guard.js'), 'utf8');
const shellResetSource = fs.readFileSync(path.join(academyDir, 'exam-center-shell-reset.js'), 'utf8');

if (!runtimeFixSource.includes("question.active !== false")) fail('Exam runtime must filter inactive questions.');
if (!runtimeFixSource.includes('NEON_EXAM_CENTER_DIAGNOSTICS')) fail('Exam runtime diagnostics are missing.');
if (!centerPageSource.includes('NEON_EXAM_DATA_ASSETS')) fail('Standalone center is not using the canonical exam manifest.');
if (!authGuardSource.includes('NEON_EXAM_DATA_ASSETS')) fail('Main academy is not using the canonical exam manifest.');
if (!shellResetSource.includes('existing.remove()')) fail('Legacy exam shell reset is not active.');

const forbidden = ['ADAPTIVE MASTERY EXAM CENTER', '٢,٦١٥'];
for (const phrase of forbidden) {
  for (const file of ['index.html','exams.html','exam-center.html','center-page.js','exam-center-runtime-fix.js','portal-cards.js']) {
    const text = fs.readFileSync(path.join(academyDir, file), 'utf8');
    if (text.includes(phrase)) fail(`Legacy exam UI marker "${phrase}" remains in ${file}`);
  }
}

for (const page of ['exams.html','exam-center.html']) {
  const text = fs.readFileSync(path.join(academyDir, page), 'utf8');
  if (!text.includes(revision)) fail(`${page} does not reference the current build revision ${revision}`);
  if (!text.includes('exam-assets-manifest.js')) fail(`${page} does not load the canonical asset manifest.`);
}

for (const page of fs.readdirSync(academyDir).filter(name => name.endsWith('.html'))) {
  const pagePath = path.join(academyDir, page);
  const text = fs.readFileSync(pagePath, 'utf8');
  const ids = [...text.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length) fail(`${page} contains duplicate static IDs: ${[...new Set(duplicateIds)].join(', ')}`);

  for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const ref = match[1];
    if (!ref || /^(?:https?:|data:|mailto:|tel:|#)/i.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean || clean.startsWith('../')) continue;
    const resolved = path.resolve(academyDir, clean);
    if (!fs.existsSync(resolved)) fail(`${page} references a missing local asset: ${ref}`);
  }
}

console.log(JSON.stringify({
  revision,
  dataAssets: dataAssets.length,
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
  invalidRemoved: audit.invalidQuestionsRemoved
}, null, 2));

if (process.exitCode) process.exit(process.exitCode);
