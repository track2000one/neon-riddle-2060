const fs = require('fs');
const vm = require('vm');
const path = require('path');

global.window = global;

function run(file) {
  const full = path.resolve(__dirname, '..', file);
  const code = fs.readFileSync(full, 'utf8');
  vm.runInThisContext(code, { filename: file });
}

run('exam-bank-tahsili-chemistry-1.js');
run('exam-bank-tahsili-chemistry-2.js');
run('exam-bank-imported-2026.js');

const beforePdf = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
const nasser = beforePdf.filter(q => String(q.source || '').includes('ناصر 2026'));
console.log('after imported-2026:', beforePdf.length);
console.log('nasser chemistry:', nasser.length);

run('exam-bank-uploaded-pdf-qqtahsili-00004-chemistry-2026.js');

const report = window.NEON_UPLOADED_PDF_QQTAHSILI_00004_REPORT || {};
const qq = window.NEON_UPLOADED_PDF_QQTAHSILI_00004_QUESTIONS || [];
const finalImported = window.NEON_IMPORTED_EXAM_QUESTIONS_2026 || [];
console.log('qq accepted:', qq.length);
console.log('qq report:', JSON.stringify({
  sourceQuestions: report.sourceQuestions,
  candidatesAfterInternalExactDedupe: report.candidatesAfterInternalExactDedupe,
  internalExactDuplicatesRemoved: report.internalExactDuplicatesRemoved,
  duplicatesAgainstExistingBankSkipped: report.duplicatesAgainstExistingBankSkipped,
  uniqueAdded: report.uniqueAdded
}));
console.log('final imported:', finalImported.length);

if (nasser.length !== 28) {
  console.error(`Expected 28 Nasser questions, got ${nasser.length}`);
  process.exitCode = 1;
}
if (qq.length !== 98) {
  console.error(`Expected 98 QqTahsili questions, got ${qq.length}`);
  process.exitCode = 1;
}

// Reproduce the central bank assembly without a browser UI.
window.NEON_ACADEMY = {
  questionBank: [],
  lessons: [],
  examTracks: [],
  knowledgeSubjects: [],
  programmingSubjects: [],
  gameTracks: [],
  counts: {}
};
run('exam-bank.js');

const assembledRecent = window.NEON_ACADEMY.questionBank.filter(q => /(?:ناصر 2026|QqTahsili-00004\.pdf)/.test(String(q.source || '')));
console.log('recent after exam-bank.js:', assembledRecent.length);
console.log('academy total after exam-bank.js:', window.NEON_ACADEMY.questionBank.length);

if (assembledRecent.length !== 126) {
  console.error(`Expected 126 recent chemistry questions after exam-bank.js, got ${assembledRecent.length}`);
  process.exitCode = 1;
}

// Reproduce the enhanced dedupe stage with a minimal DOM stub.
global.Element = class Element {};
global.document = {
  documentElement: {},
  head: { appendChild() {} },
  getElementById() { return null; },
  createElement() {
    return {
      id: '', className: '', textContent: '', innerHTML: '', dataset: {}, style: {},
      appendChild() {}, setAttribute() {}, querySelector() { return null; }, querySelectorAll() { return []; }
    };
  },
  querySelector() { return null; },
  querySelectorAll() { return []; }
};
global.MutationObserver = class MutationObserver { constructor() {} observe() {} disconnect() {} };

run('exam-dedupe-enhanced.js');
const dedupedRecent = window.NEON_ACADEMY.questionBank.filter(q => /(?:ناصر 2026|QqTahsili-00004\.pdf)/.test(String(q.source || '')));
console.log('recent after enhanced dedupe:', dedupedRecent.length);
console.log('academy total after enhanced dedupe:', window.NEON_ACADEMY.questionBank.length);
console.log('dedupe report:', JSON.stringify({
  rawQuestions: window.NEON_PLATFORM_AUDIT_REPORT?.rawQuestions,
  activeQuestions: window.NEON_PLATFORM_AUDIT_REPORT?.activeQuestions,
  activeExamQuestions: window.NEON_PLATFORM_AUDIT_REPORT?.activeExamQuestions,
  exactDuplicatesRemoved: window.NEON_PLATFORM_AUDIT_REPORT?.exactDuplicatesRemoved,
  nearDuplicatesRemoved: window.NEON_PLATFORM_AUDIT_REPORT?.nearDuplicatesRemoved,
  invalidQuestionsRemoved: window.NEON_PLATFORM_AUDIT_REPORT?.invalidQuestionsRemoved
}));

if (!dedupedRecent.length) {
  console.error('Enhanced dedupe removed every recent chemistry question.');
  process.exitCode = 1;
}

// This test remains in CI so future question imports cannot silently disappear.
